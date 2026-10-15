import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListingStatus, Prisma, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, skipTake } from '../../common/dto/pagination.dto';
import { WishlistQueryDto } from './wishlist.dto';

const PUBLIC_LISTING_SELECT = {
  id: true,
  title: true,
  description: true,
  price: true,
  currency: true,
  location: true,
  latitude: true,
  longitude: true,
  imageUrls: true,
  status: true,
  category: true,
  amenities: true,
  providerId: true,
  createdAt: true,
  updatedAt: true,
  quantity: true,
  minRentalDays: true,
  maxRentalDays: true,
  depositRate: true,
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
  _count: {
    select: {
      reviews: { where: { status: ReviewStatus.PUBLISHED } },
      bookings: true,
    },
  },
} satisfies Prisma.ListingSelect;

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: WishlistQueryDto) {
    const { skip, take } = skipTake(query);
    const where: Prisma.WishlistWhereInput = {
      userId,
      listing: { status: ListingStatus.ACTIVE },
    };
    const [rows, total] = await Promise.all([
      this.prisma.wishlist.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          createdAt: true,
          listing: { select: PUBLIC_LISTING_SELECT },
        },
      }),
      this.prisma.wishlist.count({ where }),
    ]);
    return paginate(
      rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        listing: row.listing,
      })),
      total,
      query,
    );
  }

  async resolveGuest(listingIds: string[]) {
    const uniqueIds = [...new Set(listingIds)];
    const listings = await this.prisma.listing.findMany({
      where: { id: { in: uniqueIds }, status: ListingStatus.ACTIVE },
      select: PUBLIC_LISTING_SELECT,
    });
    const byId = new Map(listings.map((listing) => [listing.id, listing]));
    return {
      items: uniqueIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])),
    };
  }

  async ids(userId: string) {
    const rows = await this.prisma.wishlist.findMany({
      where: { userId, listing: { status: ListingStatus.ACTIVE } },
      select: { listingId: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return { listingIds: rows.map((row) => row.listingId) };
  }

  async add(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, providerId: true, status: true },
    });
    if (!listing || listing.status !== ListingStatus.ACTIVE) {
      throw new NotFoundException('Không tìm thấy thiết bị công khai.');
    }
    if (listing.providerId === userId) {
      throw new BadRequestException(
        'Không thể thêm thiết bị của chính bạn vào yêu thích.',
      );
    }

    try {
      const item = await this.prisma.wishlist.create({
        data: { userId, listingId },
      });
      return { status: 'added' as const, item };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const item = await this.prisma.wishlist.findUnique({
          where: { userId_listingId: { userId, listingId } },
        });
        return { status: 'alreadyExists' as const, item };
      }
      throw error;
    }
  }

  async remove(userId: string, listingId: string) {
    const result = await this.prisma.wishlist.deleteMany({
      where: { userId, listingId },
    });
    return { removed: result.count > 0 };
  }

  async sync(userId: string, listingIds: string[]) {
    const uniqueIds = [...new Set(listingIds)];
    const [listings, existing] = await Promise.all([
      this.prisma.listing.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true, providerId: true, status: true },
      }),
      this.prisma.wishlist.findMany({
        where: { userId, listingId: { in: uniqueIds } },
        select: { listingId: true },
      }),
    ]);

    const byId = new Map(listings.map((listing) => [listing.id, listing]));
    const existingIds = new Set(existing.map((item) => item.listingId));
    const alreadyExists = uniqueIds.filter((id) => existingIds.has(id));
    const skipped = uniqueIds.filter((id) => {
      const listing = byId.get(id);
      return (
        !listing ||
        listing.status !== ListingStatus.ACTIVE ||
        listing.providerId === userId
      );
    });
    const candidates = uniqueIds.filter(
      (id) => !existingIds.has(id) && !skipped.includes(id),
    );

    try {
      if (candidates.length) {
        await this.prisma.wishlist.createMany({
          data: candidates.map((listingId) => ({ userId, listingId })),
          skipDuplicates: true,
        });
      }
      return {
        added: candidates,
        alreadyExists,
        skipped,
        retryableFailed: [] as string[],
      };
    } catch {
      return {
        added: [] as string[],
        alreadyExists,
        skipped,
        retryableFailed: candidates,
      };
    }
  }
}
