import { createHash } from 'crypto';

export function cosine(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

export function weightedMean(items: Array<{ vector: number[]; weight: number }>): number[] | null {
  const valid = items.filter((i) => i.vector.length > 0 && i.weight > 0);
  if (valid.length === 0) return null;
  const dim = valid[0].vector.length;
  const sum = new Array<number>(dim).fill(0);
  let total = 0;
  for (const { vector, weight } of valid) {
    if (vector.length !== dim) continue;
    for (let i = 0; i < dim; i++) sum[i] += vector[i] * weight;
    total += weight;
  }
  return total === 0 ? null : sum.map((v) => v / total);
}

export interface EmbeddableListing {
  title: string;
  description: string;
  category: string;
  location: string;
  amenities: string[];
}

export function embeddingText(l: EmbeddableListing): string {
  return [
    l.title,
    `Danh mục: ${l.category}`,
    `Địa điểm: ${l.location}`,
    l.description.slice(0, 800),
    l.amenities.length ? `Tiện ích: ${l.amenities.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('. ');
}

// Re-embed only when something that feeds the text changed
export function contentHash(l: EmbeddableListing): string {
  return createHash('sha1').update(embeddingText(l)).digest('hex');
}

export interface ScoreInput {
  similarity: number; // cosine, 0 when unavailable
  sameCategory: boolean;
  sameLocation: boolean;
  rating: number; // 0-5
  bookings: number;
}

// Semantic similarity leads; the other terms break ties and keep results sensible when embeddings are missing
export function blendScore(s: ScoreInput): number {
  return (
    s.similarity * 0.75 +
    (s.sameCategory ? 0.1 : 0) +
    (s.sameLocation ? 0.08 : 0) +
    (Math.min(Math.max(s.rating, 0), 5) / 5) * 0.05 +
    Math.min(s.bookings, 20) / 20 * 0.02
  );
}

export interface SearchTerm {
  keyword?: string | null;
  category?: string | null;
  location?: string | null;
}

// Diacritic-insensitive, so a search for "leu" still matches "Lều"
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

export interface SearchableListing {
  title: string;
  description: string;
  category: string;
  location: string;
}

// 0..1: how well a listing fits what the user searched for. A keyword hit in the title is the strongest signal,
// then a keyword in the description, then the same category or location as a past search.
export function searchAffinity(listing: SearchableListing, searches: SearchTerm[]): { score: number; term: SearchTerm | null } {
  const title = fold(listing.title);
  const description = fold(listing.description);
  let best = { score: 0, term: null as SearchTerm | null };
  for (const term of searches) {
    const keyword = term.keyword ? fold(term.keyword.trim()) : '';
    let score = 0;
    if (keyword && title.includes(keyword)) score = 1;
    else if (keyword && description.includes(keyword)) score = 0.7;
    else if (term.category && term.category === listing.category) score = 0.5;
    else if (term.location && fold(listing.location).includes(fold(term.location))) score = 0.4;
    if (score > best.score) best = { score, term };
  }
  return best;
}

// An identical search repeated within the window (typing, paging, re-sorting) counts once
export function isRepeatedSearch(
  last: (SearchTerm & { createdAt: Date }) | null,
  next: SearchTerm,
  windowMs: number,
  now = Date.now(),
): boolean {
  return (
    last !== null &&
    (last.keyword ?? null) === (next.keyword ?? null) &&
    (last.location ?? null) === (next.location ?? null) &&
    (last.category ?? null) === (next.category ?? null) &&
    now - last.createdAt.getTime() < windowMs
  );
}
