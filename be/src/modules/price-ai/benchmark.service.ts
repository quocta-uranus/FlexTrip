import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { BenchmarkResult, DetailedBenchmark } from './price-ai.types';

type PercentileRow = {
  count: bigint;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  avg_price: number;
};

@Injectable()
export class BenchmarkService {
  constructor(private prisma: PrismaService) {}

  async compute(
    category: string,
    location: string,
    currentPrice?: number,
    excludeListingId?: string,
  ): Promise<BenchmarkResult> {
    const cityToken = this.extractCity(location);

    const rows = await this.prisma.$queryRaw<PercentileRow[]>`
      SELECT
        COUNT(*)::bigint                                                         AS count,
        COALESCE(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price::float), 0) AS p25,
        COALESCE(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY price::float), 0) AS p50,
        COALESCE(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price::float), 0) AS p75,
        COALESCE(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY price::float), 0) AS p90,
        COALESCE(AVG(price::float), 0)                                          AS avg_price
      FROM "Listing"
      WHERE category    = ${category}
        AND status      = 'ACTIVE'
        AND (
          LOWER(location) LIKE ${`%${cityToken.toLowerCase()}%`}
          OR LOWER(${cityToken.toLowerCase()}) LIKE LOWER(location)
        )
        AND id != ${excludeListingId ?? ''}
    `;

    const row = rows[0];
    const count = Number(row?.count ?? 0);

    if (count === 0) {
      return {
        sampleCount: 0,
        p25: 0,
        p50: 0,
        p75: 0,
        p90: 0,
        avgPrice: 0,
        myPercentile: null,
      };
    }

    const p25 = Number(row.p25);
    const p50 = Number(row.p50);
    const p75 = Number(row.p75);
    const p90 = Number(row.p90);
    const avgPrice = Number(row.avg_price);

    let myPercentile: number | null = null;
    if (currentPrice != null && currentPrice > 0) {
      myPercentile = this.estimatePercentile(currentPrice, p25, p50, p75, p90);
    }

    return { sampleCount: count, p25, p50, p75, p90, avgPrice, myPercentile };
  }

  async detail(listingId: string): Promise<DetailedBenchmark> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, price: true, category: true, location: true },
    });
    if (!listing) throw new NotFoundException('Listing không tồn tại');

    const currentPrice = Number(listing.price);
    const base = await this.compute(listing.category, listing.location, currentPrice, listingId);
    const cityToken = this.extractCity(listing.location);

    // Booking rate: bookings per active day in last 90d
    const d90 = new Date(Date.now() - 90 * 86400_000);
    const [myBookings, competitors] = await Promise.all([
      this.prisma.booking.count({
        where: { listingId, createdAt: { gte: d90 } },
      }),
      this.prisma.listing.findMany({
        where: {
          category: listing.category,
          status: 'ACTIVE',
          location: { contains: cityToken, mode: 'insensitive' },
          id: { not: listingId },
        },
        select: { id: true, title: true, price: true, location: true },
        orderBy: { price: 'asc' },
        take: 6,
      }),
    ]);

    // Market booking rate: avg bookings/90d across competitors (sample)
    const compIds = competitors.map((c) => c.id);
    const marketBookings =
      compIds.length > 0
        ? await this.prisma.booking.count({
            where: { listingId: { in: compIds }, createdAt: { gte: d90 } },
          })
        : 0;

    const myBookingRate = myBookings / 90;
    const marketBookingRate = compIds.length > 0 ? marketBookings / (compIds.length * 90) : null;

    const priceAdvice = this.buildAdvice(currentPrice, base, myBookingRate, marketBookingRate);

    return {
      ...base,
      listingId,
      currentPrice,
      myBookingRate,
      marketBookingRate,
      priceAdvice,
      competitors: competitors.map((c) => ({
        id: c.id,
        title: c.title,
        price: Number(c.price),
        location: c.location,
      })),
    };
  }

  private buildAdvice(
    price: number,
    bench: BenchmarkResult,
    myRate: number,
    marketRate: number | null,
  ): string {
    if (bench.sampleCount < 3) return 'Chưa đủ dữ liệu để so sánh trong khu vực này.';
    const pct = bench.myPercentile ?? 50;
    if (pct < 30 && (marketRate == null || myRate >= marketRate))
      return `Giá của bạn thấp hơn 70% thị trường nhưng booking rate tốt. Có thể tăng nhẹ để tối ưu doanh thu.`;
    if (pct < 30)
      return `Giá đang ở phân vị thấp (p${pct}). Cân nhắc tăng để cải thiện doanh thu.`;
    if (pct > 80 && myRate < (marketRate ?? myRate) * 0.8)
      return `Giá cao hơn 80% thị trường và booking rate thấp hơn trung bình. Cân nhắc giảm nhẹ.`;
    if (pct > 80)
      return `Giá cao (p${pct}) nhưng vẫn đang có booking. Tiếp tục theo dõi.`;
    return `Giá đang ở mức cạnh tranh tốt (p${pct}), phù hợp với thị trường.`;
  }

  private extractCity(location: string): string {
    const parts = location.split(',').map((s) => s.trim());
    return parts[parts.length - 1] || location;
  }

  private estimatePercentile(
    price: number,
    p25: number,
    p50: number,
    p75: number,
    p90: number,
  ): number {
    if (price <= p25) return Math.round((price / p25) * 25);
    if (price <= p50) return Math.round(25 + ((price - p25) / (p50 - p25)) * 25);
    if (price <= p75) return Math.round(50 + ((price - p50) / (p75 - p50)) * 25);
    if (price <= p90) return Math.round(75 + ((price - p75) / (p90 - p75)) * 15);
    return Math.min(99, Math.round(90 + ((price - p90) / p90) * 10));
  }
}
