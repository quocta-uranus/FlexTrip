import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  ListingStatus,
  ListingFlagStatus,
  ReviewStatus,
} from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { uploadImage, deleteFromSupabase } from '../../common/upload.util';
import {
  CreateListingDto,
  UpdateListingDto,
  FlagListingDto,
  AiSuggestDto,
  AiDescriptionDto,
  AiOptimizeDto,
  AiQualityDto,
  ListingCategoryDto,
  PublicListingsQueryDto,
  PublicListingSortDto,
} from './listings.dto';

const ADMIN_LOCKED: ListingStatus[] = [
  ListingStatus.SUSPENDED,
  ListingStatus.REMOVED,
];
const HIGH_VALUE_THRESHOLD = 5_000_000;

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);
  private readonly gemini: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const genAI = new GoogleGenerativeAI(
      this.config.get<string>('GEMINI_API_KEY', ''),
    );
    this.gemini = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
  }

  private async ask(prompt: string): Promise<string> {
    const result = await this.gemini.generateContent(prompt);
    return result.response.text();
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(providerId: string, dto: CreateListingDto) {
    const isHighValue =
      dto.marketValue != null && dto.marketValue >= HIGH_VALUE_THRESHOLD;
    const { penaltyRules, marketValue, ...rest } = dto;
    return this.prisma.listing.create({
      data: {
        ...rest,
        currency: rest.currency ?? 'VND',
        amenities: rest.amenities ?? [],
        price: new Prisma.Decimal(rest.price),
        marketValue:
          marketValue != null ? new Prisma.Decimal(marketValue) : null,
        penaltyRules: (penaltyRules ??
          null) as unknown as Prisma.InputJsonValue,
        isHighValue,
        status: ListingStatus.DRAFT,
        providerId,
      },
    });
  }

  async findAll(params: PublicListingsQueryDto = {}) {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const category = this.publicCategoryFilter(params.category);
    const where: Prisma.ListingWhereInput = {
      status: ListingStatus.ACTIVE,
      ...(category ? { category } : {}),
      ...(params?.keyword
        ? {
            OR: [
              { title: { contains: params.keyword, mode: 'insensitive' } },
              {
                description: { contains: params.keyword, mode: 'insensitive' },
              },
            ],
          }
        : {}),
      ...(params?.location
        ? { location: { contains: params.location, mode: 'insensitive' } }
        : {}),
      ...(params.minPrice !== undefined || params.maxPrice !== undefined
        ? {
            price: {
              ...(params.minPrice !== undefined
                ? { gte: new Prisma.Decimal(params.minPrice) }
                : {}),
              ...(params.maxPrice !== undefined
                ? { lte: new Prisma.Decimal(params.maxPrice) }
                : {}),
            },
          }
        : {}),
    };

    if (params.dateFrom || params.dateTo) {
      if (!params.dateFrom || !params.dateTo) {
        throw new BadRequestException(
          'Bắt buộc phải cung cấp cả dateFrom và dateTo khi tìm kiếm theo ngày',
        );
      }
      const from = new Date(params.dateFrom);
      const to = new Date(params.dateTo);
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw new BadRequestException('Định dạng ngày không hợp lệ (YYYY-MM-DD)');
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const fromParts = params.dateFrom.split('-').map(Number);
      if (fromParts.length === 3) {
        const fromMidnight = new Date(fromParts[0], fromParts[1] - 1, fromParts[2]);
        if (fromMidnight < today) {
          throw new BadRequestException('Không thể tìm kiếm ngày trong quá khứ');
        }
      }
      if (from > to) {
        throw new BadRequestException('dateTo phải lớn hơn hoặc bằng dateFrom');
      }

      const rentalDays =
        Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;

      const unavailable = await this.prisma.$queryRaw<{ id: string }[]>`
        WITH days AS (
          SELECT generate_series(${params.dateFrom}::date, ${params.dateTo}::date, '1 day'::interval)::date AS d
        ),
        active_occupants AS (
          SELECT "listingId", "startDate", "endDate", quantity
          FROM "Booking"
          WHERE (
            status IN ('PENDING_APPROVAL', 'CONFIRMED', 'IN_PROGRESS')
            OR (status = 'PENDING_PAYMENT' AND "holdExpiresAt" > NOW())
          )
            AND "startDate" <= ${params.dateTo}::date AND "endDate" >= ${params.dateFrom}::date
          UNION ALL
          SELECT "listingId", "startDate", "endDate", quantity
          FROM "CartItem"
          WHERE "holdExpiresAt" > NOW()
            AND "startDate" <= ${params.dateTo}::date AND "endDate" >= ${params.dateFrom}::date
        ),
        fully_occupied AS (
          SELECT o."listingId" AS id
          FROM active_occupants o
          JOIN days d ON d.d >= o."startDate" AND d.d <= o."endDate"
          JOIN "Listing" l ON l.id = o."listingId"
          GROUP BY o."listingId", d.d, l.quantity
          HAVING SUM(o.quantity) >= l.quantity
        ),
        blocked_listings AS (
          SELECT DISTINCT "listingId" AS id
          FROM "ListingAvailability"
          WHERE "isBlocked" = true
            AND date >= ${params.dateFrom}::date AND date <= ${params.dateTo}::date
        )
        SELECT id FROM blocked_listings
        UNION
        SELECT id FROM fully_occupied;
      `;

      const unavailableIds = unavailable.map((r) => r.id);

      const availabilityConditions: Prisma.ListingWhereInput[] = [
        ...(unavailableIds.length > 0 ? [{ id: { notIn: unavailableIds } }] : []),
        { minRentalDays: { lte: rentalDays } },
        {
          OR: [
            { maxRentalDays: null },
            { maxRentalDays: { gte: rentalDays } },
          ],
        },
      ];

      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        ...availabilityConditions,
      ];
    }

    if (params.sort === PublicListingSortDto.RATING) {
      return this.findAllByProviderRating(where, page, limit);
    }

    const orderBy = this.publicListingOrder(params.sort);
    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: this.publicListingInclude(),
      }),
      this.prisma.listing.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private publicCategoryFilter(category?: ListingCategoryDto) {
    if (
      category === ListingCategoryDto.CAMPING ||
      category === ListingCategoryDto.TREKKING
    ) {
      return { in: [category, 'CAMPING_TREKKING'] };
    }
    return category;
  }

  private publicListingOrder(
    sort: PublicListingSortDto = PublicListingSortDto.NEWEST,
  ): Prisma.ListingOrderByWithRelationInput[] {
    if (sort === PublicListingSortDto.PRICE_ASC) {
      return [{ price: 'asc' }, { id: 'asc' }];
    }
    if (sort === PublicListingSortDto.PRICE_DESC) {
      return [{ price: 'desc' }, { id: 'asc' }];
    }
    return [{ createdAt: 'desc' }, { id: 'desc' }];
  }

  private publicListingInclude(): Prisma.ListingInclude {
    return {
      provider: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          providerProfile: {
            select: {
              shopName: true,
              ratingAvg: true,
              reviewsCount: true,
              responseHours: true,
            },
          },
        },
      },
      _count: { select: { reviews: true, bookings: true } },
    };
  }

  private async findAllByProviderRating(
    where: Prisma.ListingWhereInput,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const withProfileWhere: Prisma.ListingWhereInput = {
      AND: [where, { provider: { providerProfile: { isNot: null } } }],
    };
    const withoutProfileWhere: Prisma.ListingWhereInput = {
      AND: [where, { provider: { providerProfile: { is: null } } }],
    };
    const [total, withProfileCount] = await Promise.all([
      this.prisma.listing.count({ where }),
      this.prisma.listing.count({ where: withProfileWhere }),
    ]);

    const ratedSkip = Math.min(skip, withProfileCount);
    const ratedTake = Math.min(limit, Math.max(0, withProfileCount - skip));
    const items = ratedTake
      ? await this.prisma.listing.findMany({
          where: withProfileWhere,
          skip: ratedSkip,
          take: ratedTake,
          orderBy: [
            { provider: { providerProfile: { ratingAvg: 'desc' } } },
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
          include: this.publicListingInclude(),
        })
      : [];

    const remaining = limit - items.length;
    if (remaining > 0) {
      const unratedSkip = Math.max(0, skip - withProfileCount);
      items.push(
        ...(await this.prisma.listing.findMany({
          where: withoutProfileWhere,
          skip: unratedSkip,
          take: remaining,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: this.publicListingInclude(),
        })),
      );
    }

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, ownerId?: string) {
    const listing = await this.prisma.listing.findFirst({
      where: {
        id,
        OR: [
          { status: ListingStatus.ACTIVE },
          ...(ownerId ? [{ providerId: ownerId }] : []),
        ],
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            providerProfile: {
              select: {
                shopName: true,
                ratingAvg: true,
                reviewsCount: true,
                responseHours: true,
              },
            },
          },
        },
        reviews: {
          where: { status: ReviewStatus.PUBLISHED },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            rating: true,
            comment: true,
            response: true,
            respondedAt: true,
            createdAt: true,
            author: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        _count: {
          select: {
            reviews: { where: { status: ReviewStatus.PUBLISHED } },
            bookings: true,
          },
        },
      },
    });
    if (!listing) throw new NotFoundException('Không tìm thấy tin đăng.');
    return listing;
  }

  async findMyListings(
    providerId: string,
    params?: { page?: number; limit?: number },
  ) {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    return this.prisma.listing.findMany({
      where: { providerId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, providerId: string, dto: UpdateListingDto) {
    await this.assertOwner(id, providerId);
    const { penaltyRules, marketValue, price, ...rest } = dto;
    const data: Prisma.ListingUpdateInput = { ...rest };
    if (price !== undefined) data.price = new Prisma.Decimal(price);
    if (marketValue !== undefined) {
      data.marketValue =
        marketValue != null ? new Prisma.Decimal(marketValue) : null;
      data.isHighValue =
        marketValue != null && marketValue >= HIGH_VALUE_THRESHOLD;
    }
    if (penaltyRules !== undefined) {
      data.penaltyRules = (penaltyRules ??
        null) as unknown as Prisma.InputJsonValue;
    }
    return this.prisma.listing.update({ where: { id }, data });
  }

  async remove(id: string, providerId: string) {
    await this.assertOwner(id, providerId);
    await this.prisma.listing.delete({ where: { id } });
    return { ok: true };
  }

  async pause(id: string, providerId: string) {
    const listing = await this.assertOwner(id, providerId);
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException('Chỉ có thể tạm ẩn tin đang hoạt động.');
    }
    return this.prisma.listing.update({
      where: { id },
      data: { status: ListingStatus.INACTIVE },
    });
  }

  async resume(id: string, providerId: string) {
    const listing = await this.assertOwner(id, providerId);
    if (listing.status !== ListingStatus.INACTIVE) {
      throw new BadRequestException('Chỉ có thể khôi phục tin đang tạm ẩn.');
    }
    return this.prisma.listing.update({
      where: { id },
      data: { status: ListingStatus.ACTIVE },
    });
  }

  async publish(id: string, providerId: string) {
    await this.assertOwner(id, providerId);
    return this.prisma.listing.update({
      where: { id },
      data: { status: ListingStatus.ACTIVE },
    });
  }

  // ─── Image Upload ─────────────────────────────────────────────────────────

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    const ext = file.originalname.split('.').pop() || 'jpg';
    const filename = `listing-${Date.now()}.${ext}`;
    try {
      const url = await uploadImage(file.buffer, filename, 'listings');
      return { url };
    } catch (err: any) {
      this.logger.error('Image upload failed:', err?.message);
      throw new InternalServerErrorException(
        err?.message?.includes('bucket') || err?.message?.includes('not found')
          ? 'Supabase bucket "listings" chưa tồn tại. Vào Supabase Dashboard → Storage → tạo bucket "listings" (Public).'
          : `Upload thất bại: ${err?.message}`,
      );
    }
  }

  async deleteImage(url: string): Promise<{ ok: boolean }> {
    if (url.includes('supabase.co')) {
      await deleteFromSupabase(url);
    }
    return { ok: true };
  }

  // ─── Bulk Upload ──────────────────────────────────────────────────────────

  async bulkCreate(providerId: string, rows: CreateListingDto[]) {
    const created = await this.prisma.$transaction(
      rows.map((dto) => {
        const { penaltyRules, marketValue, price, ...rest } = dto;
        const isHighValue =
          marketValue != null && marketValue >= HIGH_VALUE_THRESHOLD;
        return this.prisma.listing.create({
          data: {
            ...rest,
            currency: rest.currency ?? 'VND',
            amenities: rest.amenities ?? [],
            price: new Prisma.Decimal(price),
            marketValue:
              marketValue != null ? new Prisma.Decimal(marketValue) : null,
            penaltyRules: (penaltyRules ??
              null) as unknown as Prisma.InputJsonValue,
            isHighValue,
            status: ListingStatus.DRAFT,
            providerId,
          },
        });
      }),
    );
    return { created: created.length, ids: created.map((l) => l.id) };
  }

  // ─── AI Features ──────────────────────────────────────────────────────────

  async aiSuggestCategory(dto: AiSuggestDto) {
    const prompt = `Bạn là hệ thống phân tích sản phẩm cho nền tảng cho thuê đồ du lịch FlexTrip.

Sản phẩm: "${dto.title}"
${dto.description ? `Mô tả: "${dto.description}"` : ''}

Hãy gợi ý:
1. Danh mục phù hợp nhất (chỉ chọn 1 trong: CAMERA_GEAR, CAMPING, TREKKING, BEACH, TRAVEL_ESSENTIALS, FAMILY)
2. 3-5 thẻ tag ngắn gọn (tiếng Việt)
3. Một câu giải thích ngắn tại sao

Trả lời dưới dạng JSON thuần (không markdown): {"category": "...", "tags": ["...", "..."], "reason": "..."}`;

    const text = await this.ask(prompt);
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch?.[0] ?? '{}');
    } catch {
      return { category: 'CAMPING', tags: [], reason: text };
    }
  }

  async aiGenerateDescription(dto: AiDescriptionDto) {
    const amenityList = dto.amenities?.length
      ? dto.amenities.join(', ')
      : null;

    const CATEGORY_LABELS: Record<string, string> = {
      CAMERA_GEAR: 'thiết bị quay/chụp',
      CAMPING: 'dụng cụ camping',
      TREKKING: 'đồ trekking',
      BEACH: 'đồ du lịch biển',
      TRAVEL_ESSENTIALS: 'tiện ích du lịch',
      FAMILY: 'đồ gia đình du lịch',
    };

    const prompt = `Bạn là copywriter chuyên nghiệp cho nền tảng cho thuê đồ du lịch FlexTrip (Việt Nam).
Nhiệm vụ: viết mô tả sản phẩm cho thuê thật hấp dẫn để người đọc muốn thuê ngay.

Thông tin sản phẩm:
- Tên: ${dto.title}
- Loại: ${CATEGORY_LABELS[dto.category] ?? dto.category}
- Địa điểm nhận/trả: ${dto.location}
${amenityList ? `- Đi kèm: ${amenityList}` : ''}
${dto.price ? `- Giá thuê: chỉ ${dto.price.toLocaleString('vi-VN')}đ/ngày` : ''}

Yêu cầu bắt buộc:
1. Viết bằng tiếng Việt tự nhiên, gần gũi nhưng chuyên nghiệp
2. Độ dài 3–4 câu (80–130 từ)
3. Câu đầu: nêu bật điểm nổi bật / tình trạng sản phẩm để tạo tin tưởng
4. Câu giữa: lợi ích cụ thể cho người thuê (tiết kiệm, tiện lợi, trải nghiệm tốt hơn)
5. Nếu có đi kèm phụ kiện: nhắc đến để tăng giá trị
6. Câu cuối: kêu gọi hành động nhẹ nhàng (đặt lịch, liên hệ, v.v.)
7. KHÔNG bịa thông tin không có trong input
8. KHÔNG dùng từ hoa toàn bộ, KHÔNG spam dấu chấm than

Trả về CHỈ đoạn mô tả hoàn chỉnh, không thêm tiêu đề hay giải thích.`;

    const description = (await this.ask(prompt)).trim();
    return { description };
  }

  async aiOptimizeDescription(dto: AiOptimizeDto) {
    const prompt = `Bạn là copywriter chuyên tối ưu mô tả sản phẩm cho nền tảng cho thuê đồ du lịch FlexTrip.

Tên sản phẩm: ${dto.title}
Danh mục: ${dto.category}
Mô tả hiện tại: "${dto.description}"

Nhiệm vụ:
1. Giữ nguyên các thông tin quan trọng
2. Viết lại hấp dẫn hơn, ngắn gọn hơn (80-150 từ)
3. Thêm từ khoá tự nhiên để tăng khả năng tìm kiếm
4. Tạo cảm giác tin tưởng và thu hút click

Trả về JSON thuần (không markdown): {"optimized": "...", "improvements": ["...", "..."]}`;

    const text = await this.ask(prompt);
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch?.[0] ?? '{}');
    } catch {
      return { optimized: text, improvements: [] };
    }
  }

  async aiQualityScore(dto: AiQualityDto) {
    const prompt = `Bạn là hệ thống chấm điểm chất lượng tin đăng cho thuê trên FlexTrip.

Tin đăng:
- Tiêu đề: ${dto.title}
- Danh mục: ${dto.category}
- Mô tả (${dto.description.length} ký tự): "${dto.description.slice(0, 300)}${dto.description.length > 300 ? '...' : ''}"
- Số ảnh: ${dto.imageUrls.length}
- Tiện ích: ${dto.amenities?.length ?? 0} items
${dto.price ? `- Giá: ${dto.price.toLocaleString('vi-VN')} VND/ngày` : ''}

Chấm điểm 0-100 theo tiêu chí:
- Tiêu đề (0-20), Mô tả (0-30), Hình ảnh (0-25), Tiện ích (0-15), Giá cả (0-10)

Trả về JSON thuần (không markdown):
{"score": <0-100>, "breakdown": {"title": <0-20>, "description": <0-30>, "images": <0-25>, "amenities": <0-15>, "price": <0-10>}, "suggestions": ["...", "...", "..."], "grade": "<A/B/C/D>"}`;

    const text = await this.ask(prompt);
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch?.[0] ?? '{}');
    } catch {
      return { score: 0, breakdown: {}, suggestions: [], grade: 'D' };
    }
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  async flag(listingId: string, reporterId: string, dto: FlagListingDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { providerId: true, status: true },
    });
    if (!listing || listing.status === ListingStatus.REMOVED)
      throw new NotFoundException({
        code: 'LISTING_NOT_FOUND',
        message: 'Không tìm thấy tin đăng.',
      });
    if (listing.providerId === reporterId)
      throw new ForbiddenException({
        code: 'CANNOT_FLAG_OWN_LISTING',
        message: 'Bạn không thể báo cáo tin của chính mình.',
      });
    const existing = await this.prisma.listingFlag.findFirst({
      where: { listingId, reporterId, status: ListingFlagStatus.OPEN },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException({
        code: 'ALREADY_FLAGGED',
        message: 'Bạn đã báo cáo tin này, đang chờ xử lý.',
      });
    return this.prisma.listingFlag.create({
      data: { listingId, reporterId, reason: dto.reason },
      select: { id: true, status: true, createdAt: true },
    });
  }

  private async assertOwner(id: string, providerId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Không tìm thấy tin đăng.');
    if (listing.providerId !== providerId)
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa tin này.');
    if (ADMIN_LOCKED.includes(listing.status))
      throw new ForbiddenException({
        code: 'LISTING_LOCKED_BY_ADMIN',
        message: 'Tin đăng đang bị quản trị viên khoá.',
      });
    return listing;
  }
}
