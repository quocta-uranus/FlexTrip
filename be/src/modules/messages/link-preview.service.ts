import { Injectable } from '@nestjs/common';
import { ListingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { appOrigins, listingIdFromUrl } from './links.util';
import type { ListingPreviewDto } from './messages.types';

const MAX_PREVIEWS_PER_MESSAGE = 3;

@Injectable()
export class LinkPreviewService {
  constructor(private readonly prisma: PrismaService) {}

  private async byListingIds(ids: string[]): Promise<Map<string, ListingPreviewDto>> {
    if (!ids.length) return new Map();
    const listings = await this.prisma.listing.findMany({
      where: { id: { in: ids }, status: ListingStatus.ACTIVE },
      select: { id: true, title: true, imageUrls: true, price: true, currency: true, location: true },
    });
    return new Map(
      listings.map((l) => [
        l.id,
        { id: l.id, title: l.title, imageUrl: l.imageUrls[0] ?? null, price: Number(l.price), currency: l.currency, location: l.location },
      ]),
    );
  }

  /** messageId → previews, resolved with one DB query for the whole page. */
  async forMessages(
    rows: { id: string; links: string[]; deletedAt: Date | null }[],
  ): Promise<Map<string, ListingPreviewDto[]>> {
    const origins = appOrigins();
    const idsByMessage = new Map<string, string[]>();
    for (const r of rows) {
      if (r.deletedAt) continue;
      const ids = [...new Set(r.links.map((l) => listingIdFromUrl(l, origins)).filter((x): x is string => !!x))].slice(
        0,
        MAX_PREVIEWS_PER_MESSAGE,
      );
      if (ids.length) idsByMessage.set(r.id, ids);
    }
    const byId = await this.byListingIds([...new Set([...idsByMessage.values()].flat())]);
    const out = new Map<string, ListingPreviewDto[]>();
    for (const [messageId, ids] of idsByMessage) {
      const previews = ids.flatMap((id) => byId.get(id) ?? []);
      if (previews.length) out.set(messageId, previews);
    }
    return out;
  }

  /** url → preview, for the "Link" history tab. */
  async forUrls(urls: string[]): Promise<Map<string, ListingPreviewDto>> {
    const origins = appOrigins();
    const idByUrl = new Map<string, string>();
    for (const url of urls) {
      const id = listingIdFromUrl(url, origins);
      if (id) idByUrl.set(url, id);
    }
    const byId = await this.byListingIds([...new Set(idByUrl.values())]);
    const out = new Map<string, ListingPreviewDto>();
    for (const [url, id] of idByUrl) {
      const preview = byId.get(id);
      if (preview) out.set(url, preview);
    }
    return out;
  }
}
