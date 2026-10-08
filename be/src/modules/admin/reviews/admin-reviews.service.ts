import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import { RequestContext } from '../../../common/request-context';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReviewModerationService } from '../../reviews/review-moderation.service';
import { toVietnameseDisplayReasons } from '../../reviews/review-moderation-display';
import {
  ListAdminReviewsQueryDto,
  ModerateReviewDto,
} from './dto/admin-reviews.dto';

@Injectable()
export class AdminReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ReviewModerationService,
  ) {}

  async list(query: ListAdminReviewsQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.ReviewWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.rating ? { rating: query.rating } : {}),
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
        orderBy: { createdAt: 'desc' },
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
          createdAt: true,
          author: { select: { id: true, name: true, avatarUrl: true } },
          target: { select: { id: true, name: true, avatarUrl: true } },
          listing: { select: { id: true, title: true } },
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
        const { analysisReasons, ...publicItem } = item;
        return {
          ...publicItem,
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

  private analysisSource(
    source: string | null,
    reasons: Prisma.JsonValue | null,
  ): 'RULE' | 'AI' | 'RULE_AND_AI' | 'ADMIN' | null {
    if (source === 'ADMIN') return 'ADMIN';
    const values = Array.isArray(reasons) ? reasons : [];
    const hasRule = values.some(
      (reason) => typeof reason === 'string' && reason.startsWith('[RULE]'),
    );
    const hasAi = values.some(
      (reason) => typeof reason === 'string' && reason.startsWith('[AI]'),
    );
    if (hasRule && hasAi) return 'RULE_AND_AI';
    if (hasRule || source === 'RULE') return 'RULE';
    if (hasAi || source === 'AI') return 'AI';
    return null;
  }

  moderate(id: string, dto: ModerateReviewDto, context: RequestContext) {
    return this.moderation.moderateByAdmin(id, dto.decision, dto.note, context);
  }

  reanalyze(id: string, context: RequestContext) {
    return this.moderation.reanalyze(id, context);
  }
}
