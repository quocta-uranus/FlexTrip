import { blendScore, contentHash, cosine, embeddingText, weightedMean } from './recommendations.math';

describe('cosine', () => {
  it('is 1 for identical, 0 for orthogonal, 0 for mismatched or zero vectors', () => {
    expect(cosine([1, 2], [1, 2])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBe(0);
    expect(cosine([1], [1, 2])).toBe(0);
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });
});

describe('weightedMean', () => {
  it('weights vectors and ignores empty or zero-weight ones', () => {
    expect(weightedMean([{ vector: [1, 0], weight: 3 }, { vector: [0, 1], weight: 1 }, { vector: [], weight: 5 }])).toEqual([0.75, 0.25]);
    expect(weightedMean([{ vector: [1, 1], weight: 0 }])).toBeNull();
    expect(weightedMean([])).toBeNull();
  });
});

describe('contentHash', () => {
  const base = { title: 'Lều', description: 'Lều 4 người', category: 'CAMPING', location: 'Đà Lạt', amenities: ['bạt'] };
  it('is stable and changes when embedded text changes', () => {
    expect(contentHash(base)).toBe(contentHash({ ...base }));
    expect(contentHash(base)).not.toBe(contentHash({ ...base, title: 'Lều 6 người' }));
    expect(embeddingText(base)).toContain('Đà Lạt');
  });
});

describe('blendScore', () => {
  it('ranks higher similarity first and rewards same category/location', () => {
    const lo = blendScore({ similarity: 0.5, sameCategory: false, sameLocation: false, rating: 0, bookings: 0 });
    const hi = blendScore({ similarity: 0.7, sameCategory: false, sameLocation: false, rating: 0, bookings: 0 });
    const cat = blendScore({ similarity: 0.5, sameCategory: true, sameLocation: true, rating: 5, bookings: 20 });
    expect(hi).toBeGreaterThan(lo);
    expect(cat).toBeGreaterThan(lo);
  });
});
