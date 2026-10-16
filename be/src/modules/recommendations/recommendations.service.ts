import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ListingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EmbeddableListing, blendScore, contentHash, cosine, embeddingText, weightedMean,
} from './recommendations.math';

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 768;
const CANDIDATE_LIMIT = 500;
// One Gemini batch per request keeps latency bounded; the rest are picked up by later requests
const EMBED_BATCH = 40;
// Gemini cosine: related items land ~0.7+, unrelated ones ~0.5, so only claim similarity above this
const RELATED_SIMILARITY = 0.6;

const candidateSelect = {
  id: true, title: true, description: true, category: true, location: true, amenities: true, providerId: true,
  embedding: { select: { vector: true, contentHash: true } },
  provider: { select: { providerProfile: { select: { ratingAvg: true } } } },
  _count: { select: { bookings: true } },
} satisfies Prisma.ListingSelect;

type Row = Prisma.ListingGetPayload<{ select: typeof candidateSelect }>;

export interface RecommendedListing {
  aiReason: string;
  [key: string]: unknown;
}

export interface RecommendationResult {
  source: 'personalized' | 'popular' | 'similar';
  items: RecommendedListing[];
}

type Signal = { listingId: string; weight: number; verb: string };

@Injectable()
export class RecommendationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly embedder: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const key = config.get<string>('GEMINI_API_KEY', '');
    this.embedder = key ? new GoogleGenerativeAI(key).getGenerativeModel({ model: EMBEDDING_MODEL }) : null;
  }

  onApplicationBootstrap() {
    // Not awaited: warming the vectors must never delay or fail app startup
    void this.loadActive().catch((e) => this.logger.warn(`Embedding warm-up failed: ${e}`));
  }

  // ─── "Sản phẩm tương tự" ──────────────────────────────────────────────────

  async similar(listingId: string, limit: number): Promise<RecommendationResult> {
    const target = await this.prisma.listing.findUnique({ where: { id: listingId }, select: candidateSelect });
    if (!target) throw new NotFoundException('Listing không tồn tại');

    const candidates = (await this.loadActive()).filter((c) => c.id !== listingId);
    await this.ensureEmbeddings([target]);
    const targetVec = target.embedding?.vector ?? [];

    const ranked = candidates
      .map((c) => {
        const sameCategory = c.category === target.category;
        const sameLocation = c.location === target.location;
        const similarity = targetVec.length ? cosine(targetVec, c.embedding?.vector ?? []) : 0;
        const score = blendScore({
          similarity, sameCategory, sameLocation, rating: this.rating(c), bookings: c._count.bookings,
        });
        const parts = [
          sameCategory && 'Cùng danh mục',
          sameLocation && `Cùng khu vực ${c.location}`,
          !sameCategory && similarity >= RELATED_SIMILARITY && 'Nội dung tương tự',
        ].filter(Boolean);
        return { id: c.id, score, reason: parts.length ? parts.join(' · ') : 'Có thể bạn quan tâm' };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return { source: 'similar', items: await this.hydrate(ranked) };
  }

  // ─── "Dành cho bạn" ───────────────────────────────────────────────────────

  async forYou(userId: string, limit: number): Promise<RecommendationResult> {
    const signals = await this.collectSignals(userId);
    const candidates = (await this.loadActive()).filter(
      (c) => c.providerId !== userId && !signals.has(c.id),
    );

    if (signals.size === 0) return this.popular(candidates, limit);

    const signalRows = await this.prisma.listing.findMany({
      where: { id: { in: [...signals.keys()] } },
      select: candidateSelect,
    });
    await this.ensureEmbeddings(signalRows);

    const profile = weightedMean(
      signalRows.map((r) => ({ vector: r.embedding?.vector ?? [], weight: signals.get(r.id)?.weight ?? 0 })),
    );
    const categories = new Set(signalRows.map((r) => r.category));
    const locations = new Set(signalRows.map((r) => r.location));

    const ranked = candidates
      .map((c) => {
        const vec = c.embedding?.vector ?? [];
        const score = blendScore({
          similarity: profile && vec.length ? cosine(profile, vec) : 0,
          sameCategory: categories.has(c.category),
          sameLocation: locations.has(c.location),
          rating: this.rating(c),
          bookings: c._count.bookings,
        });
        return { id: c.id, score, reason: this.reasonFor(c, signalRows, signals) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return { source: 'personalized', items: await this.hydrate(ranked) };
  }

  // ─── internals ────────────────────────────────────────────────────────────

  private async popular(candidates: Row[], limit: number): Promise<RecommendationResult> {
    const ranked = candidates
      .map((c) => ({
        id: c.id,
        score: blendScore({ similarity: 0, sameCategory: false, sameLocation: false, rating: this.rating(c), bookings: c._count.bookings }),
        reason: c._count.bookings > 0 ? 'Được thuê nhiều trên FlexTrip' : 'Mới trên FlexTrip',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return { source: 'popular', items: await this.hydrate(ranked) };
  }

  private async collectSignals(userId: string): Promise<Map<string, Signal>> {
    const [wishlist, bookings, reviews] = await Promise.all([
      this.prisma.wishlist.findMany({ where: { userId }, select: { listingId: true }, orderBy: { createdAt: 'desc' }, take: 30 }),
      this.prisma.booking.findMany({
        where: { travelerId: userId, status: { notIn: ['CANCELLED', 'PENDING_PAYMENT'] } },
        select: { listingId: true }, orderBy: { createdAt: 'desc' }, take: 20,
      }),
      this.prisma.review.findMany({
        where: { authorId: userId, rating: { gte: 4 }, listingId: { not: null } },
        select: { listingId: true }, take: 20,
      }),
    ]);

    const signals = new Map<string, Signal>();
    const add = (listingId: string | null, weight: number, verb: string) => {
      if (!listingId) return;
      const prev = signals.get(listingId);
      if (!prev || weight > prev.weight) signals.set(listingId, { listingId, weight, verb });
    };
    wishlist.forEach((w) => add(w.listingId, 2, 'lưu'));
    reviews.forEach((r) => add(r.listingId, 2, 'đánh giá cao'));
    bookings.forEach((b) => add(b.listingId, 3, 'thuê'));
    return signals;
  }

  // Explains the pick by the most similar thing the user already interacted with
  private reasonFor(candidate: Row, signalRows: Row[], signals: Map<string, Signal>): string {
    const vec = candidate.embedding?.vector ?? [];
    let best: { row: Row; sim: number } | null = null;
    for (const row of signalRows) {
      const sim = vec.length ? cosine(vec, row.embedding?.vector ?? []) : 0;
      if (!best || sim > best.sim) best = { row, sim };
    }
    if (best && best.sim >= RELATED_SIMILARITY) {
      return `Giống "${best.row.title}" bạn đã ${signals.get(best.row.id)?.verb ?? 'quan tâm'}`;
    }
    const sameCat = signalRows.find((r) => r.category === candidate.category);
    return sameCat ? `Cùng danh mục với "${sameCat.title}"` : 'Có thể bạn quan tâm';
  }

  private rating(row: Row): number {
    return Number(row.provider.providerProfile?.ratingAvg ?? 0) || 0;
  }

  private async loadActive(): Promise<Row[]> {
    const rows = await this.prisma.listing.findMany({
      where: { status: ListingStatus.ACTIVE },
      select: candidateSelect,
      orderBy: { createdAt: 'desc' },
      take: CANDIDATE_LIMIT,
    });
    await this.ensureEmbeddings(rows);
    return rows;
  }

  // Fills in missing/stale vectors in place; any failure just leaves rows without a vector so callers fall back to rules
  private async ensureEmbeddings(rows: Row[]) {
    if (!this.embedder) return;
    const stale = rows
      .filter((r) => !r.embedding || r.embedding.contentHash !== contentHash(r as EmbeddableListing))
      .slice(0, EMBED_BATCH);
    if (stale.length === 0) return;

    try {
      const res = await this.embedder.batchEmbedContents({
        requests: stale.map((r) => ({
          content: { role: 'user', parts: [{ text: embeddingText(r as EmbeddableListing) }] },
          outputDimensionality: EMBEDDING_DIM,
        })),
      });
      await Promise.all(
        stale.map(async (r, i) => {
          const vector = res.embeddings[i]?.values;
          if (!vector?.length) return;
          const hash = contentHash(r as EmbeddableListing);
          await this.prisma.listingEmbedding.upsert({
            where: { listingId: r.id },
            create: { listingId: r.id, vector, contentHash: hash, model: EMBEDDING_MODEL },
            update: { vector, contentHash: hash, model: EMBEDDING_MODEL },
          });
          r.embedding = { vector, contentHash: hash };
        }),
      );
    } catch (error) {
      this.logger.warn(`Embedding request failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async hydrate(ranked: Array<{ id: string; reason: string }>): Promise<RecommendedListing[]> {
    if (ranked.length === 0) return [];
    const listings = await this.prisma.listing.findMany({
      where: { id: { in: ranked.map((r) => r.id) } },
      include: {
        provider: {
          select: {
            id: true, name: true, avatarUrl: true,
            providerProfile: { select: { shopName: true, ratingAvg: true, reviewsCount: true, responseHours: true } },
          },
        },
        _count: { select: { reviews: true, bookings: true } },
      },
    });
    const byId = new Map(listings.map((l) => [l.id, l]));
    return ranked.flatMap((r) => {
      const listing = byId.get(r.id);
      return listing ? [{ ...listing, aiReason: r.reason }] : [];
    });
  }
}
