import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingStatus, DisputeStatus, KycStatus, ListingFlagStatus, ListingStatus, PaymentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { DateRangeQueryDto, resolveRange, startOfTodayVn } from '../../../common/dto/date-range.dto';
import { toNumber } from '../../../common/money.util';
import { pctChange, round1 } from '../../../common/stats.util';
import { AUDIT_LOG_INCLUDE, toAuditLogItem } from '../../audit/audit-log.view';
import { TimeseriesQueryDto } from './dto/admin-analytics.dto';

const DAY = 24 * 3600_000;
const VN_OFFSET = Prisma.sql`INTERVAL '7 hours'`;

interface Range { from: Date; to: Date }

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private async metrics({ from, to }: Range, prev: Range) {
    const createdAt = { gte: from, lte: to };
    const [paid, bookings, cancelled, active, newTravelers, newProviders, repeat, churn] = await Promise.all([
      this.prisma.payment.aggregate({ where: { status: PaymentStatus.PAID, createdAt }, _sum: { totalAmount: true, platformFee: true }, _count: { _all: true } }),
      this.prisma.booking.count({ where: { createdAt } }),
      this.prisma.booking.count({ where: { createdAt, status: BookingStatus.CANCELLED } }),
      this.prisma.$queryRaw<{ n: number }[]>`SELECT COUNT(DISTINCT "userId")::int AS n FROM "AuthSession" WHERE "lastUsedAt" BETWEEN ${from} AND ${to}`,
      this.prisma.user.count({ where: { createdAt, roles: { some: { role: Role.TRAVELER } } } }),
      this.prisma.user.count({ where: { createdAt, roles: { some: { role: Role.PROVIDER } } } }),
      this.prisma.$queryRaw<{ n: number }[]>`
        SELECT COUNT(*)::int AS n FROM (
          SELECT "travelerId" FROM "Booking" WHERE "createdAt" BETWEEN ${from} AND ${to}
          GROUP BY "travelerId" HAVING COUNT(*) >= 2) t`,
      this.prisma.$queryRaw<{ n: number }[]>`
        SELECT COUNT(DISTINCT p."travelerId")::int AS n FROM "Booking" p
        WHERE p."createdAt" BETWEEN ${prev.from} AND ${prev.to}
          AND NOT EXISTS (SELECT 1 FROM "Booking" c WHERE c."travelerId" = p."travelerId" AND c."createdAt" BETWEEN ${from} AND ${to})`,
    ]);
    const revenue = toNumber(paid._sum.totalAmount) ?? 0;
    return {
      revenue,
      commission: toNumber(paid._sum.platformFee) ?? 0,
      paidCount: (paid._count as { _all: number })._all,
      bookings,
      cancellationRate: bookings ? round1((cancelled / bookings) * 100) : 0,
      activeUsers: active[0].n,
      newTravelers, newProviders,
      repeatBookers: repeat[0].n,
      churnedUsers: churn[0].n,
    };
  }

  async overview(q: DateRangeQueryDto) {
    const r = resolveRange(q, 30);
    const cur: Range = { from: r.from, to: r.to };
    const prev: Range = { from: r.prevFrom, to: r.prevTo };
    const length = r.to.getTime() - r.from.getTime();
    const prevPrev: Range = { from: new Date(r.prevFrom.getTime() - length - 1), to: new Date(r.prevFrom.getTime() - 1) };
    const [c, p, rating, providerCount, listingCount, byCategory] = await Promise.all([
      this.metrics(cur, prev),
      this.metrics(prev, prevPrev),
      this.prisma.review.aggregate({ where: { createdAt: { gte: r.from, lte: r.to } }, _avg: { rating: true } }),
      this.prisma.userRole.count({ where: { role: Role.PROVIDER } }),
      this.prisma.listing.count({ where: { status: ListingStatus.ACTIVE } }),
      this.prisma.$queryRaw<{ category: string; revenue: Prisma.Decimal }[]>`
        SELECT l.category, SUM(p.amount) AS revenue
        FROM "Payment" p JOIN "Booking" b ON b.id = p."bookingId" JOIN "Listing" l ON l.id = b."listingId"
        WHERE p.status::text = 'PAID' AND p."createdAt" BETWEEN ${r.from} AND ${r.to}
        GROUP BY l.category ORDER BY revenue DESC`,
    ]);
    const kpi = (k: keyof typeof c) => ({ value: c[k], change: pctChange(c[k], p[k]) });
    const categoryTotal = byCategory.reduce((n, x) => n + x.revenue.toNumber(), 0);
    return {
      from: r.from, to: r.to,
      kpis: {
        totalRevenue: kpi('revenue'),
        platformCommission: kpi('commission'),
        activeUsers: kpi('activeUsers'),
        cancellationRate: kpi('cancellationRate'),
      },
      topMetrics: {
        avgBookingValue: c.paidCount ? Math.round(c.revenue / c.paidCount) : 0,
        totalBookings: c.bookings,
        avgRating: rating._avg.rating === null ? null : round1(rating._avg.rating),
        providerCount, listingCount,
      },
      revenueByCategory: byCategory.map((x) => ({
        category: x.category, revenue: x.revenue.toNumber(),
        percent: categoryTotal ? round1((x.revenue.toNumber() / categoryTotal) * 100) : 0,
      })),
      userGrowth: {
        newTravelers: kpi('newTravelers'),
        newProviders: kpi('newProviders'),
        repeatBookers: kpi('repeatBookers'),
        churnedUsers: kpi('churnedUsers'),
      },
    };
  }

  async timeseries(q: TimeseriesQueryDto) {
    const r = resolveRange(q, 30);
    if (q.granularity === 'day' && (r.to.getTime() - r.from.getTime()) / DAY > 400)
      throw new BadRequestException({ code: 'RANGE_TOO_LARGE', message: 'Khoảng thời gian quá dài cho chế độ theo ngày.' });
    const unit = q.granularity;
    const step = `1 ${unit}`;
    // Buckets are computed in Vietnam local time (UTC+7).
    const rows = await this.prisma.$queryRaw<{ bucket: Date; revenue: Prisma.Decimal | null; bookings: number; newUsers: number }[]>`
      WITH buckets AS (
        SELECT generate_series(
          date_trunc(${unit}::text, ${r.from}::timestamp + ${VN_OFFSET}),
          date_trunc(${unit}::text, ${r.to}::timestamp + ${VN_OFFSET}),
          ${step}::interval) AS bucket
      )
      SELECT b.bucket,
        (SELECT SUM(p.amount) FROM "Payment" p WHERE p.status::text = 'PAID'
           AND p."createdAt" BETWEEN ${r.from} AND ${r.to}
           AND date_trunc(${unit}::text, p."createdAt" + ${VN_OFFSET}) = b.bucket) AS revenue,
        (SELECT COUNT(*)::int FROM "Booking" k WHERE k."createdAt" BETWEEN ${r.from} AND ${r.to}
           AND date_trunc(${unit}::text, k."createdAt" + ${VN_OFFSET}) = b.bucket) AS bookings,
        (SELECT COUNT(*)::int FROM "User" u WHERE u."createdAt" BETWEEN ${r.from} AND ${r.to}
           AND date_trunc(${unit}::text, u."createdAt" + ${VN_OFFSET}) = b.bucket) AS "newUsers"
      FROM buckets b ORDER BY b.bucket`;
    return rows.map((x) => ({
      bucket: x.bucket.toISOString().slice(0, 10),
      revenue: toNumber(x.revenue) ?? 0,
      bookings: x.bookings,
      newUsers: x.newUsers,
    }));
  }

  async dashboard() {
    const today = startOfTodayVn();
    const [openDisputes, openFlags, pendingKyc, disputesClosed, flagsResolved, recent] = await Promise.all([
      this.prisma.dispute.count({ where: { status: { notIn: [DisputeStatus.RESOLVED, DisputeStatus.REJECTED] } } }),
      this.prisma.listingFlag.count({ where: { status: ListingFlagStatus.OPEN } }),
      this.prisma.kycApplication.count({ where: { status: KycStatus.PENDING } }),
      this.prisma.dispute.count({ where: { resolvedAt: { gte: today } } }),
      this.prisma.listingFlag.count({ where: { resolvedAt: { gte: today } } }),
      this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: AUDIT_LOG_INCLUDE }),
    ]);
    return { openDisputes, openFlags, pendingKyc, resolvedToday: disputesClosed + flagsResolved, recentActivity: recent.map(toAuditLogItem) };
  }
}
