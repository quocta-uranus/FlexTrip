import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { DemandForecast, DemandPoint, PeakPeriod } from './price-ai.types';

type DailyRow = { date: Date; count: bigint };

@Injectable()
export class DemandForecastService {
  constructor(private prisma: PrismaService) {}

  async forecast(
    region: string,
    category: string,
    days: 30 | 60 | 90 = 30,
  ): Promise<DemandForecast> {
    const cityToken = region.split(',').pop()?.trim() ?? region;

    // Pull 180 days of historical bookings grouped by day
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 180);

    const rows = await this.prisma.$queryRaw<DailyRow[]>`
      SELECT
        DATE_TRUNC('day', b."createdAt") AS date,
        COUNT(*)::bigint                 AS count
      FROM "Booking" b
      JOIN "Listing" l ON l.id = b."listingId"
      WHERE l.category = ${category}
        AND LOWER(l.location) LIKE ${`%${cityToken.toLowerCase()}%`}
        AND b."createdAt" >= ${cutoff}
      GROUP BY 1
      ORDER BY 1
    `;

    const historical = this.buildDailyMap(rows);
    const smoothed = this.movingAverage(historical, 7);
    const dowPattern = this.dowPattern(smoothed);
    const monthlyPattern = this.monthlyPattern(smoothed);

    const allPoints: DemandPoint[] = [];

    // Historical portion (last 30 days visible in chart)
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = this.addDays(today, -i);
      const key = this.toKey(d);
      const raw = smoothed.get(key) ?? 0;
      allPoints.push({ date: key, score: this.normalize(raw, smoothed), bookingCount: Math.round(raw), isProjected: false });
    }

    // Projected portion
    const maxRaw = Math.max(...Array.from(smoothed.values()), 1);
    for (let i = 1; i <= days; i++) {
      const d = this.addDays(today, i);
      const key = this.toKey(d);
      const dow = d.getDay();
      const month = d.getMonth();
      const baseline = maxRaw * 0.5;
      const projected = baseline * dowPattern[dow] * monthlyPattern[month];
      const score = this.normalize(projected, smoothed);
      allPoints.push({ date: key, score: Math.round(score), bookingCount: Math.round(projected), isProjected: true });
    }

    const currentScore = allPoints.find((p) => !p.isProjected)?.score ?? 40;
    const trend = this.calcTrend(allPoints.filter((p) => !p.isProjected));
    const peakPeriods = this.detectPeaks(allPoints.filter((p) => p.isProjected));

    return { region, category, days, points: allPoints, peakPeriods, currentScore, trend };
  }

  private buildDailyMap(rows: DailyRow[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(this.toKey(new Date(r.date)), Number(r.count));
    }
    return map;
  }

  private movingAverage(map: Map<string, number>, window: number): Map<string, number> {
    const keys = Array.from(map.keys()).sort();
    const result = new Map<string, number>();
    for (let i = 0; i < keys.length; i++) {
      let sum = 0;
      let cnt = 0;
      for (let j = Math.max(0, i - window + 1); j <= i; j++) {
        sum += map.get(keys[j]) ?? 0;
        cnt++;
      }
      result.set(keys[i], sum / cnt);
    }
    return result;
  }

  private dowPattern(map: Map<string, number>): Record<number, number> {
    const totals = Array(7).fill(0);
    const counts = Array(7).fill(0);
    for (const [key, val] of map) {
      const dow = new Date(key).getDay();
      totals[dow] += val;
      counts[dow]++;
    }
    const avgs = totals.map((t, i) => (counts[i] > 0 ? t / counts[i] : 1));
    const mean = avgs.reduce((a, b) => a + b, 0) / 7 || 1;
    return Object.fromEntries(avgs.map((a, i) => [i, a / mean]));
  }

  private monthlyPattern(map: Map<string, number>): Record<number, number> {
    const totals = Array(12).fill(0);
    const counts = Array(12).fill(0);
    for (const [key, val] of map) {
      const month = new Date(key).getMonth();
      totals[month] += val;
      counts[month]++;
    }
    const avgs = totals.map((t, i) => (counts[i] > 0 ? t / counts[i] : 1));
    const mean = avgs.reduce((a, b) => a + b, 0) / 12 || 1;
    return Object.fromEntries(avgs.map((a, i) => [i, a / mean]));
  }

  private normalize(value: number, map: Map<string, number>): number {
    const max = Math.max(...Array.from(map.values()), 1);
    return Math.min(100, Math.max(5, Math.round((value / max) * 100)));
  }

  private calcTrend(points: DemandPoint[]): 'UP' | 'DOWN' | 'FLAT' {
    if (points.length < 7) return 'FLAT';
    const half = Math.floor(points.length / 2);
    const first = points.slice(0, half).reduce((s, p) => s + p.score, 0) / half;
    const last = points.slice(-half).reduce((s, p) => s + p.score, 0) / half;
    if (last > first * 1.1) return 'UP';
    if (last < first * 0.9) return 'DOWN';
    return 'FLAT';
  }

  private detectPeaks(projected: DemandPoint[]): PeakPeriod[] {
    const threshold = 65;
    const peaks: PeakPeriod[] = [];
    let start: string | null = null;
    let scores: number[] = [];

    for (const p of projected) {
      if (p.score >= threshold) {
        if (!start) start = p.date;
        scores.push(p.score);
      } else if (start) {
        const prev = projected[projected.indexOf(p) - 1];
        peaks.push({
          start,
          end: prev?.date ?? start,
          avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          label: this.peakLabel(start),
        });
        start = null;
        scores = [];
      }
    }
    if (start && scores.length > 0) {
      peaks.push({
        start,
        end: projected[projected.length - 1].date,
        avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        label: this.peakLabel(start),
      });
    }
    return peaks.slice(0, 5);
  }

  private peakLabel(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { month: 'long', day: 'numeric' });
  }

  private toKey(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }
}
