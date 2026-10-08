import { InjectQueue } from '@nestjs/bullmq';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  ReviewModerationSource,
  ReviewStatus,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { RequestContext } from '../../common/request-context';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { ReviewAiAnalyzerService } from './review-ai-analyzer.service';
import type { ReviewAnalysisErrorCode } from './review-ai-analyzer.service';
import {
  REVIEW_ANALYZE_JOB,
  REVIEW_MODERATION_QUEUE,
} from './review-moderation.constants';
import { moderateReviewWithRules } from './review-moderation.rules';
import { evaluateRatingSentimentConsistency } from './review-rating-consistency';

export type ReviewQueueStatus =
  'WAITING' | 'PROCESSING' | 'RETRYING' | 'FAILED' | 'NOT_QUEUED';

export interface ReviewQueueInfo {
  status: ReviewQueueStatus;
  errorCode: ReviewAnalysisErrorCode | null;
}

@Injectable()
export class ReviewModerationService {
  private readonly logger = new Logger(ReviewModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyzer: ReviewAiAnalyzerService,
    private readonly config: SystemConfigService,
    private readonly audit: AuditService,
    @InjectQueue(REVIEW_MODERATION_QUEUE) private readonly queue: Queue,
  ) {}

  async enqueue(reviewId: string, uniqueSuffix = 'initial'): Promise<boolean> {
    try {
      await this.queue.add(
        REVIEW_ANALYZE_JOB,
        { reviewId },
        {
          jobId: `review-${reviewId}-${uniqueSuffix}`,
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
    const statuses: Record<string, ReviewQueueInfo> = Object.fromEntries(
      reviewIds.map((id) => [
        id,
        { status: 'NOT_QUEUED' as ReviewQueueStatus, errorCode: null },
      ]),
    );
    if (!reviewIds.length) return statuses;

    try {
      const latestJobAt = Object.fromEntries(reviewIds.map((id) => [id, -1]));
      const states = ['waiting', 'active', 'delayed', 'failed'] as const;
      const groups = await Promise.all(
        states.map((state) => this.queue.getJobs([state], 0, -1, true)),
      );
      groups.forEach((jobs, index) => {
        const state = states[index];
        for (const job of jobs) {
          const reviewId = (job.data as { reviewId?: string }).reviewId;
          if (!reviewId || !(reviewId in statuses)) continue;
          if (job.timestamp < latestJobAt[reviewId]) continue;
          latestJobAt[reviewId] = job.timestamp;
          const status: ReviewQueueStatus =
            state === 'active'
              ? 'PROCESSING'
              : state === 'failed'
                ? 'FAILED'
                : state === 'delayed' && job.attemptsMade > 0
                  ? 'RETRYING'
                  : 'WAITING';
          statuses[reviewId] = {
            status,
            errorCode: this.safeErrorCode(job.failedReason),
          };
        }
      });
    } catch {
      this.logger.warn('Could not read review moderation queue status');
    }
    return statuses;
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
      },
    });
    const canAnalyze =
      review?.status === ReviewStatus.PENDING ||
      (review?.status === ReviewStatus.FLAGGED &&
        review.moderationSource === ReviewModerationSource.RULE);
    if (!review || !canAnalyze) return;

    const ruleResult = moderateReviewWithRules(review.comment ?? '');

    let analysis;
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

    const aiSignalsToxicity = analysis.reasons.some((reason) =>
      /profan|offensive|harass|abusive|insult|tục|xúc phạm|quấy rối|lăng mạ/iu.test(
        reason,
      ),
    );
    const inconsistentAiResult =
      aiSignalsToxicity && analysis.toxicityScore < 80;
    const aiSignalsSpam = analysis.reasons.some(
      (reason) =>
        /spam|repetit|automated|ký tự lặp|lặp lại|nhiều đường dẫn/iu.test(
          reason,
        ) &&
        !/không (?:có )?(?:dấu hiệu )?spam|không phải spam|no (?:signs? of )?spam/iu.test(
          reason,
        ),
    );
    const inconsistentAiSpam = aiSignalsSpam && analysis.spamScore < 80;
    const ratingConsistency = evaluateRatingSentimentConsistency(
      review.rating,
      analysis.sentiment,
      analysis.suspicionScore,
    );
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
    const finalSuspicionScore = ratingConsistency.suspicionScore;
    const reasons = [
      ...ruleResult.reasons,
      ...analysis.reasons.map((reason) => `[AI] ${reason}`),
      ...(inconsistentAiResult
        ? ['[RULE] Điểm độc hại của AI không nhất quán với lý do phân tích.']
        : []),
      ...(inconsistentAiSpam
        ? ['[RULE] Điểm spam của AI không nhất quán với lý do phân tích.']
        : []),
      ...(ratingConsistency.reason ? [ratingConsistency.reason] : []),
    ];
    const [spamThreshold, toxicityThreshold, suspicionThreshold] =
      await Promise.all([
        this.config.get('review_spam_threshold'),
        this.config.get('review_toxicity_threshold'),
        this.config.get('review_suspicion_threshold'),
      ]);
    const flagged =
      finalSpamScore >= spamThreshold ||
      finalToxicityScore >= toxicityThreshold ||
      finalSuspicionScore >= suspicionThreshold ||
      ruleResult.flagged ||
      inconsistentAiSpam ||
      ruleResult.toxicityDetected ||
      inconsistentAiResult;

    await this.prisma.$transaction(async (tx) => {
      await this.lockReview(tx, reviewId);
      const current = await tx.review.findUnique({
        where: { id: reviewId },
        select: { status: true, authorId: true, targetId: true },
      });
      if (
        !current ||
        (current.status !== ReviewStatus.PENDING &&
          current.status !== ReviewStatus.FLAGGED)
      )
        return;
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
        await this.refreshProviderRating(tx, current.targetId);
        await this.notifyPublished(tx, current.authorId, reviewId);
      }
    });
  }

  private async persistRuleOnlyResult(
    reviewId: string,
    result: ReturnType<typeof moderateReviewWithRules>,
  ) {
    await this.prisma.review.updateMany({
      where: {
        id: reviewId,
        status: { in: [ReviewStatus.PENDING, ReviewStatus.FLAGGED] },
      },
      data: {
        status: ReviewStatus.FLAGGED,
        spamScore: result.spamScore,
        toxicityScore: result.toxicityScore,
        analysisReasons: result.reasons,
        moderationSource: ReviewModerationSource.RULE,
        moderationNote: result.reasons.join(', '),
        moderatedAt: new Date(),
      },
    });
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
          ? [ReviewStatus.PENDING, ReviewStatus.FLAGGED]
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
    const queued = await this.enqueue(reviewId, `admin-${Date.now()}`);
    return { ...result, queued };
  }

  private async lockReview(tx: Prisma.TransactionClient, reviewId: string) {
    await tx.$queryRaw`SELECT "id" FROM "Review" WHERE "id" = ${reviewId} FOR UPDATE`;
  }

  private async refreshProviderRating(
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
