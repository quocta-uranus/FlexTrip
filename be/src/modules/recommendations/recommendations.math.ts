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
