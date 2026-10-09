import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  NotificationType,
  Prisma,
  ReviewModerationSource,
  ReviewSentiment,
  ReviewStatus,
  Role,
} from '@prisma/client';
import { RequestContext } from '../../common/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReputationService } from '../reputation/reputation.service';
import {
  CreateReviewDto,
  RespondToReviewDto,
  ReviewSentimentQueryDto,
} from './dto/review.dto';
import { moderateReviewWithRules } from './review-moderation.rules';
import { ReviewModerationService } from './review-moderation.service';

const PUBLIC_REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  status: true,
  listingId: true,
  bookingId: true,
  response: true,
  respondedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.ReviewSelect;

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly reputation: ReputationService,
    private readonly moderationService: ReviewModerationService,
  ) {}

  async create(authorId: string, dto: CreateReviewDto) {
    const moderation = moderateReviewWithRules(dto.comment);
    const status = moderation.flagged
      ? ReviewStatus.FLAGGED
      : ReviewStatus.PENDING;

    try {
      const review = await this.prisma.$transaction(
        async (tx) => {
          const booking = await tx.booking.findUnique({
            where: { id: dto.bookingId },
            select: {
              id: true,
              status: true,
              travelerId: true,
              listingId: true,
              review: { select: { id: true } },
              listing: { select: { providerId: true } },
            },
          });

          if (!booking) throw new NotFoundException('Booking không tồn tại');
          if (booking.travelerId !== authorId)
            throw new ForbiddenException(
              'Bạn chỉ có thể đánh giá booking của mình',
            );
          if (booking.status !== BookingStatus.COMPLETED)
            throw new ConflictException({
              code: 'BOOKING_NOT_COMPLETED',
              message: 'Chỉ booking đã hoàn thành mới được đánh giá.',
            });
          if (booking.review)
            throw new ConflictException({
              code: 'REVIEW_ALREADY_EXISTS',
              message: 'Booking này đã được đánh giá.',
            });

          const review = await tx.review.create({
            data: {
              bookingId: booking.id,
              listingId: booking.listingId,
              authorId,
              targetId: booking.listing.providerId,
              rating: dto.rating,
              comment: dto.comment,
              status,
              moderationSource: moderation.flagged
                ? ReviewModerationSource.RULE
                : null,
              toxicityScore: moderation.flagged
                ? moderation.toxicityScore
                : undefined,
              spamScore: moderation.flagged ? moderation.spamScore : undefined,
              analysisReasons: moderation.flagged
                ? moderation.reasons
                : undefined,
              moderationNote: moderation.flagged
                ? moderation.reasons.join(',')
                : null,
            },
            select: PUBLIC_REVIEW_SELECT,
          });

          return review;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      const queued = await this.moderationService.enqueue(review.id);
      if (!queued)
        this.logger.warn(
          `Review ${review.id} remains ${status}: enqueue failed`,
        );
      return review;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        const existing = await this.prisma.review.findUnique({
          where: { bookingId: dto.bookingId },
          select: { id: true },
        });
        if (!existing) throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2034'].includes(error.code)
      ) {
        throw new ConflictException({
          code: 'REVIEW_ALREADY_EXISTS',
          message: 'Booking này đã được đánh giá.',
        });
      }
      throw error;
    }
  }

  async findMine(authorId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
      select: {
        ...PUBLIC_REVIEW_SELECT,
        moderationNote: true,
        listing: { select: { id: true, title: true, imageUrls: true } },
        target: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    const badges = await this.reputation.getPublicBadgesForUsers(
      reviews.flatMap((review) => [review.author.id, review.target.id]),
    );
    return reviews.map(({ moderationNote, ...review }) => ({
      ...review,
      rejectionReason:
        review.status === ReviewStatus.REJECTED ? moderationNote : null,
      authorBadges: badges[review.author.id] ?? [],
      targetBadges: badges[review.target.id] ?? [],
    }));
  }

  async findPublishedForListing(listingId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { listingId, status: ReviewStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      select: { ...PUBLIC_REVIEW_SELECT, targetId: true },
    });
    const badges = await this.reputation.getPublicBadgesForUsers(
      reviews.flatMap((review) => [review.author.id, review.targetId]),
    );
    return reviews.map(({ targetId, ...review }) => ({
      ...review,
      authorBadges: badges[review.author.id] ?? [],
      targetBadges: badges[targetId] ?? [],
    }));
  }

  async findReceived(providerId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { targetId: providerId, status: ReviewStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      select: {
        ...PUBLIC_REVIEW_SELECT,
        listing: { select: { id: true, title: true, imageUrls: true } },
      },
    });
    const badges = await this.reputation.getPublicBadgesForUsers([
      providerId,
      ...reviews.map((review) => review.author.id),
    ]);
    return reviews.map((review) => ({
      ...review,
      authorBadges: badges[review.author.id] ?? [],
      targetBadges: badges[providerId] ?? [],
    }));
  }

  async getSentimentDashboard(
    currentUserId: string,
    roles: Role[],
    query: ReviewSentimentQueryDto,
  ) {
    const isAdmin = roles.includes(Role.ADMIN);
    const isProvider = roles.includes(Role.PROVIDER);
    const providerId =
      isAdmin && query.providerId
        ? query.providerId
        : isProvider
          ? currentUserId
          : undefined;
    if (!providerId) {
      throw new BadRequestException({
        code: 'PROVIDER_ID_REQUIRED',
        message: 'Admin phải chọn Provider để xem dashboard cảm xúc.',
      });
    }

    const provider = await this.prisma.user.findFirst({
      where: {
        id: providerId,
        roles: { some: { role: Role.PROVIDER } },
      },
      select: { id: true, name: true },
    });
    if (!provider) throw new NotFoundException('Provider không tồn tại');

    const days = Number(query.range);
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - days + 1);
    from.setUTCHours(0, 0, 0, 0);

    const reviews = await this.prisma.review.findMany({
      where: {
        targetId: providerId,
        status: ReviewStatus.PUBLISHED,
        createdAt: { gte: from, lte: to },
      },
      select: { sentiment: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const analyzed = reviews.filter(
      (review) => review.sentiment !== ReviewSentiment.UNKNOWN,
    );
    const totals = {
      positive: analyzed.filter(
        (review) => review.sentiment === ReviewSentiment.POSITIVE,
      ).length,
      neutral: analyzed.filter(
        (review) => review.sentiment === ReviewSentiment.NEUTRAL,
      ).length,
      negative: analyzed.filter(
        (review) => review.sentiment === ReviewSentiment.NEGATIVE,
      ).length,
    };
    const percentage = (value: number) =>
      analyzed.length === 0
        ? 0
        : Math.round((value / analyzed.length) * 1000) / 10;

    const buckets = new Map<
      string,
      { start: string; positive: number; neutral: number; negative: number }
    >();
    for (const review of analyzed) {
      const start = this.sentimentBucketStart(review.createdAt, days, from);
      const bucket = buckets.get(start) ?? {
        start,
        positive: 0,
        neutral: 0,
        negative: 0,
      };
      if (review.sentiment === ReviewSentiment.POSITIVE) bucket.positive += 1;
      if (review.sentiment === ReviewSentiment.NEUTRAL) bucket.neutral += 1;
      if (review.sentiment === ReviewSentiment.NEGATIVE) bucket.negative += 1;
      buckets.set(start, bucket);
    }

    return {
      provider,
      rangeDays: days,
      granularity: days === 30 ? 'DAY' : days === 90 ? 'WEEK' : 'MONTH',
      from: from.toISOString(),
      to: to.toISOString(),
      totalReviews: reviews.length,
      analyzedReviews: analyzed.length,
      unknownReviews: reviews.length - analyzed.length,
      sentiment: {
        positive: {
          count: totals.positive,
          percentage: percentage(totals.positive),
        },
        neutral: {
          count: totals.neutral,
          percentage: percentage(totals.neutral),
        },
        negative: {
          count: totals.negative,
          percentage: percentage(totals.negative),
        },
      },
      trend: [...buckets.values()],
    };
  }

  private sentimentBucketStart(date: Date, days: number, from: Date) {
    const start = new Date(date);
    if (days === 30) {
      start.setUTCHours(0, 0, 0, 0);
    } else if (days === 90) {
      const elapsedDays = Math.floor(
        (start.getTime() - from.getTime()) / (24 * 60 * 60 * 1000),
      );
      start.setTime(
        from.getTime() + Math.floor(elapsedDays / 7) * 7 * 24 * 60 * 60 * 1000,
      );
    } else {
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
    }
    return start.toISOString().slice(0, 10);
  }

  async respond(
    providerId: string,
    reviewId: string,
    dto: RespondToReviewDto,
    ctx: RequestContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({
        where: { id: reviewId },
        select: {
          id: true,
          targetId: true,
          authorId: true,
          status: true,
          response: true,
          respondedAt: true,
          listingId: true,
        },
      });

      if (!existing) throw new NotFoundException('Đánh giá không tồn tại');
      if (existing.targetId !== providerId)
        throw new ForbiddenException(
          'Bạn chỉ có thể phản hồi đánh giá dành cho mình',
        );
      if (existing.status !== ReviewStatus.PUBLISHED)
        throw new ConflictException({
          code: 'REVIEW_NOT_PUBLISHED',
          message: 'Chỉ đánh giá đã công khai mới có thể được phản hồi.',
        });

      const now = new Date();
      const firstResponse = await tx.review.updateMany({
        where: {
          id: reviewId,
          targetId: providerId,
          status: ReviewStatus.PUBLISHED,
          response: null,
        },
        data: { response: dto.response, respondedAt: now },
      });
      const isCreate = firstResponse.count === 1;

      if (!isCreate) {
        await tx.review.update({
          where: { id: reviewId },
          data: { response: dto.response, respondedAt: now },
        });
      }

      const updated = await tx.review.findUniqueOrThrow({
        where: { id: reviewId },
        select: PUBLIC_REVIEW_SELECT,
      });

      await this.audit.log(tx, ctx, {
        action: isCreate
          ? 'REVIEW_RESPONSE_CREATED'
          : 'REVIEW_RESPONSE_UPDATED',
        entityType: 'Review',
        entityId: reviewId,
        before: {
          response: existing.response,
          respondedAt: existing.respondedAt,
        },
        after: { response: updated.response, respondedAt: updated.respondedAt },
      });

      if (isCreate) {
        await tx.notification.create({
          data: {
            userId: existing.authorId,
            type: NotificationType.REVIEW,
            title: 'Provider đã phản hồi đánh giá của bạn',
            body: 'Provider đã gửi phản hồi cho đánh giá bạn đã đăng.',
            data: {
              reviewId,
              listingId: existing.listingId,
            },
          },
        });
      }

      return updated;
    });
  }
}
