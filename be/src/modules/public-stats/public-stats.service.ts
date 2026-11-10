import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicStatsDto, FeaturedReviewDto } from './public-stats.dto';

const STATS_CACHE_KEY = 'public:stats:summary';
const REVIEWS_CACHE_KEY = 'public:reviews:featured';
const CACHE_TTL_SECONDS = 300; // 5 minutes

function shortenName(name: string): string {
  if (!name) return 'Khách hàng';
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0];
  const last = parts[parts.length - 1];
  const firstInitials = parts
    .slice(0, parts.length - 1)
    .map((p) => p[0]?.toUpperCase() + '.')
    .join(' ');
  return `${firstInitials} ${last}`;
}

@Injectable()
export class PublicStatsService {
  private readonly logger = new Logger(PublicStatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getPublicStats(): Promise<PublicStatsDto> {
    try {
      const cached = await this.redis.get(STATS_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as PublicStatsDto;
      }
    } catch (err) {
      this.logger.warn(
        `Redis get failed for ${STATS_CACHE_KEY}: ${(err as Error).message}`,
      );
    }

    const [
      activeListings,
      approvedApplications,
      providerProfiles,
      completedBookings,
      publishedReviews,
      ratingAgg,
    ] = await Promise.all([
      this.prisma.listing.count({ where: { status: 'ACTIVE' } }),
      this.prisma.providerApplication.count({ where: { status: 'APPROVED' } }),
      this.prisma.providerProfile.count({ where: { isLive: true } }),
      this.prisma.booking.count({ where: { status: 'COMPLETED' } }),
      this.prisma.review.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.review.aggregate({
        _avg: { rating: true },
        where: { status: 'PUBLISHED' },
      }),
    ]);

    const approvedProviders = Math.max(approvedApplications, providerProfiles);
    const avgScore = ratingAgg._avg.rating
      ? Number(ratingAgg._avg.rating.toFixed(1))
      : 5.0;

    const stats: PublicStatsDto = {
      activeListings,
      approvedProviders,
      completedBookings,
      averageRating: avgScore,
      publishedReviews,
    };

    try {
      await this.redis.set(
        STATS_CACHE_KEY,
        JSON.stringify(stats),
        'EX',
        CACHE_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(
        `Redis set failed for ${STATS_CACHE_KEY}: ${(err as Error).message}`,
      );
    }

    return stats;
  }

  async getFeaturedReviews(): Promise<FeaturedReviewDto[]> {
    try {
      const cached = await this.redis.get(REVIEWS_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as FeaturedReviewDto[];
      }
    } catch (err) {
      this.logger.warn(
        `Redis get failed for ${REVIEWS_CACHE_KEY}: ${(err as Error).message}`,
      );
    }

    const reviews = await this.prisma.review.findMany({
      where: {
        status: 'PUBLISHED',
        rating: { gte: 4 },
        comment: { not: null },
      },
      take: 8,
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        author: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
        listing: {
          select: {
            title: true,
          },
        },
      },
    });

    const result: FeaturedReviewDto[] = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      authorName: shortenName(r.author?.name || ''),
      authorAvatarUrl: r.author?.avatarUrl || null,
      listingTitle: r.listing?.title || null,
    }));

    try {
      await this.redis.set(
        REVIEWS_CACHE_KEY,
        JSON.stringify(result),
        'EX',
        CACHE_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(
        `Redis set failed for ${REVIEWS_CACHE_KEY}: ${(err as Error).message}`,
      );
    }

    return result;
  }
}
