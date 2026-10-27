import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ListingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EmbeddableListing, SearchTerm, blendScore, contentHash, cosine, embeddingText, isRepeatedSearch, searchAffinity, weightedMean,
} from './recommendations.math';

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 768;
const CANDIDATE_LIMIT = 500;
// One Gemini batch per request keeps latency bounded; the rest are picked up by later requests
const EMBED_BATCH = 40;
// Gemini cosine: related items land ~0.7+, unrelated ones ~0.5, so only claim similarity above this
const RELATED_SIMILARITY = 0.6;
// Measured with gemini-embedding-001: real need-to-item matches score 0.67-0.80, unrelated pairs top out near 0.62
const NEED_SIMILARITY = 0.66;
const PER_NEED = 3;
// Searches older than this say little about what the user wants now
const SEARCH_WINDOW_MS = 30 * 24 * 3600_000;
const SEARCH_KEPT = 50;
const SEARCH_USED = 20;
// An identical search repeated within this window (typing, paging, re-sorting) counts once
const SEARCH_DEDUP_MS = 10 * 60_000;
// Weight of a search match next to the 0.75 similarity term of blendScore
const SEARCH_WEIGHT = 0.2;

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

  async recordSearch(userId: string, term: SearchTerm) {
    const keyword = term.keyword?.trim() || null;
    const location = term.location?.trim() || null;
    const category = term.category || null;
    if (!keyword && !location && !category) return;

    const last = await this.prisma.searchHistory.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    const repeated = isRepeatedSearch(last, { keyword, location, category }, SEARCH_DEDUP_MS);
    if (repeated) return;

    await this.prisma.searchHistory.create({ data: { userId, keyword, location, category } });
    const stale = await this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: SEARCH_KEPT,
      select: { id: true },
    });
    if (stale.length > 0) await this.prisma.searchHistory.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });
  }

  private recentSearches(userId: string): Promise<SearchTerm[]> {
    return this.prisma.searchHistory.findMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - SEARCH_WINDOW_MS) } },
      orderBy: { createdAt: 'desc' },
      take: SEARCH_USED,
      select: { keyword: true, category: true, location: true },
    });
  }

  async forYou(userId: string, limit: number): Promise<RecommendationResult> {
    const [signals, searches] = await Promise.all([this.collectSignals(userId), this.recentSearches(userId)]);
    const candidates = (await this.loadActive()).filter(
      (c) => c.providerId !== userId && !signals.has(c.id),
    );

    if (signals.size === 0 && searches.length === 0) return this.popular(candidates, limit);

    if (signals.size === 0) {
      // No booking, wish or review yet: the searches alone decide, and listings that match none of them are left out
      const ranked = candidates
        .map((c) => ({ c, match: searchAffinity(c, searches) }))
        .filter((x) => x.match.score > 0)
        .map(({ c, match }) => ({
          id: c.id,
          score: match.score + blendScore({ similarity: 0, sameCategory: false, sameLocation: false, rating: this.rating(c), bookings: c._count.bookings }),
          reason: this.searchReason(match.term),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      return ranked.length > 0 ? { source: 'personalized', items: await this.hydrate(ranked) } : this.popular(candidates, limit);
    }

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
        const match = searchAffinity(c, searches);
        const score =
          blendScore({
            similarity: profile && vec.length ? cosine(profile, vec) : 0,
            sameCategory: categories.has(c.category),
            sameLocation: locations.has(c.location),
            rating: this.rating(c),
            bookings: c._count.bookings,
          }) +
          match.score * SEARCH_WEIGHT;
        const reason = match.score >= 0.7 ? this.searchReason(match.term) : this.reasonFor(c, signalRows, signals);
        return { id: c.id, score, reason };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return { source: 'personalized', items: await this.hydrate(ranked) };
  }

  // ─── AI search by need ────────────────────────────────────────────────────

  async embedTexts(texts: string[]): Promise<number[][] | null> {
    if (!this.embedder || texts.length === 0) return null;
    try {
      const res = await this.embedder.batchEmbedContents({
        requests: texts.map((t) => ({
          content: { role: 'user', parts: [{ text: t }] },
          outputDimensionality: EMBEDDING_DIM,
        })),
      });
      const vectors = res.embeddings.map((e) => e.values);
      return vectors.every((v) => v.length > 0) ? vectors : null;
    } catch (error) {
      this.logger.warn(`Need embedding failed: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  // Mixes the best matches for each need (round-robin) so a "baby + trip" query yields a stroller AND a suitcase, not one category
  async rankByNeeds(candidateIds: string[], needs: string[], limit: number) {
    if (candidateIds.length === 0 || needs.length === 0) return [];
    const rows = await this.prisma.listing.findMany({
      where: { id: { in: candidateIds }, status: ListingStatus.ACTIVE },
      select: candidateSelect,
    });
    // ensureEmbeddings handles EMBED_BATCH rows per pass
    for (let pass = 0; pass < Math.ceil(rows.length / EMBED_BATCH); pass++) await this.ensureEmbeddings(rows);

    const needVectors = await this.embedTexts(needs);
    if (!needVectors) return [];

    const perNeed = needs.map((need, i) =>
      rows
        .map((r) => ({ id: r.id, score: cosine(needVectors[i], r.embedding?.vector ?? []), need }))
        .filter((x) => x.score >= NEED_SIMILARITY)
        .sort((a, b) => b.score - a.score)
        .slice(0, PER_NEED),
    );

    const picked = new Map<string, { id: string; reason: string }>();
    for (let rank = 0; rank < PER_NEED && picked.size < limit; rank++) {
      for (const list of perNeed) {
        const hit = list[rank];
        if (hit && !picked.has(hit.id) && picked.size < limit) {
          picked.set(hit.id, { id: hit.id, reason: `Hợp với nhu cầu: ${hit.need}` });
        }
      }
    }
    return [...picked.values()];
  }

  toListings(ranked: Array<{ id: string; reason: string }>) {
    return this.hydrate(ranked);
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

  private searchReason(term: SearchTerm | null): string {
    if (term?.keyword) return `Hợp với tìm kiếm "${term.keyword}"`;
    return 'Giống thiết bị bạn vừa tìm';
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
