import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, PriceSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PriceAiService } from './price-ai.service';
import type { UpdatePriceConfigDto } from './dto/price-config.dto';

@Injectable()
export class AutoAdjustService {
  private readonly logger = new Logger(AutoAdjustService.name);

  constructor(
    private prisma: PrismaService,
    private priceAi: PriceAiService,
  ) {}

  // ── Config CRUD ────────────────────────────────────────────────────────────

  async getConfig(listingId: string) {
    const config = await this.prisma.listingPriceConfig.findUnique({
      where: { listingId },
    });
    // Return defaults when no config row exists yet
    return config ?? { listingId, autoAdjust: false, minPrice: null, maxPrice: null, updatedAt: null };
  }

  async updateConfig(listingId: string, dto: UpdatePriceConfigDto, userId: string) {
    // Verify listing belongs to the requesting user
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, providerId: userId },
      select: { id: true },
    });
    if (!listing) throw new NotFoundException('Listing không tồn tại hoặc không có quyền truy cập');

    return this.prisma.listingPriceConfig.upsert({
      where: { listingId },
      update: {
        autoAdjust: dto.autoAdjust,
        minPrice: dto.minPrice ?? null,
        maxPrice: dto.maxPrice ?? null,
      },
      create: {
        listingId,
        autoAdjust: dto.autoAdjust,
        minPrice: dto.minPrice ?? null,
        maxPrice: dto.maxPrice ?? null,
      },
    });
  }

  // ── Nightly auto-adjust job ────────────────────────────────────────────────

  async runNightlyAdjust(): Promise<{ processed: number; adjusted: number; skipped: number }> {
    const configs = await this.prisma.listingPriceConfig.findMany({
      where: { autoAdjust: true },
      include: {
        listing: {
          select: { id: true, title: true, category: true, location: true, price: true, providerId: true },
        },
      },
    });

    this.logger.log(`Auto-adjust: processing ${configs.length} listings`);

    let adjusted = 0;
    let skipped = 0;

    for (const config of configs) {
      try {
        await this.processListing(config);
        adjusted++;
      } catch (err) {
        this.logger.warn(`Auto-adjust failed for ${config.listingId}: ${String(err)}`);
        skipped++;
      }
    }

    return { processed: configs.length, adjusted, skipped };
  }

  private async processListing(
    config: Prisma.ListingPriceConfigGetPayload<{ include: { listing: { select: { id: true; title: true; category: true; location: true; price: true; providerId: true } } } }>,
  ) {
    const { listing } = config;

    const suggestion = await this.priceAi.suggest({
      category: listing.category,
      location: listing.location,
      currentPrice: listing.price ? Number(listing.price) : undefined,
      listingId: listing.id,
    });

    const proposed = suggestion.suggestedPrice;
    const min = config.minPrice ? Number(config.minPrice) : null;
    const max = config.maxPrice ? Number(config.maxPrice) : null;

    const withinBounds =
      (min === null || proposed >= min) && (max === null || proposed <= max);

    if (withinBounds) {
      // Apply the new price
      await this.prisma.listing.update({
        where: { id: listing.id },
        data: { price: proposed },
      });

      await this.prisma.priceHistory.create({
        data: {
          listingId: listing.id,
          price: proposed,
          source: PriceSource.AI_AUTO,
          aiScore: suggestion.confidence * 100,
          aiReason: suggestion.reason,
          bookingRate: suggestion.demand.recentBookings / 30,
        },
      });

      this.logger.log(`Auto-adjusted ${listing.id}: ${Number(listing.price)} → ${proposed}`);
    } else {
      // Outside guardrails — notify provider
      const bounded = min !== null && proposed < min ? min : max !== null && proposed > max ? max : proposed;
      const direction = proposed < (min ?? 0) ? 'thấp hơn ngưỡng tối thiểu' : 'cao hơn ngưỡng tối đa';
      const boundStr = proposed < (min ?? 0) ? `${min?.toLocaleString('vi-VN')}đ` : `${max?.toLocaleString('vi-VN')}đ`;

      await this.prisma.notification.create({
        data: {
          userId: listing.providerId,
          type: 'SYSTEM',
          title: `Giá AI vượt ngưỡng — ${listing.title}`,
          body: `AI đề xuất ${proposed.toLocaleString('vi-VN')}đ nhưng ${direction} (${boundStr}). Giá chưa được cập nhật tự động. Xem lại trong mục AI Định giá.`,
          data: {
            listingId: listing.id,
            proposedPrice: proposed,
            boundedPrice: bounded,
            reason: suggestion.reason,
            link: `/dashboard/pricing`,
          } as Prisma.InputJsonValue,
        },
      });

      this.logger.log(`Auto-adjust blocked for ${listing.id}: proposed ${proposed} outside [${min}, ${max}]`);
    }
  }
}
