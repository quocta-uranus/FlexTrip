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
  AppealReviewDto,
  CreateReviewDto,
  EditReviewDto,
  ReportReviewDto,
  RespondToReviewDto,
  ReviewSentimentQueryDto,
} from './dto/review.dto';
import {
  HOUR_MS,
  DAY_MS,
  RESPONSE_EDIT_LIMIT,
  REVIEW_APPEAL_WINDOW_DAYS,
  REVIEW_REPORT_DAILY_LIMIT,
  reviewDeadline,
} from './review-moderation.constants';
import { SystemConfigService } from '../system-config/system-config.service';
import { ModerationLexiconService } from './moderation-lexicon.service';
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
    private readonly config: SystemConfigService,
    private readonly lexicon: ModerationLexiconService,
  ) {}

  async policy() {
    const [reviewWindowDays, reviewEditHours] = await Promise.all([
      this.config.get('review_window_days'),
      this.config.get('review_edit_hours'),
    ]);
    return { reviewWindowDays, reviewEditHours };
  }

  async create(authorId: string, dto: CreateReviewDto) {
    const windowDays = await this.config.get('review_window_days');
    const moderation = moderateReviewWithRules(
      dto.comment,
      await this.lexicon.current(),
    );
    // Clean reviews go public at once; the AI check runs afterwards and only
    // pulls the review back for clear violations.
    const status = moderation.flagged
      ? ReviewStatus.FLAGGED
      : ReviewStatus.PUBLISHED;

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
              endDate: true,
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
          if (
            Date.now() > reviewDeadline(booking.endDate, windowDays).getTime()
          )
            throw new ConflictException({
              code: 'REVIEW_WINDOW_EXPIRED',
              message: `Đã quá hạn đánh giá (${windowDays} ngày sau khi kết thúc thuê).`,
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

          if (status === ReviewStatus.PUBLISHED)
            await this.moderationService.refreshProviderRating(
              tx,
              booking.listing.providerId,
            );
          if (moderation.flagged)
            await tx.notification.create({
              data: {
                userId: authorId,
                type: NotificationType.REVIEW,
                title: 'Đánh giá đang được xem xét',
                body: 'Đánh giá của bạn cần quản trị viên xem xét trước khi được công khai.',
                data: { reviewId: review.id },
              },
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
    const editHours = await this.config.get('review_edit_hours');
    const reviews = await this.prisma.review.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
      select: {
        ...PUBLIC_REVIEW_SELECT,
        moderationNote: true,
        moderatedAt: true,
        editedAt: true,
        appealedAt: true,
        listing: { select: { id: true, title: true, imageUrls: true } },
        target: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    const badges = await this.reputation.getPublicBadgesForUsers(
      reviews.flatMap((review) => [review.author.id, review.target.id]),
    );
    const now = Date.now();
    return reviews.map(({ moderationNote, moderatedAt, ...review }) => ({
      ...review,
      rejectionReason:
        review.status === ReviewStatus.REJECTED ? moderationNote : null,
      canEdit:
        !review.editedAt &&
        this.isEditableStatus(review.status) &&
        now <=
          this.editBase(review.status, review.createdAt, moderatedAt) +
            editHours * HOUR_MS,
      canAppeal:
        review.status === ReviewStatus.REJECTED &&
        !review.appealedAt &&
        now <=
          (moderatedAt ?? review.createdAt).getTime() +
            REVIEW_APPEAL_WINDOW_DAYS * DAY_MS,
      authorBadges: badges[review.author.id] ?? [],
      targetBadges: badges[review.target.id] ?? [],
    }));
  }

  private isEditableStatus(status: ReviewStatus) {
    const editable: ReviewStatus[] = [
      ReviewStatus.PUBLISHED,
      ReviewStatus.FLAGGED,
      ReviewStatus.REJECTED,
    ];
    return editable.includes(status);
  }

  /** A rejected review gets its edit window from the rejection, not from posting. */
  private editBase(
    status: ReviewStatus,
    createdAt: Date,
    moderatedAt: Date | null,
  ) {
    return (
      status === ReviewStatus.REJECTED ? (moderatedAt ?? createdAt) : createdAt
    ).getTime();
  }

  private async lockReview(tx: Prisma.TransactionClient, reviewId: string) {
    await tx.$queryRaw`SELECT "id" FROM "Review" WHERE "id" = ${reviewId} FOR UPDATE`;
  }

  async edit(
    authorId: string,
    reviewId: string,
    dto: EditReviewDto,
    ctx: RequestContext,
  ) {
    const editHours = await this.config.get('review_edit_hours');
    const moderation = moderateReviewWithRules(
      dto.comment,
      await this.lexicon.current(),
    );
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.lockReview(tx, reviewId);
      const review = await tx.review.findUnique({
        where: { id: reviewId },
        select: {
          authorId: true,
          targetId: true,
          status: true,
          rating: true,
          comment: true,
          editedAt: true,
          createdAt: true,
          moderatedAt: true,
        },
      });
      if (!review) throw new NotFoundException('Đánh giá không tồn tại');
      if (review.authorId !== authorId)
        throw new ForbiddenException('Bạn chỉ có thể sửa đánh giá của mình');
      if (review.editedAt)
        throw new ConflictException({
          code: 'REVIEW_ALREADY_EDITED',
          message: 'Đánh giá chỉ được sửa một lần.',
        });
      if (!this.isEditableStatus(review.status))
        throw new ConflictException({
          code: 'REVIEW_NOT_EDITABLE',
          message: 'Đánh giá đang được kiểm duyệt, chưa thể sửa.',
        });
      const base = this.editBase(
        review.status,
        review.createdAt,
        review.moderatedAt,
      );
      if (Date.now() > base + editHours * HOUR_MS)
        throw new ConflictException({
          code: 'REVIEW_EDIT_WINDOW_EXPIRED',
          message: `Đã quá ${editHours} giờ, không thể sửa đánh giá.`,
        });

      const result = await tx.review.update({
        where: { id: reviewId },
        data: {
          rating: dto.rating,
          comment: dto.comment,
          editedAt: new Date(),
          status: moderation.flagged
            ? ReviewStatus.FLAGGED
            : ReviewStatus.PUBLISHED,
          sentiment: ReviewSentiment.UNKNOWN,
          spamScore: moderation.flagged ? moderation.spamScore : null,
          toxicityScore: moderation.flagged ? moderation.toxicityScore : null,
          suspicionScore: null,
          analysisReasons: moderation.flagged
            ? moderation.reasons
            : Prisma.DbNull,
          moderationSource: moderation.flagged
            ? ReviewModerationSource.RULE
            : null,
          moderationNote: moderation.flagged
            ? moderation.reasons.join(',')
            : null,
          moderatedAt: null,
          moderatedById: null,
        },
        select: PUBLIC_REVIEW_SELECT,
      });
      if (
        review.status === ReviewStatus.PUBLISHED ||
        result.status === ReviewStatus.PUBLISHED
      )
        await this.moderationService.refreshProviderRating(tx, review.targetId);
      if (moderation.flagged)
        await tx.notification.create({
          data: {
            userId: authorId,
            type: NotificationType.REVIEW,
            title: 'Đánh giá đang được xem xét',
            body: 'Đánh giá của bạn cần quản trị viên xem xét trước khi được công khai.',
            data: { reviewId },
          },
        });
      await this.audit.log(tx, ctx, {
        action: 'REVIEW_EDITED',
        entityType: 'Review',
        entityId: reviewId,
        before: {
          status: review.status,
          rating: review.rating,
          comment: review.comment,
        },
        after: {
          status: result.status,
          rating: dto.rating,
          comment: dto.comment,
        },
      });
      return result;
    });
    const queued = await this.moderationService.enqueue(reviewId);
    if (!queued) this.logger.warn(`Edited review ${reviewId}: enqueue failed`);
    return updated;
  }

  async appeal(
    authorId: string,
    reviewId: string,
    dto: AppealReviewDto,
    ctx: RequestContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockReview(tx, reviewId);
      const review = await tx.review.findUnique({
        where: { id: reviewId },
        select: {
          authorId: true,
          status: true,
          appealedAt: true,
          createdAt: true,
          moderatedAt: true,
        },
      });
      if (!review) throw new NotFoundException('Đánh giá không tồn tại');
      if (review.authorId !== authorId)
        throw new ForbiddenException(
          'Bạn chỉ có thể khiếu nại đánh giá của mình',
        );
      if (review.status !== ReviewStatus.REJECTED)
        throw new ConflictException({
          code: 'REVIEW_NOT_APPEALABLE',
          message: 'Chỉ đánh giá bị từ chối mới có thể khiếu nại.',
        });
      if (review.appealedAt)
        throw new ConflictException({
          code: 'REVIEW_ALREADY_APPEALED',
          message: 'Đánh giá chỉ được khiếu nại một lần.',
        });
      const base = (review.moderatedAt ?? review.createdAt).getTime();
      if (Date.now() > base + REVIEW_APPEAL_WINDOW_DAYS * DAY_MS)
        throw new ConflictException({
          code: 'REVIEW_APPEAL_WINDOW_EXPIRED',
          message: `Đã quá ${REVIEW_APPEAL_WINDOW_DAYS} ngày kể từ khi bị từ chối.`,
        });

      const updated = await tx.review.update({
        where: { id: reviewId },
        data: {
          status: ReviewStatus.FLAGGED,
          appealedAt: new Date(),
          appealNote: dto.reason,
        },
        select: PUBLIC_REVIEW_SELECT,
      });
      await tx.notification.create({
        data: {
          userId: authorId,
          type: NotificationType.REVIEW,
          title: 'Đã ghi nhận khiếu nại',
          body: 'Quản trị viên sẽ xem xét lại đánh giá của bạn.',
          data: { reviewId },
        },
      });
      await this.audit.log(tx, ctx, {
        action: 'REVIEW_APPEALED',
        entityType: 'Review',
        entityId: reviewId,
        before: { status: review.status },
        after: { status: ReviewStatus.FLAGGED, reason: dto.reason },
      });
      return updated;
    });
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
        responseEdits: true,
        listing: { select: { id: true, title: true, imageUrls: true } },
      },
    });
    const [badges, reports] = await Promise.all([
      this.reputation.getPublicBadgesForUsers([
        providerId,
        ...reviews.map((review) => review.author.id),
      ]),
      this.prisma.reviewReport.findMany({
        where: {
          reporterId: providerId,
          reviewId: { in: reviews.map((review) => review.id) },
        },
        select: { reviewId: true, status: true, reason: true, createdAt: true },
      }),
    ]);
    const reportByReview = new Map(
      reports.map(({ reviewId, ...report }) => [reviewId, report]),
    );
    return reviews.map(({ responseEdits, ...review }) => ({
      ...review,
      responseEditsLeft: review.response
        ? Math.max(0, RESPONSE_EDIT_LIMIT - responseEdits)
        : RESPONSE_EDIT_LIMIT,
      myReport: reportByReview.get(review.id) ?? null,
      authorBadges: badges[review.author.id] ?? [],
      targetBadges: badges[providerId] ?? [],
    }));
  }

  async report(
    providerId: string,
    reviewId: string,
    dto: ReportReviewDto,
    ctx: RequestContext,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const review = await tx.review.findUnique({
          where: { id: reviewId },
          select: { targetId: true, status: true },
        });
        if (!review) throw new NotFoundException('Đánh giá không tồn tại');
        if (review.targetId !== providerId)
          throw new ForbiddenException(
            'Bạn chỉ có thể báo cáo đánh giá dành cho mình',
          );
        if (review.status !== ReviewStatus.PUBLISHED)
          throw new ConflictException({
            code: 'REVIEW_NOT_REPORTABLE',
            message: 'Chỉ đánh giá đang công khai mới có thể báo cáo.',
          });
        const today = await tx.reviewReport.count({
          where: {
            reporterId: providerId,
            createdAt: { gte: new Date(Date.now() - DAY_MS) },
          },
        });
        if (today >= REVIEW_REPORT_DAILY_LIMIT)
          throw new ConflictException({
            code: 'REPORT_LIMIT_REACHED',
            message: `Bạn chỉ được gửi tối đa ${REVIEW_REPORT_DAILY_LIMIT} báo cáo mỗi ngày.`,
          });

        const report = await tx.reviewReport.create({
          data: {
            reviewId,
            reporterId: providerId,
            reason: dto.reason,
            details: dto.details ?? null,
          },
          select: { id: true, reason: true, status: true, createdAt: true },
        });
        await this.audit.log(tx, ctx, {
          action: 'REVIEW_REPORTED',
          entityType: 'Review',
          entityId: reviewId,
          after: { reason: dto.reason, details: dto.details ?? null },
        });
        return report;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException({
          code: 'REVIEW_ALREADY_REPORTED',
          message: 'Bạn đã báo cáo đánh giá này rồi.',
        });
      throw error;
    }
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
    await this.moderationService.assertResponseAllowed(dto.response);
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
          responseEdits: true,
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

      if (existing.response && existing.responseEdits >= RESPONSE_EDIT_LIMIT)
        throw new ConflictException({
          code: 'RESPONSE_EDIT_LIMIT',
          message: `Bạn chỉ được sửa phản hồi tối đa ${RESPONSE_EDIT_LIMIT} lần.`,
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
          data: {
            response: dto.response,
            respondedAt: now,
            responseEdits: { increment: 1 },
          },
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
