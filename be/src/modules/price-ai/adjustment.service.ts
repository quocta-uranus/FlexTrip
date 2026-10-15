import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BenchmarkService } from './benchmark.service';
import type { PriceAdjustmentSuggestion } from './price-ai.types';

@Injectable()
export class AdjustmentService {
  constructor(
    private prisma: PrismaService,
    private benchmark: BenchmarkService,
  ) {}

  async suggest(listingId: string): Promise<PriceAdjustmentSuggestion> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, price: true, category: true, location: true },
    });
    if (!listing) throw new NotFoundException('Listing không tồn tại');

    const currentPrice = Number(listing.price);
    const cityToken = listing.location.split(',').pop()?.trim() ?? listing.location;

    const [bench, demand] = await Promise.all([
      this.benchmark.compute(listing.category, listing.location, currentPrice, listingId),
      this.getDemandScore(listing.category, cityToken),
    ]);

    const { suggestedPrice, changePercent, reason, urgency } = this.calcAdjustment(
      currentPrice,
      bench,
      demand,
    );

    return {
      listingId,
      currentPrice,
      suggestedPrice,
      changePercent,
      reason,
      urgency,
      demandScore: demand.score,
      trend: demand.trend,
    };
  }

  async suggestMany(providerListingIds: string[]): Promise<PriceAdjustmentSuggestion[]> {
    const results = await Promise.allSettled(
      providerListingIds.map((id) => this.suggest(id)),
    );
    return results
      .filter((r): r is PromiseFulfilledResult<PriceAdjustmentSuggestion> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((r) => Math.abs(r.changePercent) >= 5); // chỉ trả về khi đề xuất thay đổi >= 5%
  }

  private calcAdjustment(
    currentPrice: number,
    bench: Awaited<ReturnType<BenchmarkService['compute']>>,
    demand: { score: number; trend: 'UP' | 'DOWN' | 'FLAT' },
  ): Pick<PriceAdjustmentSuggestion, 'suggestedPrice' | 'changePercent' | 'reason' | 'urgency'> {
    let multiplier = 1;
    const parts: string[] = [];

    // Demand-based adjustment
    if (demand.trend === 'UP' && demand.score >= 70) {
      multiplier *= 1.1;
      parts.push('nhu cầu đang tăng cao');
    } else if (demand.trend === 'DOWN' && demand.score <= 35) {
      multiplier *= 0.92;
      parts.push('nhu cầu đang giảm');
    }

    // Market position adjustment
    if (bench.sampleCount >= 3) {
      const myPercentile = bench.myPercentile ?? 50;
      if (myPercentile < 30 && demand.score > 50) {
        multiplier *= 1.08;
        parts.push('giá đang thấp hơn thị trường');
      } else if (myPercentile > 80 && demand.score < 50) {
        multiplier *= 0.93;
        parts.push('giá cao hơn thị trường trong giai đoạn thấp điểm');
      }
    }

    const suggestedPrice = Math.round((currentPrice * multiplier) / 1000) * 1000;
    const changePercent = Math.round(((suggestedPrice - currentPrice) / currentPrice) * 100);
    const reason =
      parts.length > 0
        ? `Đề xuất ${changePercent > 0 ? 'tăng' : 'giảm'} giá vì ${parts.join(' và ')}.`
        : 'Giá hiện tại phù hợp với thị trường.';

    const urgency: PriceAdjustmentSuggestion['urgency'] =
      Math.abs(changePercent) >= 15
        ? 'HIGH'
        : Math.abs(changePercent) >= 8
          ? 'MEDIUM'
          : 'LOW';

    return { suggestedPrice, changePercent, reason, urgency };
  }

  private async getDemandScore(
    category: string,
    cityToken: string,
  ): Promise<{ score: number; trend: 'UP' | 'DOWN' | 'FLAT' }> {
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400_000);
    const d60 = new Date(now.getTime() - 60 * 86400_000);

    const [recent, baseline] = await Promise.all([
      this.prisma.booking.count({
        where: {
          listing: { category, location: { contains: cityToken, mode: 'insensitive' } },
          createdAt: { gte: d30 },
        },
      }),
      this.prisma.booking.count({
        where: {
          listing: { category, location: { contains: cityToken, mode: 'insensitive' } },
          createdAt: { gte: d60, lt: d30 },
        },
      }),
    ]);

    const score =
      baseline === 0 ? Math.min(80, 40 + recent * 3) : Math.min(100, Math.round((recent / baseline) * 50));
    const trend: 'UP' | 'DOWN' | 'FLAT' =
      recent > baseline * 1.1 ? 'UP' : recent < baseline * 0.9 ? 'DOWN' : 'FLAT';

    return { score, trend };
  }
}
