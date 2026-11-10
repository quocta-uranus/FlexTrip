import { HttpException, Injectable } from '@nestjs/common';
import {
  Prisma,
  ReviewModerationSource,
  ReviewReportStatus,
  ReviewStatus,
} from '@prisma/client';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import { RequestContext } from '../../../common/request-context';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReviewModerationService } from '../../reviews/review-moderation.service';
import { SystemConfigService } from '../../system-config/system-config.service';
import { toVietnameseDisplayReasons } from '../../reviews/review-moderation-display';
import {
  BulkModerateReviewsDto,
  DismissReportsDto,
  ListAdminReviewsQueryDto,
  ModerateReviewDto,
} from './dto/admin-reviews.dto';

const HOUR_MS = 3_600_000;

/** A hidden review waits from the appeal if there is one, otherwise from when it was hidden. */
const overdueWhere = (cutoff: Date): Prisma.ReviewWhereInput => ({
  status: ReviewStatus.FLAGGED,
  OR: [
    { appealedAt: { lt: cutoff } },
    { appealedAt: null, moderatedAt: { lt: cutoff } },
    { appealedAt: null, moderatedAt: null, createdAt: { lt: cutoff } },
  ],
});

const suspiciousWhere = (threshold: number): Prisma.ReviewWhereInput => ({
  status: ReviewStatus.PUBLISHED,
  suspicionScore: { gte: threshold },
  moderationSource: { not: ReviewModerationSource.ADMIN },
});

@Injectable()
export class AdminReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ReviewModerationService,
    private readonly config: SystemConfigService,
  ) {}

  async list(query: ListAdminReviewsQueryDto) {
    const search = query.search?.trim();
    const [suspicionThreshold, slaHours] = await Promise.all([
      this.config.get('review_suspicion_threshold'),
      this.config.get('review_sla_hours'),
    ]);
    const now = Date.now();
    const cutoff = new Date(now - slaHours * HOUR_MS);
    const where: Prisma.ReviewWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.rating ? { rating: query.rating } : {}),
      ...(query.appealed ? { appealedAt: { not: null } } : {}),
      ...(query.suspicious ? suspiciousWhere(suspicionThreshold) : {}),
      ...(query.overdue ? overdueWhere(cutoff) : {}),
      ...(query.reported
        ? { reports: { some: { status: ReviewReportStatus.OPEN } } }
        : {}),
      ...(search
        ? {
            OR: [
              { comment: { contains: search, mode: 'insensitive' } },
              { author: { name: { contains: search, mode: 'insensitive' } } },
              { target: { name: { contains: search, mode: 'insensitive' } } },
              { listing: { title: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
        ...skipTake(query),
        select: {
          id: true,
          rating: true,
          comment: true,
          status: true,
          sentiment: true,
          spamScore: true,
          toxicityScore: true,
          suspicionScore: true,
          analysisReasons: true,
          moderationSource: true,
          moderationNote: true,
          moderatedAt: true,
          editedAt: true,
          appealedAt: true,
          appealNote: true,
          createdAt: true,
          author: { select: { id: true, name: true, avatarUrl: true } },
          target: { select: { id: true, name: true, avatarUrl: true } },
          listing: { select: { id: true, title: true } },
          reports: {
            where: { status: ReviewReportStatus.OPEN },
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              reason: true,
              details: true,
              createdAt: true,
              reporter: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    const pendingIds = items
      .filter((item) => item.status === 'PENDING')
      .map((item) => item.id);
    const queueStatuses = await this.moderation.getQueueStatuses(pendingIds);
    return paginate(
      items.map((item) => {
        const { analysisReasons, reports, ...publicItem } = item;
        const waitingSince =
          item.status === ReviewStatus.FLAGGED
            ? (item.appealedAt ?? item.moderatedAt ?? item.createdAt)
            : null;
        const slaDueAt = waitingSince
          ? new Date(waitingSince.getTime() + slaHours * HOUR_MS)
          : null;
        return {
          ...publicItem,
          waitingSince,
          slaDueAt,
          overdue: slaDueAt !== null && slaDueAt.getTime() < now,
          openReports: reports,
          suspiciousPublic:
            item.status === ReviewStatus.PUBLISHED &&
            item.moderationSource !== ReviewModerationSource.ADMIN &&
            (item.suspicionScore ?? 0) >= suspicionThreshold,
          analysisSource: this.analysisSource(
            item.moderationSource,
            analysisReasons,
          ),
          displayReasons: toVietnameseDisplayReasons(analysisReasons),
          queueStatus:
            item.status === 'PENDING' ? queueStatuses[item.id].status : null,
          analysisErrorCode:
            item.status === 'PENDING' ? queueStatuses[item.id].errorCode : null,
        };
      }),
      total,
      query,
    );
  }

  /** Counts behind the quick-filter chips; each count uses the same rule as its list filter. */
  async summary() {
    const [suspicionThreshold, slaHours] = await Promise.all([
      this.config.get('review_suspicion_threshold'),
      this.config.get('review_sla_hours'),
    ]);
    const cutoff = new Date(Date.now() - slaHours * HOUR_MS);
    const [flagged, overdue, appealed, reported, suspicious] =
      await this.prisma.$transaction([
        this.prisma.review.count({ where: { status: ReviewStatus.FLAGGED } }),
        this.prisma.review.count({ where: overdueWhere(cutoff) }),
        this.prisma.review.count({
          where: { status: ReviewStatus.FLAGGED, appealedAt: { not: null } },
        }),
        this.prisma.review.count({
          where: { reports: { some: { status: ReviewReportStatus.OPEN } } },
        }),
        this.prisma.review.count({
          where: suspiciousWhere(suspicionThreshold),
        }),
      ]);
    return { flagged, overdue, appealed, reported, suspicious, slaHours };
  }

  /** Each review is decided in its own transaction, so one failure never blocks the rest. */
  async bulkModerate(dto: BulkModerateReviewsDto, context: RequestContext) {
    const succeeded: string[] = [];
    const failed: { id: string; code: string; message: string }[] = [];
    for (const id of dto.ids) {
      try {
        await this.moderation.moderateByAdmin(
          id,
          dto.decision,
          dto.note,
          context,
        );
        succeeded.push(id);
      } catch (error) {
        if (!(error instanceof HttpException)) throw error;
        const response = error.getResponse();
        const details =
          typeof response === 'object'
            ? (response as Record<string, unknown>)
            : {};
        failed.push({
          id,
          code: typeof details.code === 'string' ? details.code : 'ERROR',
          message:
            typeof details.message === 'string'
              ? details.message
              : error.message,
        });
      }
    }
    return { succeeded, failed };
  }

  private analysisSource(
    source: string | null,
    reasons: Prisma.JsonValue | null,
  ):
    | 'RULE'
    | 'AI'
    | 'RULE_AND_AI'
    | 'MODEL'
    | 'RULE_AND_MODEL'
    | 'ADMIN'
    | null {
    if (source === 'ADMIN') return 'ADMIN';
    const values = Array.isArray(reasons) ? reasons : [];
    const hasRule = values.some(
      (reason) => typeof reason === 'string' && reason.startsWith('[RULE]'),
    );
    const hasAi = values.some(
      (reason) => typeof reason === 'string' && reason.startsWith('[AI]'),
    );
    const hasModel = values.some(
      (reason) => typeof reason === 'string' && reason.startsWith('[ML]'),
    );
    if (hasModel) return hasRule ? 'RULE_AND_MODEL' : 'MODEL';
    if (hasRule && hasAi) return 'RULE_AND_AI';
    if (hasRule || source === 'RULE') return 'RULE';
    if (hasAi || source === 'AI') return 'AI';
    return null;
  }

  moderate(id: string, dto: ModerateReviewDto, context: RequestContext) {
    return this.moderation.moderateByAdmin(id, dto.decision, dto.note, context);
  }

  dismissReports(id: string, dto: DismissReportsDto, context: RequestContext) {
    return this.moderation.dismissReports(id, dto.note, context);
  }

  reanalyze(id: string, context: RequestContext) {
    return this.moderation.reanalyze(id, context);
  }
}
