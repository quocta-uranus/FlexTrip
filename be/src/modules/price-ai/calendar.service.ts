import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CalendarDayScore, DemandCalendarResult } from './price-ai.types';

type DayRow = { day_date: Date; count: bigint };

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async getMonth(
    listingId: string,
    year: number,
    month: number, // 1–12
  ): Promise<DemandCalendarResult> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, category: true, location: true, createdAt: true },
    });
    if (!listing) throw new NotFoundException('Listing không tồn tại');

    const cityToken = listing.location.split(',').pop()?.trim() ?? listing.location;
    const today = new Date();
    const targetMonthStart = new Date(year, month - 1, 1);
    const targetMonthEnd = new Date(year, month, 0); // last day of month

    // Pull 1 year of booking history for the listing + similar (market signal)
    const d365 = new Date(today.getTime() - 365 * 86400_000);

    // Listing-specific bookings by day (historic)
    const ownRows = await this.prisma.$queryRaw<DayRow[]>`
      SELECT
        DATE_TRUNC('day', "startDate")::date AS day_date,
        COUNT(*)::bigint                      AS count
      FROM "Booking"
      WHERE "listingId" = ${listingId}
        AND "startDate" >= ${d365}
      GROUP BY 1
      ORDER BY 1
    `;

    // Market bookings by day (for same category/region) — used as fallback
    const marketRows = await this.prisma.$queryRaw<DayRow[]>`
      SELECT
        DATE_TRUNC('day', b."startDate")::date AS day_date,
        COUNT(*)::bigint                        AS count
      FROM "Booking" b
      JOIN "Listing" l ON l.id = b."listingId"
      WHERE l.category = ${listing.category}
        AND LOWER(l.location) LIKE ${`%${cityToken.toLowerCase()}%`}
        AND b."startDate" >= ${d365}
      GROUP BY 1
      ORDER BY 1
    `;

    // Build patterns
    const ownMap = this.toMap(ownRows);
    const marketMap = this.toMap(marketRows);

    const hasOwnData = ownMap.size >= 5;
    const primaryMap = hasOwnData ? ownMap : marketMap;

    const dowPattern = this.calcDowPattern(primaryMap);   // [0..6] multipliers
    const monthPattern = this.calcMonthPattern(primaryMap); // [0..11] multipliers
    const maxCount = Math.max(...Array.from(primaryMap.values()), 1);

    const daysInMonth = targetMonthEnd.getDate();
    const days: CalendarDayScore[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const dateKey = this.toKey(date);
      const isPast = date < today;
      const isToday = this.toKey(date) === this.toKey(today);

      if (isPast || isToday) {
        // Use actual data if available
        const actual = ownMap.get(dateKey) ?? marketMap.get(dateKey) ?? 0;
        const score = actual > 0
          ? Math.min(100, Math.round((actual / maxCount) * 100))
          : this.projectScore(date, dowPattern, monthPattern, maxCount);

        days.push({
          date: dateKey,
          score,
          bookingCount: actual,
          isProjected: actual === 0,
        });
      } else {
        // Project future days
        const score = this.projectScore(date, dowPattern, monthPattern, maxCount);
        days.push({ date: dateKey, score, bookingCount: 0, isProjected: true });
      }
    }

    return { listingId, year, month, days };
  }

  private projectScore(
    date: Date,
    dowPattern: number[],
    monthPattern: number[],
    maxCount: number,
  ): number {
    const dow = date.getDay();
    const m = date.getMonth();
    const baseline = maxCount * 0.4;
    const projected = baseline * dowPattern[dow] * monthPattern[m];
    return Math.min(100, Math.max(5, Math.round((projected / maxCount) * 100)));
  }

  private toMap(rows: DayRow[]): Map<string, number> {
    const m = new Map<string, number>();
    for (const r of rows) {
      m.set(this.toKey(new Date(r.day_date)), Number(r.count));
    }
    return m;
  }

  private calcDowPattern(map: Map<string, number>): number[] {
    const totals = Array(7).fill(0);
    const counts = Array(7).fill(0);
    for (const [key, val] of map) {
      const dow = new Date(key).getDay();
      totals[dow] += val;
      counts[dow]++;
    }
    const avgs = totals.map((t, i) => (counts[i] > 0 ? t / counts[i] : 1));
    const mean = avgs.reduce((a, b) => a + b, 0) / 7 || 1;
    return avgs.map((a) => a / mean);
  }

  private calcMonthPattern(map: Map<string, number>): number[] {
    const totals = Array(12).fill(0);
    const counts = Array(12).fill(0);
    for (const [key, val] of map) {
      const m = new Date(key).getMonth();
      totals[m] += val;
      counts[m]++;
    }
    const avgs = totals.map((t, i) => (counts[i] > 0 ? t / counts[i] : 1));
    const mean = avgs.reduce((a, b) => a + b, 0) / 12 || 1;
    return avgs.map((a) => a / mean);
  }

  private toKey(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
