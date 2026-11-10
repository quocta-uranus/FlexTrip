import { Injectable, Logger } from '@nestjs/common';
import { BookingStatus, CancelledBy, NotificationType, Prisma, ReviewSentiment, ReviewStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { ReputationService } from '../reputation/reputation.service';
import { GroqJsonService } from '../support/groq-json.service';
import { INCENTIVE_VALID_HOURS } from './provider-incentives.constants';
import { ProviderStats, ScoreMetric, scoreProvider, templateSummary } from './scoring';

@Injectable()
export class ProviderIncentivesService {
  private readonly logger = new Logger(ProviderIncentivesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: SystemConfigService,
    private readonly reputation: ReputationService,
    private readonly groq: GroqJsonService,
  ) {}

  /** Job đêm: tính lại cho mọi provider. Lỗi một provider không dừng cả lượt. */
  async runNightly() {
    const providers = await this.prisma.user.findMany({
      where: { roles: { some: { role: Role.PROVIDER } }, status: 'ACTIVE' },
      select: { id: true },
    });
    let topRated = 0;
    let failed = 0;
    for (const { id } of providers) {
      try {
        if ((await this.computeFor(id)).isTopRated) topRated++;
      } catch (e) {
        failed++;
        this.logger.error(`Không tính được ưu đãi cho provider ${id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return { processed: providers.length, topRated, failed };
  }

  async computeFor(providerId: string) {
    const [minScore, discountPct, stats, badges] = await Promise.all([
      this.config.get('top_rated_min_score'),
      this.config.get('top_rated_fee_discount_pct'),
      this.loadStats(providerId),
      this.reputation.getPublic(providerId),
    ]);
    const { score, metrics } = scoreProvider(stats);
    const trusted = badges.badges.some((b) => b.code === 'TRUSTED_PROVIDER');
    const isTopRated = trusted && score >= minScore;

    const previous = await this.prisma.providerIncentive.findUnique({ where: { providerId }, select: { isTopRated: true } });
    const summary = await this.explain(isTopRated, trusted, score, minScore, metrics);
    const data = {
      isTopRated,
      score,
      feeDiscountPct: isTopRated ? discountPct : 0,
      reasons: { trusted, minScore, metrics, summary } as unknown as Prisma.InputJsonValue,
      validUntil: new Date(Date.now() + INCENTIVE_VALID_HOURS * 3_600_000),
      computedAt: new Date(),
    };
    const result = await this.prisma.providerIncentive.upsert({ where: { providerId }, create: { providerId, ...data }, update: data });

    if (previous?.isTopRated !== isTopRated && (isTopRated || previous)) {
      await this.notify(providerId, isTopRated, discountPct);
    }
    return result;
  }

  async mine(providerId: string) {
    const row = await this.prisma.providerIncentive.findUnique({ where: { providerId } });
    if (!row) return { computed: false as const };
    const active = row.validUntil.getTime() > Date.now();
    return {
      computed: true as const,
      isTopRated: row.isTopRated && active,
      score: row.score.toNumber(),
      feeDiscountPct: row.isTopRated && active ? row.feeDiscountPct.toNumber() : 0,
      validUntil: row.validUntil,
      computedAt: row.computedAt,
      reasons: row.reasons,
    };
  }

  async listTopRated() {
    const rows = await this.prisma.providerIncentive.findMany({
      where: { isTopRated: true, validUntil: { gt: new Date() } },
      orderBy: { score: 'desc' },
      include: { provider: { select: { id: true, name: true, email: true } } },
    });
    return rows.map((r) => ({
      providerId: r.providerId, name: r.provider.name, email: r.provider.email,
      score: r.score.toNumber(), feeDiscountPct: r.feeDiscountPct.toNumber(), validUntil: r.validUntil,
    }));
  }

  private async loadStats(providerId: string): Promise<ProviderStats> {
    const [reviews, positive, completed, providerCancelled, profile] = await Promise.all([
      this.prisma.review.aggregate({ where: { targetId: providerId, status: ReviewStatus.PUBLISHED }, _avg: { rating: true }, _count: { _all: true } }),
      this.prisma.review.count({ where: { targetId: providerId, status: ReviewStatus.PUBLISHED, sentiment: ReviewSentiment.POSITIVE } }),
      this.prisma.booking.count({ where: { listing: { providerId }, status: BookingStatus.COMPLETED } }),
      this.prisma.booking.count({ where: { listing: { providerId }, status: BookingStatus.CANCELLED, cancelledBy: CancelledBy.PROVIDER } }),
      this.prisma.providerProfile.findUnique({ where: { userId: providerId }, select: { cancellationStrikes: true, responseTimeH: true } }),
    ]);
    return {
      ratingAvg: reviews._avg.rating ?? 0,
      reviewCount: reviews._count._all,
      positiveReviews: positive,
      completed,
      providerCancelled,
      strikes: profile?.cancellationStrikes ?? 0,
      responseTimeH: profile?.responseTimeH ?? 24,
    };
  }

  /** LLM chỉ viết lời giải thích; việc có ưu đãi hay không đã được quyết định trước đó bằng điểm. */
  private async explain(isTopRated: boolean, trusted: boolean, score: number, minScore: number, metrics: ScoreMetric[]) {
    const fallback = !trusted && score >= minScore
      ? `Bạn đạt ${score}/100 điểm nhưng chưa có huy hiệu Provider uy tín, hãy hoàn thành thêm đơn và nhận thêm đánh giá.`
      : templateSummary(isTopRated, score, minScore, metrics);
    const out = await this.groq.complete({
      name: 'provider_incentive_explanation',
      system: 'Bạn viết một đoạn giải thích ngắn (tối đa 2 câu, tiếng Việt, giọng thân thiện) cho chủ cho thuê về kết quả xét ưu đãi top-rated. Chỉ dùng số liệu được cung cấp, không hứa hẹn thêm.',
      user: JSON.stringify({ isTopRated, hasTrustedBadge: trusted, score, minScore, metrics: metrics.map((m) => ({ label: m.label, value: m.display, normalized: Math.round(m.value) })) }),
      schema: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'], additionalProperties: false },
      maxTokens: 300,
    });
    const text = (out as { summary?: unknown } | null)?.summary;
    return typeof text === 'string' && text.trim() && text.length <= 400 ? text.trim() : fallback;
  }

  private notify(providerId: string, gained: boolean, discountPct: number) {
    return this.prisma.notification.create({
      data: {
        userId: providerId,
        type: NotificationType.SYSTEM,
        title: gained ? 'Bạn đã đạt Provider top-rated' : 'Ưu đãi top-rated đã kết thúc',
        body: gained
          ? `Phí nền tảng của bạn được giảm ${discountPct}% điểm cho các đơn hoàn thành từ bây giờ.`
          : 'Điểm của bạn hiện dưới ngưỡng top-rated nên phí nền tảng trở về mức chuẩn. Xem chi tiết ở trang Ưu đãi.',
        data: { href: '/dashboard/incentives' },
      },
    }).catch((e: unknown) => this.logger.warn(`Không gửi được thông báo top-rated: ${e instanceof Error ? e.message : String(e)}`));
  }
}
