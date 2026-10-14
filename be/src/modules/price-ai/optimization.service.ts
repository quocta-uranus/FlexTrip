import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  OptimizationDataPoint,
  OptimizationResult,
  RevenueCurvePoint,
} from './price-ai.types';

type MarketRow = {
  listing_id: string;
  price: number;
  booking_count: bigint;
  active_days: bigint;
};

@Injectable()
export class OptimizationService {
  constructor(private prisma: PrismaService) {}

  async compute(listingId: string): Promise<OptimizationResult> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, price: true, category: true, location: true, createdAt: true },
    });
    if (!listing) throw new NotFoundException('Listing không tồn tại');

    const currentPrice = Number(listing.price);
    const cityToken = listing.location.split(',').pop()?.trim() ?? listing.location;
    const d180 = new Date(Date.now() - 180 * 86400_000);

    // Get market-level data: price vs booking_count for similar listings
    // This gives us a correlation even if the listing itself is new
    const marketRows = await this.prisma.$queryRaw<MarketRow[]>`
      SELECT
        l.id                   AS listing_id,
        l.price::float         AS price,
        COUNT(b.id)::bigint    AS booking_count,
        GREATEST(
          EXTRACT(EPOCH FROM (NOW() - GREATEST(l."createdAt", ${d180}))) / 86400,
          1
        )::bigint              AS active_days
      FROM "Listing" l
      LEFT JOIN "Booking" b
        ON b."listingId" = l.id AND b."createdAt" >= ${d180}
      WHERE l.category = ${listing.category}
        AND LOWER(l.location) LIKE ${`%${cityToken.toLowerCase()}%`}
        AND l.status = 'ACTIVE'
      GROUP BY l.id, l.price
      HAVING COUNT(b.id) >= 0
      ORDER BY l.price
    `;

    // Also pull this listing's own price history + booking rates
    const ownHistory = await this.prisma.priceHistory.findMany({
      where: { listingId },
      orderBy: { createdAt: 'asc' },
    });

    const dataPoints = this.buildDataPoints(marketRows, listingId, currentPrice);
    const hasSufficientData = dataPoints.length >= 5;

    if (!hasSufficientData) {
      return {
        listingId,
        currentPrice,
        optimalPrice: currentPrice,
        expectedRevenueGain: 0,
        dataPoints,
        revenueCurve: this.buildRevenueCurveFlat(currentPrice),
        correlation: 0,
        hasSufficientData: false,
        insight: 'Chưa đủ dữ liệu trong khu vực. Tích lũy thêm dữ liệu booking để nhận phân tích.',
      };
    }

    const { a, b } = this.linearRegression(dataPoints);
    const correlation = this.pearson(dataPoints);

    // Revenue = price * bookingRate(price) = price * (a*price + b)
    // dR/dp = 2a*p + b = 0 → p* = -b/(2a)
    const prices = dataPoints.map((d) => d.price);
    const pMin = Math.min(...prices) * 0.8;
    const pMax = Math.max(...prices) * 1.2;

    let optimalPrice: number;
    if (a < 0) {
      // Downward-sloping demand — valid for revenue maximization
      const unclamped = -b / (2 * a);
      optimalPrice = Math.min(pMax, Math.max(pMin, unclamped));
    } else {
      // Flat or positive correlation — use p75
      optimalPrice = currentPrice;
    }
    optimalPrice = Math.round(optimalPrice / 1000) * 1000;

    const currentRevenue = currentPrice * Math.max(0, a * currentPrice + b);
    const optimalRevenue = optimalPrice * Math.max(0, a * optimalPrice + b);
    const expectedRevenueGain =
      currentRevenue > 0
        ? Math.round(((optimalRevenue - currentRevenue) / currentRevenue) * 100)
        : 0;

    const revenueCurve = this.buildRevenueCurve(a, b, pMin, pMax);

    // Override optimalPrice from own history if we have it
    if (ownHistory.length >= 3) {
      const ownPoints = this.buildOwnHistoryPoints(ownHistory);
      if (ownPoints.length >= 3) {
        dataPoints.push(...ownPoints);
      }
    }

    const insight = this.buildInsight(currentPrice, optimalPrice, expectedRevenueGain, correlation);

    return {
      listingId,
      currentPrice,
      optimalPrice,
      expectedRevenueGain,
      dataPoints,
      revenueCurve,
      correlation: Math.round(correlation * 100) / 100,
      hasSufficientData: true,
      insight,
    };
  }

  private buildDataPoints(
    rows: MarketRow[],
    targetId: string,
    currentPrice: number,
  ): OptimizationDataPoint[] {
    const points: OptimizationDataPoint[] = [];
    for (const r of rows) {
      const price = Number(r.price);
      const bookingCount = Number(r.booking_count);
      const activeDays = Number(r.active_days);
      if (price <= 0 || activeDays <= 0) continue;
      const bookingRate = bookingCount / activeDays;
      points.push({ price, bookingRate });
    }
    return points;
  }

  private buildOwnHistoryPoints(
    history: Array<{ price: unknown; bookingRate: unknown }>,
  ): OptimizationDataPoint[] {
    return history
      .filter((h) => h.bookingRate != null)
      .map((h) => ({
        price: Number(h.price),
        bookingRate: Number(h.bookingRate),
      }));
  }

  private linearRegression(points: OptimizationDataPoint[]): { a: number; b: number } {
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.price, 0);
    const sumY = points.reduce((s, p) => s + p.bookingRate, 0);
    const sumXY = points.reduce((s, p) => s + p.price * p.bookingRate, 0);
    const sumX2 = points.reduce((s, p) => s + p.price * p.price, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return { a: 0, b: sumY / n };
    const a = (n * sumXY - sumX * sumY) / denom;
    const b = (sumY - a * sumX) / n;
    return { a, b };
  }

  private pearson(points: OptimizationDataPoint[]): number {
    const n = points.length;
    const meanX = points.reduce((s, p) => s + p.price, 0) / n;
    const meanY = points.reduce((s, p) => s + p.bookingRate, 0) / n;
    const num = points.reduce((s, p) => s + (p.price - meanX) * (p.bookingRate - meanY), 0);
    const denomX = Math.sqrt(points.reduce((s, p) => s + (p.price - meanX) ** 2, 0));
    const denomY = Math.sqrt(points.reduce((s, p) => s + (p.bookingRate - meanY) ** 2, 0));
    if (denomX === 0 || denomY === 0) return 0;
    return num / (denomX * denomY);
  }

  private buildRevenueCurve(
    a: number,
    b: number,
    pMin: number,
    pMax: number,
  ): RevenueCurvePoint[] {
    const steps = 20;
    const step = (pMax - pMin) / steps;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const price = pMin + i * step;
      const rate = Math.max(0, a * price + b);
      return { price: Math.round(price), revenue: Math.round(price * rate * 100) / 100 };
    });
  }

  private buildRevenueCurveFlat(currentPrice: number): RevenueCurvePoint[] {
    return [
      { price: Math.round(currentPrice * 0.7), revenue: 0 },
      { price: currentPrice, revenue: 0 },
      { price: Math.round(currentPrice * 1.3), revenue: 0 },
    ];
  }

  private buildInsight(
    current: number,
    optimal: number,
    gain: number,
    correlation: number,
  ): string {
    const diff = optimal - current;
    const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN');
    if (Math.abs(diff) < 5000)
      return `Giá hiện tại đã gần mức tối ưu. Dự kiến doanh thu ổn định.`;
    if (diff > 0)
      return `Tăng lên ${fmt(optimal)}₫ có thể cải thiện doanh thu ~${gain}% dựa trên dữ liệu thị trường.`;
    return `Giảm xuống ${fmt(optimal)}₫ có thể tăng lượt booking, cải thiện doanh thu ~${Math.abs(gain)}%.`;
  }
}
