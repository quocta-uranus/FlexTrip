import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
  ConflictException, InternalServerErrorException, Logger,
} from '@nestjs/common';
import { Prisma, ListingStatus, ListingFlagStatus, ReviewStatus } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { uploadImage, deleteFromSupabase } from '../../common/upload.util';
import {
  CreateListingDto, UpdateListingDto, FlagListingDto,
  AiSuggestDto, AiDescriptionDto, AiOptimizeDto, AiQualityDto,
} from './listings.dto';

const ADMIN_LOCKED: ListingStatus[] = [ListingStatus.SUSPENDED, ListingStatus.REMOVED];

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
    this.gemini = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  private async ask(prompt: string): Promise<string> {
    const result = await this.gemini.generateContent(prompt);
    return result.response.text();
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(providerId: string, dto: CreateListingDto) {
    return this.prisma.listing.create({
      data: {
        ...dto,
        currency: dto.currency ?? 'VND',
        amenities: dto.amenities ?? [],
        price: new Prisma.Decimal(dto.price),
        status: ListingStatus.DRAFT,
        providerId,
      },
    });
  }

  async findAll(params?: { page?: number; limit?: number; category?: string; keyword?: string; location?: string }) {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const where: Prisma.ListingWhereInput = {
      status: ListingStatus.ACTIVE,
      ...(params?.category ? { category: params.category } : {}),
      ...(params?.keyword ? {
        OR: [
          { title: { contains: params.keyword, mode: 'insensitive' } },
          { description: { contains: params.keyword, mode: 'insensitive' } },
        ],
      } : {}),
      ...(params?.location ? { location: { contains: params.location, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              providerProfile: {
                select: { shopName: true, ratingAvg: true, reviewsCount: true, responseHours: true },
              },
            },
          },
          _count: { select: { reviews: true, bookings: true } },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            providerProfile: {
              select: { shopName: true, ratingAvg: true, reviewsCount: true, responseHours: true },
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
    if (!listing || listing.status === ListingStatus.REMOVED)
      throw new NotFoundException('Không tìm thấy tin đăng.');
    return listing;
  }

  async findMyListings(providerId: string, params?: { page?: number; limit?: number }) {
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
    const data: Prisma.ListingUpdateInput = { ...dto };
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
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
    return this.prisma.listing.update({ where: { id }, data: { status: ListingStatus.INACTIVE } });
  }

  async resume(id: string, providerId: string) {
    const listing = await this.assertOwner(id, providerId);
    if (listing.status !== ListingStatus.INACTIVE) {
      throw new BadRequestException('Chỉ có thể khôi phục tin đang tạm ẩn.');
    }
    return this.prisma.listing.update({ where: { id }, data: { status: ListingStatus.ACTIVE } });
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
      rows.map((dto) =>
        this.prisma.listing.create({
          data: {
            ...dto,
            currency: dto.currency ?? 'VND',
            amenities: dto.amenities ?? [],
            price: new Prisma.Decimal(dto.price),
            status: ListingStatus.DRAFT,
            providerId,
          },
        }),
      ),
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
    const amenityList = dto.amenities?.length ? dto.amenities.join(', ') : 'không có thông tin';
    const prompt = `Bạn là copywriter cho nền tảng cho thuê đồ du lịch FlexTrip.

Viết mô tả sản phẩm cho thuê với thông tin sau:
- Tên: ${dto.title}
- Danh mục: ${dto.category}
- Địa điểm: ${dto.location}
- Tiện ích kèm theo: ${amenityList}
${dto.price ? `- Giá: ${dto.price.toLocaleString('vi-VN')} VND/ngày` : ''}

Yêu cầu:
- Viết bằng tiếng Việt, tự nhiên, hấp dẫn
- 3-4 câu, khoảng 80-120 từ
- Nêu bật giá trị cho người thuê
- Kết thúc bằng call-to-action nhẹ

Trả về chỉ đoạn mô tả, không thêm gì khác.`;

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
      throw new NotFoundException({ code: 'LISTING_NOT_FOUND', message: 'Không tìm thấy tin đăng.' });
    if (listing.providerId === reporterId)
      throw new ForbiddenException({ code: 'CANNOT_FLAG_OWN_LISTING', message: 'Bạn không thể báo cáo tin của chính mình.' });
    const existing = await this.prisma.listingFlag.findFirst({
      where: { listingId, reporterId, status: ListingFlagStatus.OPEN },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException({ code: 'ALREADY_FLAGGED', message: 'Bạn đã báo cáo tin này, đang chờ xử lý.' });
    return this.prisma.listingFlag.create({
      data: { listingId, reporterId, reason: dto.reason },
      select: { id: true, status: true, createdAt: true },
    });
  }

  private async assertOwner(id: string, providerId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Không tìm thấy tin đăng.');
    if (listing.providerId !== providerId) throw new ForbiddenException('Bạn không có quyền chỉnh sửa tin này.');
    if (ADMIN_LOCKED.includes(listing.status))
      throw new ForbiddenException({ code: 'LISTING_LOCKED_BY_ADMIN', message: 'Tin đăng đang bị quản trị viên khoá.' });
    return listing;
  }
}
