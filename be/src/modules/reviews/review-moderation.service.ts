import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  ReviewModerationSource,
  ReviewReportStatus as ReportStatus,
  ReviewStatus,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { RequestContext } from '../../common/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { detectReviewFraudSignals } from './review-fraud-signals';
import { ReviewAiAnalyzerService } from './review-ai-analyzer.service';
import type { ReviewAnalysisErrorCode } from './review-ai-analyzer.service';
import {
  RESPONSE_REJECTED_MESSAGE,
  REVIEW_ABANDON_AFTER_MS,
  DAY_MS,
  REVIEW_ANALYZE_JOB,
  REVIEW_MANUAL_FALLBACK_REASON,
  REVIEW_REMINDER_AFTER_DAYS,
  reviewDeadline,
  REVIEW_MODERATION_QUEUE,
  REVIEW_STALE_AFTER_MS,
  REVIEW_SWEEP_INTERVAL_MS,
  REVIEW_SWEEP_JOB,
  REVIEW_SWEEP_SCHEDULER,
} from './review-moderation.constants';
import { ModerationLexiconService } from './moderation-lexicon.service';
import { reconcileAiAnalysis } from './review-analysis-reconcile';
import {
  localAnalysis,
  routeReview,
  type CascadeThresholds,
} from './review-cascade';
import { ReviewClassifierService } from './review-classifier.service';
import { moderateReviewWithRules } from './review-moderation.rules';
import { evaluateRatingSentimentConsistency } from './review-rating-consistency';

export type ReviewQueueStatus =
  'WAITING' | 'PROCESSING' | 'RETRYING' | 'FAILED' | 'NOT_QUEUED';

export interface ReviewQueueInfo {
  status: ReviewQueueStatus;
  errorCode: ReviewAnalysisErrorCode | null;
}

@Injectable()
export class ReviewModerationService implements OnModuleInit {
  private readonly logger = new Logger(ReviewModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyzer: ReviewAiAnalyzerService,
    private readonly config: SystemConfigService,
    private readonly audit: AuditService,
    private readonly lexicon: ModerationLexiconService,
    private readonly classifier: ReviewClassifierService,
    @InjectQueue(REVIEW_MODERATION_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    try {
      await this.queue.upsertJobScheduler(
        REVIEW_SWEEP_SCHEDULER,
        { every: REVIEW_SWEEP_INTERVAL_MS },
        { name: REVIEW_SWEEP_JOB, data: {} },
      );
    } catch {
      this.logger.error('Could not register the pending review sweeper');
    }
  }

  private async cascadeThresholds(): Promise<CascadeThresholds> {
    const [toxicClear, toxicBlock, sentimentMin] = await Promise.all([
      this.config.get('review_local_toxic_clear'),
      this.config.get('review_local_toxic_block'),
      this.config.get('review_local_sentiment_min'),
    ]);
    return {
      toxicClear: toxicClear / 100,
      toxicBlock: toxicBlock / 100,
      sentimentMin: sentimentMin / 100,
    };
  }

  /** Pauses the whole worker for the time Groq asked us to back off. */
  async rateLimitQueue(delayMs: number) {
    await this.queue.rateLimit(delayMs);
  }

  private jobId(reviewId: string) {
    return `review-${reviewId}`;
  }

  async enqueue(reviewId: string): Promise<boolean> {
    try {
      const jobId = this.jobId(reviewId);
      const existing = await this.queue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        if (state === 'waiting' || state === 'active' || state === 'delayed')
          return true;
        await existing.remove();
      }
      await this.queue.add(
        REVIEW_ANALYZE_JOB,
        { reviewId },
        {
          jobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2_000 },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
      return true;
    } catch {
      this.logger.error(`Could not enqueue review moderation for ${reviewId}`);
      return false;
    }
  }

  async getQueueStatuses(
    reviewIds: string[],
  ): Promise<Record<string, ReviewQueueInfo>> {
    const notQueued: ReviewQueueInfo = {
      status: 'NOT_QUEUED',
      errorCode: null,
    };
    const entries = await Promise.all(
      reviewIds.map(async (id): Promise<[string, ReviewQueueInfo]> => {
        try {
          const job = await this.queue.getJob(this.jobId(id));
          if (!job) return [id, notQueued];
          const state = await job.getState();
          const status: ReviewQueueStatus | null =
            state === 'active'
              ? 'PROCESSING'
              : state === 'failed'
                ? 'FAILED'
                : state === 'delayed' && job.attemptsMade > 0
                  ? 'RETRYING'
                  : state === 'waiting' || state === 'delayed'
                    ? 'WAITING'
                    : null;
          if (!status) return [id, notQueued];
          return [
            id,
            { status, errorCode: this.safeErrorCode(job.failedReason) },
          ];
        } catch {
          this.logger.warn('Could not read review moderation queue status');
          return [id, notQueued];
        }
      }),
    );
    return Object.fromEntries(entries);
  }

  private safeErrorCode(
    reason: string | undefined,
  ): ReviewAnalysisErrorCode | null {
    const codes: ReviewAnalysisErrorCode[] = [
      'INVALID_AI_OUTPUT',
      'RATE_LIMITED',
      'TIMEOUT',
      'GROQ_UNAVAILABLE',
    ];
    return codes.find((code) => reason?.includes(code)) ?? null;
  }

  async analyze(reviewId: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        status: true,
        comment: true,
        rating: true,
        moderationSource: true,
        moderatedAt: true,
        authorId: true,
        targetId: true,
      },
    });
    const canAnalyze =
      review?.status === ReviewStatus.PENDING ||
      (review?.status === ReviewStatus.FLAGGED &&
        review.moderationSource === ReviewModerationSource.RULE) ||
      // Public but not yet checked: the post-publication AI pass.
      (review?.status === ReviewStatus.PUBLISHED && !review.moderatedAt);
    if (!review || !canAnalyze) return;

    const ruleResult = moderateReviewWithRules(
      review.comment ?? '',
      await this.lexicon.current(),
    );

    // Cheap local models answer first; the LLM is only asked about reviews they
    // cannot settle (see routeReview). Without the classifier everything goes to the LLM.
    const local = await this.classifier.classify(review.comment ?? '');
    const route = routeReview(
      {
        comment: review.comment ?? '',
        rating: review.rating,
        rule: ruleResult,
        local,
      },
      await this.cascadeThresholds(),
    );
    this.logger.log(
      JSON.stringify({
        event: 'review_moderation_route',
        reviewId,
        route: route.route,
        detail: route.route === 'LOCAL' ? route.verdict : route.cause,
      }),
    );

    let analysis;
    if (route.route === 'LOCAL' && local) {
      analysis = localAnalysis(local, route.verdict);
    } else {
      try {
        analysis = await this.analyzer.analyze({
          reviewId,
          comment: review.comment ?? '',
          rating: review.rating,
        });
      } catch (error) {
        if (ruleResult.toxicityDetected) {
          await this.persistRuleOnlyResult(reviewId, ruleResult);
          return;
        }
        throw error;
      }
    }
    const reasonPrefix = route.route === 'LOCAL' ? '[ML]' : '[AI]';

    const {
      inconsistentToxicity: inconsistentAiResult,
      inconsistentSpam: inconsistentAiSpam,
    } = reconcileAiAnalysis(analysis);
    const ratingConsistency = evaluateRatingSentimentConsistency(
      review.rating,
      analysis.sentiment,
      analysis.suspicionScore,
    );
    const fraud = await detectReviewFraudSignals(this.prisma, {
      id: reviewId,
      authorId: review.authorId,
      targetId: review.targetId,
      comment: review.comment ?? '',
    });
    const finalSpamScore = Math.max(
      analysis.spamScore,
      ruleResult.spamScore,
      inconsistentAiSpam ? 80 : 0,
    );
    const finalToxicityScore = Math.max(
      analysis.toxicityScore,
      ruleResult.toxicityScore,
      inconsistentAiResult ? 80 : 0,
    );
    const finalSuspicionScore = Math.max(
      ratingConsistency.suspicionScore,
      fraud.suspicionScore,
    );
    const reasons = [
      ...ruleResult.reasons,
      ...analysis.reasons.map((reason) => `${reasonPrefix} ${reason}`),
      ...(inconsistentAiResult
        ? ['[RULE] Điểm độc hại của AI không nhất quán với lý do phân tích.']
        : []),
      ...(inconsistentAiSpam
        ? ['[RULE] Điểm spam của AI không nhất quán với lý do phân tích.']
        : []),
      ...(ratingConsistency.reason ? [ratingConsistency.reason] : []),
      ...fraud.reasons,
    ];
    const [spamThreshold, toxicityThreshold] = await Promise.all([
      this.config.get('review_spam_threshold'),
      this.config.get('review_toxicity_threshold'),
    ]);
    // Only clear violations hide a review. Suspicion (rating/text mismatch,
    // bursts, AI doubt) keeps it public and surfaces it in the admin queue.
    const flagged =
      finalSpamScore >= spamThreshold ||
      finalToxicityScore >= toxicityThreshold ||
      ruleResult.flagged ||
      inconsistentAiSpam ||
      ruleResult.toxicityDetected ||
      inconsistentAiResult ||
      fraud.duplicate;

    await this.prisma.$transaction(async (tx) => {
      await this.lockReview(tx, reviewId);
      const current = await tx.review.findUnique({
        where: { id: reviewId },
        select: {
          status: true,
          authorId: true,
          targetId: true,
          moderatedAt: true,
        },
      });
      const stillAnalyzable =
        current?.status === ReviewStatus.PENDING ||
        current?.status === ReviewStatus.FLAGGED ||
        (current?.status === ReviewStatus.PUBLISHED && !current.moderatedAt);
      if (!current || !stillAnalyzable) return;
      const nextStatus = flagged
        ? ReviewStatus.FLAGGED
        : ReviewStatus.PUBLISHED;
      await tx.review.update({
        where: { id: reviewId },
        data: {
          status: nextStatus,
          sentiment: analysis.sentiment,
          spamScore: finalSpamScore,
          toxicityScore: finalToxicityScore,
          suspicionScore: finalSuspicionScore,
          analysisReasons: reasons,
          moderationSource: ReviewModerationSource.AI,
          moderationNote: flagged ? reasons.join(', ') : null,
          moderatedAt: new Date(),
          moderatedById: null,
        },
      });
      if (nextStatus === ReviewStatus.PUBLISHED) {
        if (current.status !== ReviewStatus.PUBLISHED)
          await this.refreshProviderRating(tx, current.targetId);
        // The author was told it was under review, so close the loop.
        if (current.status === ReviewStatus.FLAGGED)
          await this.notifyPublished(tx, current.authorId, reviewId);
      } else if (current.status === ReviewStatus.PUBLISHED) {
        await this.refreshProviderRating(tx, current.targetId);
        await this.notifyHidden(tx, current.authorId, reviewId);
      } else if (current.status === ReviewStatus.PENDING) {
        await this.notifyFlagged(tx, current.authorId, reviewId);
      }
    });
  }

  private async persistRuleOnlyResult(
    reviewId: string,
    result: ReturnType<typeof moderateReviewWithRules>,
  ) {
    await this.flagForManualReview(reviewId, {
      spamScore: result.spamScore,
      toxicityScore: result.toxicityScore,
      analysisReasons: result.reasons,
      moderationNote: result.reasons.join(', '),
    });
  }

  /**
   * Used when AI keeps failing. A review still waiting in PENDING goes to the
   * admin queue; a review that is already public stays public (fail open, the
   * rules already screened it) and is just marked as no longer waiting.
   */
  async escalateToManual(reviewId: string): Promise<boolean> {
    const escalated = await this.flagForManualReview(reviewId, {
      analysisReasons: [REVIEW_MANUAL_FALLBACK_REASON],
      moderationNote: REVIEW_MANUAL_FALLBACK_REASON,
    });
    if (escalated) {
      this.logger.warn(`Review ${reviewId} escalated to manual moderation`);
      return true;
    }
    const released = await this.prisma.review.updateMany({
      where: {
        id: reviewId,
        status: ReviewStatus.PUBLISHED,
        moderatedAt: null,
      },
      data: {
        moderatedAt: new Date(),
        moderationSource: ReviewModerationSource.RULE,
        moderationNote: REVIEW_MANUAL_FALLBACK_REASON,
        analysisReasons: [REVIEW_MANUAL_FALLBACK_REASON],
      },
    });
    if (released.count > 0)
      this.logger.warn(`Review ${reviewId} stays public: AI was unavailable`);
    return released.count > 0;
  }

  private async flagForManualReview(
    reviewId: string,
    data: {
      spamScore?: number;
      toxicityScore?: number;
      analysisReasons: string[];
      moderationNote: string;
    },
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockReview(tx, reviewId);
      const current = await tx.review.findUnique({
        where: { id: reviewId },
        select: { status: true, authorId: true },
      });
      if (
        !current ||
        (current.status !== ReviewStatus.PENDING &&
          current.status !== ReviewStatus.FLAGGED)
      )
        return false;
      await tx.review.update({
        where: { id: reviewId },
        data: {
          ...data,
          status: ReviewStatus.FLAGGED,
          moderationSource: ReviewModerationSource.RULE,
          moderatedAt: new Date(),
        },
      });
      if (current.status === ReviewStatus.PENDING)
        await this.notifyFlagged(tx, current.authorId, reviewId);
      return true;
    });
  }

  async sweepStalePending(now = new Date()) {
    const stale = await this.prisma.review.findMany({
      where: {
        OR: [
          { status: ReviewStatus.PENDING },
          // Public reviews whose post-publication AI pass never ran.
          { status: ReviewStatus.PUBLISHED, moderatedAt: null },
        ],
        updatedAt: { lt: new Date(now.getTime() - REVIEW_STALE_AFTER_MS) },
      },
      orderBy: { updatedAt: 'asc' },
      take: 50,
      select: { id: true, updatedAt: true },
    });
    const statuses = await this.getQueueStatuses(stale.map((r) => r.id));
    const result = { requeued: 0, escalated: 0, skipped: 0 };
    for (const review of stale) {
      const status = statuses[review.id].status;
      const abandoned =
        status === 'FAILED' ||
        now.getTime() - review.updatedAt.getTime() >= REVIEW_ABANDON_AFTER_MS;
      if (
        !abandoned &&
        (status === 'WAITING' ||
          status === 'PROCESSING' ||
          status === 'RETRYING')
      ) {
        result.skipped += 1;
        continue;
      }
      if (abandoned) {
        if (await this.escalateToManual(review.id)) result.escalated += 1;
      } else if (await this.enqueue(review.id)) {
        result.requeued += 1;
      }
    }
    return result;
  }

  /** One reminder per completed booking that is still inside the review window. */
  async remindUnreviewedBookings(now = new Date()): Promise<number> {
    const windowDays = await this.config.get('review_window_days');
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        review: null,
        endDate: {
          lte: new Date(now.getTime() - REVIEW_REMINDER_AFTER_DAYS * DAY_MS),
          gt: new Date(now.getTime() - windowDays * DAY_MS),
        },
      },
      orderBy: { endDate: 'asc' },
      take: 100,
      select: {
        id: true,
        travelerId: true,
        endDate: true,
        listing: { select: { title: true } },
      },
    });
    let sent = 0;
    for (const booking of bookings) {
      const already = await this.prisma.notification.findFirst({
        where: {
          userId: booking.travelerId,
          type: NotificationType.REVIEW,
          data: { path: ['reminderFor'], equals: booking.id },
        },
        select: { id: true },
      });
      if (already) continue;
      const daysLeft = Math.max(
        0,
        Math.ceil(
          (reviewDeadline(booking.endDate, windowDays).getTime() -
            now.getTime()) /
            DAY_MS,
        ),
      );
      await this.prisma.notification.create({
        data: {
          userId: booking.travelerId,
          type: NotificationType.REVIEW,
          title: 'Hãy đánh giá chuyến thuê của bạn',
          body: `Bạn chưa đánh giá "${booking.listing.title}". Còn ${daysLeft} ngày để gửi đánh giá.`,
          data: { reminderFor: booking.id, bookingId: booking.id },
        },
      });
      sent += 1;
    }
    return sent;
  }

  /**
   * Provider replies are public immediately, so they get the same rule + AI
   * screening as reviews. AI outages fail open: the deterministic rules still ran.
   */
  async assertResponseAllowed(text: string): Promise<void> {
    const rejected = () =>
      new BadRequestException({
        code: 'RESPONSE_REJECTED',
        message: RESPONSE_REJECTED_MESSAGE,
      });
    if (moderateReviewWithRules(text, await this.lexicon.current()).flagged)
      throw rejected();
    // The author is waiting for this answer, so the fast local models go first.
    const route = routeReview(
      {
        comment: text,
        rating: 3,
        rule: { flagged: false },
        local: await this.classifier.classify(text),
        needSentiment: false,
      },
      await this.cascadeThresholds(),
    );
    if (route.route === 'LOCAL') {
      if (route.verdict === 'TOXIC') throw rejected();
      return;
    }
    try {
      const analysis = await this.analyzer.analyze({
        comment: text,
        rating: 3,
      });
      const [spamThreshold, toxicityThreshold] = await Promise.all([
        this.config.get('review_spam_threshold'),
        this.config.get('review_toxicity_threshold'),
      ]);
      const { inconsistentToxicity, inconsistentSpam } =
        reconcileAiAnalysis(analysis);
      if (
        analysis.spamScore >= spamThreshold ||
        analysis.toxicityScore >= toxicityThreshold ||
        inconsistentToxicity ||
        inconsistentSpam
      )
        throw rejected();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      // A threat cue is too risky to wave through just because the LLM is down.
      if (route.cause === 'THREAT_CUE') throw rejected();
      this.logger.warn('AI screening of provider response was unavailable');
    }
  }

  async moderateByAdmin(
    reviewId: string,
    decision: 'APPROVE' | 'REJECT',
    note: string | undefined,
    ctx: RequestContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockReview(tx, reviewId);
      const review = await tx.review.findUnique({
        where: { id: reviewId },
        select: { status: true, authorId: true, targetId: true },
      });
      if (!review) throw new NotFoundException('Đánh giá không tồn tại');
      const nextStatus =
        decision === 'APPROVE' ? ReviewStatus.PUBLISHED : ReviewStatus.REJECTED;
      const allowed: ReviewStatus[] =
        decision === 'APPROVE'
          ? [
              ReviewStatus.PENDING,
              ReviewStatus.FLAGGED,
              // Approving a public review clears it from the "suspicious" queue.
              ReviewStatus.PUBLISHED,
            ]
          : [
              ReviewStatus.PENDING,
              ReviewStatus.FLAGGED,
              ReviewStatus.PUBLISHED,
            ];
      if (!allowed.includes(review.status))
        throw new ConflictException({
          code: 'INVALID_REVIEW_TRANSITION',
          message: `Không thể ${decision} đánh giá ở trạng thái ${review.status}.`,
        });
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: {
          status: nextStatus,
          moderationSource: ReviewModerationSource.ADMIN,
          moderationNote: note ?? null,
          moderatedAt: new Date(),
          moderatedById: ctx.actorId,
        },
      });

      if (
        review.status === ReviewStatus.PUBLISHED ||
        nextStatus === ReviewStatus.PUBLISHED
      )
        await this.refreshProviderRating(tx, review.targetId);
      if (
        review.status !== ReviewStatus.PUBLISHED &&
        nextStatus === ReviewStatus.PUBLISHED
      )
        await this.notifyPublished(tx, review.authorId, reviewId);
      if (
        review.status !== ReviewStatus.REJECTED &&
        nextStatus === ReviewStatus.REJECTED
      )
        await tx.notification.create({
          data: {
            userId: review.authorId,
            type: NotificationType.REVIEW,
            title: 'Đánh giá không được duyệt',
            body: note ?? 'Đánh giá của bạn không đáp ứng chính sách nội dung.',
            data: { reviewId },
          },
        });
      if (nextStatus === ReviewStatus.REJECTED)
        await this.resolveReports(tx, reviewId, 'UPHELD', ctx);
      await this.audit.log(tx, ctx, {
        action: decision === 'APPROVE' ? 'REVIEW_APPROVED' : 'REVIEW_REJECTED',
        entityType: 'Review',
        entityId: reviewId,
        before: { status: review.status },
        after: { status: nextStatus, note: note ?? null },
      });
      return updated;
    });
  }

  /** Closes every open provider report on a review and tells each reporter the outcome. */
  private async resolveReports(
    tx: Prisma.TransactionClient,
    reviewId: string,
    resolution: 'UPHELD' | 'DISMISSED',
    ctx: RequestContext,
    note?: string,
  ): Promise<number> {
    const open = await tx.reviewReport.findMany({
      where: { reviewId, status: ReportStatus.OPEN },
      select: { id: true, reporterId: true },
    });
    if (!open.length) return 0;
    await tx.reviewReport.updateMany({
      where: { id: { in: open.map((report) => report.id) } },
      data: {
        status: resolution,
        resolvedAt: new Date(),
        resolvedById: ctx.actorId,
      },
    });
    await tx.notification.createMany({
      data: open.map((report) => ({
        userId: report.reporterId,
        type: NotificationType.REVIEW,
        title:
          resolution === 'UPHELD'
            ? 'Báo cáo đánh giá được chấp nhận'
            : 'Báo cáo đánh giá không được chấp nhận',
        body:
          resolution === 'UPHELD'
            ? 'Quản trị viên đã gỡ đánh giá bạn báo cáo khỏi trang công khai.'
            : (note ??
              'Quản trị viên xem xét và giữ nguyên đánh giá bạn báo cáo.'),
        data: { reviewId },
      })),
    });
    return open.length;
  }

  async dismissReports(
    reviewId: string,
    note: string | undefined,
    ctx: RequestContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockReview(tx, reviewId);
      const exists = await tx.review.findUnique({
        where: { id: reviewId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Đánh giá không tồn tại');
      const dismissed = await this.resolveReports(
        tx,
        reviewId,
        'DISMISSED',
        ctx,
        note,
      );
      if (!dismissed)
        throw new ConflictException({
          code: 'NO_OPEN_REPORTS',
          message: 'Đánh giá này không có báo cáo nào đang chờ xử lý.',
        });
      await this.audit.log(tx, ctx, {
        action: 'REVIEW_REPORTS_DISMISSED',
        entityType: 'Review',
        entityId: reviewId,
        after: { dismissed, note: note ?? null },
      });
      return { id: reviewId, dismissed };
    });
  }

  async reanalyze(reviewId: string, ctx: RequestContext) {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockReview(tx, reviewId);
      const review = await tx.review.findUnique({
        where: { id: reviewId },
        select: { status: true, targetId: true },
      });
      if (!review) throw new NotFoundException('Đánh giá không tồn tại');
      await tx.review.update({
        where: { id: reviewId },
        data: {
          status: ReviewStatus.PENDING,
          sentiment: 'UNKNOWN',
          spamScore: null,
          toxicityScore: null,
          suspicionScore: null,
          analysisReasons: Prisma.DbNull,
          moderationSource: ReviewModerationSource.ADMIN,
          moderationNote: null,
          moderatedAt: null,
          moderatedById: ctx.actorId,
        },
      });
      if (review.status === ReviewStatus.PUBLISHED)
        await this.refreshProviderRating(tx, review.targetId);
      await this.audit.log(tx, ctx, {
        action: 'REVIEW_REANALYZED',
        entityType: 'Review',
        entityId: reviewId,
        before: { status: review.status },
        after: { status: ReviewStatus.PENDING },
      });
      return { id: reviewId, status: ReviewStatus.PENDING };
    });
    const queued = await this.enqueue(reviewId);
    return { ...result, queued };
  }

  private async lockReview(tx: Prisma.TransactionClient, reviewId: string) {
    await tx.$queryRaw`SELECT "id" FROM "Review" WHERE "id" = ${reviewId} FOR UPDATE`;
  }

  async refreshProviderRating(
    tx: Prisma.TransactionClient,
    providerId: string,
  ) {
    const aggregate = await tx.review.aggregate({
      where: { targetId: providerId, status: ReviewStatus.PUBLISHED },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await tx.providerProfile.updateMany({
      where: { userId: providerId },
      data: {
        ratingAvg: aggregate._avg.rating ?? 0,
        reviewsCount: aggregate._count._all,
      },
    });
  }

  private async notifyFlagged(
    tx: Prisma.TransactionClient,
    authorId: string,
    reviewId: string,
  ) {
    await tx.notification.create({
      data: {
        userId: authorId,
        type: NotificationType.REVIEW,
        title: 'Đánh giá đang được xem xét',
        body: 'Đánh giá của bạn cần quản trị viên xem xét trước khi được công khai.',
        data: { reviewId },
      },
    });
  }

  private async notifyHidden(
    tx: Prisma.TransactionClient,
    authorId: string,
    reviewId: string,
  ) {
    await tx.notification.create({
      data: {
        userId: authorId,
        type: NotificationType.REVIEW,
        title: 'Đánh giá của bạn đã bị ẩn',
        body: 'Đánh giá có thể chứa nội dung không phù hợp nên đã được ẩn khỏi trang công khai. Bạn có thể chỉnh sửa nội dung hoặc chờ quản trị viên xem xét.',
        data: { reviewId },
      },
    });
  }

  private async notifyPublished(
    tx: Prisma.TransactionClient,
    authorId: string,
    reviewId: string,
  ) {
    await tx.notification.create({
      data: {
        userId: authorId,
        type: NotificationType.REVIEW,
        title: 'Đánh giá đã được công khai',
        body: 'Đánh giá của bạn đã hoàn tất kiểm duyệt và được công khai.',
        data: { reviewId },
      },
    });
  }
}
