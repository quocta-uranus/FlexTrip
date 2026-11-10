import { blendScore, contentHash, cosine, embeddingText, isRepeatedSearch, searchAffinity, weightedMean } from './recommendations.math';

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

describe('searchAffinity', () => {
  const tent = { title: 'Lều cắm trại 4 người', description: 'Chống nước, gọn nhẹ', category: 'CAMPING_TREKKING', location: 'Đà Lạt' };

  it('ranks a title hit over a description hit over a category or location match', () => {
    expect(searchAffinity(tent, [{ keyword: 'lều' }]).score).toBe(1);
    expect(searchAffinity(tent, [{ keyword: 'chống nước' }]).score).toBe(0.7);
    expect(searchAffinity(tent, [{ category: 'CAMPING_TREKKING' }]).score).toBe(0.5);
    expect(searchAffinity(tent, [{ location: 'da lat' }]).score).toBe(0.4);
  });

  it('ignores accents and case, and returns the best matching search', () => {
    const result = searchAffinity(tent, [{ location: 'Huế' }, { keyword: 'LEU' }]);
    expect(result.score).toBe(1);
    expect(result.term?.keyword).toBe('LEU');
  });

  it('is 0 when nothing matches or there is no search', () => {
    expect(searchAffinity(tent, [{ keyword: 'máy ảnh', category: 'CAMERA', location: 'Huế' }]).score).toBe(0);
    expect(searchAffinity(tent, []).score).toBe(0);
  });
});

describe('isRepeatedSearch', () => {
  const now = Date.now();
  const last = { keyword: 'lều', location: null, category: null, createdAt: new Date(now - 60_000) };

  it('treats the same search within the window as a repeat', () => {
    expect(isRepeatedSearch(last, { keyword: 'lều' }, 600_000, now)).toBe(true);
  });

  it('does not when the search differs, is older than the window, or there is none', () => {
    expect(isRepeatedSearch(last, { keyword: 'balo' }, 600_000, now)).toBe(false);
    expect(isRepeatedSearch(last, { keyword: 'lều', location: 'Huế' }, 600_000, now)).toBe(false);
    expect(isRepeatedSearch(last, { keyword: 'lều' }, 30_000, now)).toBe(false);
    expect(isRepeatedSearch(null, { keyword: 'lều' }, 600_000, now)).toBe(false);
  });
});
