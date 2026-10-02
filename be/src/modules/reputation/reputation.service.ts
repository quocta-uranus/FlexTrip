import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, CancelledBy, ReviewStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';

export type ReputationBadgeCode = 'TRUSTED_PROVIDER' | 'RELIABLE_TRAVELER';

export interface PublicReputationBadge {
  code: ReputationBadgeCode;
  label: string;
}

interface Thresholds {
  providerCompleted: number;
  providerRating: number;
  providerReviews: number;
  travelerCompleted: number;
  travelerCancelRate: number;
}

export interface ReputationMetric {
  key: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  operator: 'GTE' | 'LTE';
  met: boolean;
  progress: number;
}

export interface ReputationBadgeDetail {
  code: ReputationBadgeCode;
  label: string;
  description: string;
  achieved: boolean;
  progress: number;
  metrics: ReputationMetric[];
  reasons: string[];
}

const BADGE_LABELS: Record<ReputationBadgeCode, string> = {
  TRUSTED_PROVIDER: 'Provider uy tín',
  RELIABLE_TRAVELER: 'Traveler đáng tin cậy',
};

@Injectable()
export class ReputationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: SystemConfigService,
  ) {}

  async getMine(userId: string) {
    const roles = await this.getRoles(userId);
    const thresholds = await this.getThresholds();
    const badges = await this.calculateForRoles(userId, roles, thresholds);
    return { userId, badges };
  }

  async getPublic(userId: string) {
    const details = await this.getMine(userId);
    return {
      userId,
      badges: details.badges
        .filter((badge) => badge.achieved)
        .map(({ code, label }) => ({ code, label })),
    };
  }

  async getPublicBadgesForUsers(
    userIds: string[],
  ): Promise<Record<string, PublicReputationBadge[]>> {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (ids.length === 0) return {};
    const [thresholds, users] = await Promise.all([
      this.getThresholds(),
      this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, roles: { select: { role: true } } },
      }),
    ]);
    const entries = await Promise.all(
      users.map(async (user) => {
        const details = await this.calculateForRoles(
          user.id,
          user.roles.map(({ role }) => role),
          thresholds,
        );
        const badges = details
          .filter((badge) => badge.achieved)
          .map(({ code, label }) => ({ code, label }));
        return [user.id, badges] as const;
      }),
    );
    return Object.fromEntries(entries) as Record<
      string,
      PublicReputationBadge[]
    >;
  }

  private async getRoles(userId: string): Promise<Role[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: { select: { role: true } } },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return user.roles.map(({ role }) => role);
  }

  private async getThresholds(): Promise<Thresholds> {
    const [
      providerCompleted,
      providerRating,
      providerReviews,
      travelerCompleted,
      travelerCancelRate,
    ] = await Promise.all([
      this.config.get('trusted_provider_min_completed'),
      this.config.get('trusted_provider_min_rating'),
      this.config.get('trusted_provider_min_reviews'),
      this.config.get('reliable_traveler_min_completed'),
      this.config.get('reliable_traveler_max_cancel_rate'),
    ]);
    return {
      providerCompleted,
      providerRating,
      providerReviews,
      travelerCompleted,
      travelerCancelRate,
    };
  }

  private async calculateForRoles(
    userId: string,
    roles: Role[],
    thresholds: Thresholds,
  ) {
    const tasks: Array<Promise<ReputationBadgeDetail>> = [];
    if (roles.includes(Role.PROVIDER))
      tasks.push(this.calculateProvider(userId, thresholds));
    if (roles.includes(Role.TRAVELER))
      tasks.push(this.calculateTraveler(userId, thresholds));
    return Promise.all(tasks);
  }

  private async calculateProvider(
    userId: string,
    thresholds: Thresholds,
  ): Promise<ReputationBadgeDetail> {
    const [completed, reviews] = await Promise.all([
      this.prisma.booking.count({
        where: {
          listing: { providerId: userId },
          status: BookingStatus.COMPLETED,
        },
      }),
      this.prisma.review.aggregate({
        where: { targetId: userId, status: ReviewStatus.PUBLISHED },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);
    const rating = Number((reviews._avg.rating ?? 0).toFixed(2));
    const reviewCount = reviews._count._all;
    const metrics = [
      this.gteMetric(
        'completedBookings',
        'Booking hoàn thành',
        completed,
        thresholds.providerCompleted,
        'booking',
      ),
      this.gteMetric(
        'averageRating',
        'Điểm đánh giá trung bình',
        rating,
        thresholds.providerRating,
        'sao',
      ),
      this.gteMetric(
        'publishedReviews',
        'Review công khai',
        reviewCount,
        thresholds.providerReviews,
        'review',
      ),
    ];
    return this.toBadge(
      'TRUSTED_PROVIDER',
      'Provider có lịch sử giao dịch và đánh giá tốt.',
      metrics,
    );
  }

  private async calculateTraveler(
    userId: string,
    thresholds: Thresholds,
  ): Promise<ReputationBadgeDetail> {
    const [completed, selfCancelled] = await Promise.all([
      this.prisma.booking.count({
        where: { travelerId: userId, status: BookingStatus.COMPLETED },
      }),
      this.prisma.booking.count({
        where: {
          travelerId: userId,
          status: BookingStatus.CANCELLED,
          cancelledBy: CancelledBy.TRAVELER,
        },
      }),
    ]);
    const eligibleBookings = completed + selfCancelled;
    const cancelRate =
      eligibleBookings === 0
        ? 0
        : Number(((selfCancelled / eligibleBookings) * 100).toFixed(2));
    const metrics = [
      this.gteMetric(
        'completedBookings',
        'Booking hoàn thành',
        completed,
        thresholds.travelerCompleted,
        'booking',
      ),
      this.lteMetric(
        'selfCancellationRate',
        'Tỷ lệ tự hủy',
        cancelRate,
        thresholds.travelerCancelRate,
        '%',
      ),
    ];
    return this.toBadge(
      'RELIABLE_TRAVELER',
      'Traveler có lịch sử hoàn thành chuyến thuê đáng tin cậy.',
      metrics,
    );
  }

  private gteMetric(
    key: string,
    label: string,
    current: number,
    target: number,
    unit: string,
  ): ReputationMetric {
    return {
      key,
      label,
      current,
      target,
      unit,
      operator: 'GTE',
      met: current >= target,
      progress: target <= 0 ? 100 : Math.min(100, (current / target) * 100),
    };
  }

  private lteMetric(
    key: string,
    label: string,
    current: number,
    target: number,
    unit: string,
  ): ReputationMetric {
    return {
      key,
      label,
      current,
      target,
      unit,
      operator: 'LTE',
      met: current <= target,
      progress: current <= target ? 100 : Math.max(0, (target / current) * 100),
    };
  }

  private toBadge(
    code: ReputationBadgeCode,
    description: string,
    metrics: ReputationMetric[],
  ): ReputationBadgeDetail {
    const achieved = metrics.every((metric) => metric.met);
    return {
      code,
      label: BADGE_LABELS[code],
      description,
      achieved,
      progress: Math.round(
        Math.min(...metrics.map((metric) => metric.progress)),
      ),
      metrics: metrics.map((metric) => ({
        ...metric,
        progress: Math.round(metric.progress),
      })),
      reasons: metrics
        .filter((metric) => !metric.met)
        .map((metric) =>
          metric.operator === 'GTE'
            ? `${metric.label}: cần tối thiểu ${metric.target} ${metric.unit}, hiện có ${metric.current}.`
            : `${metric.label}: cần không quá ${metric.target}${metric.unit}, hiện là ${metric.current}${metric.unit}.`,
        ),
    };
  }
}
