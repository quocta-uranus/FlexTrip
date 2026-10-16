import { buildDateAnchors, extractJson, sanitizeFilters } from './ai-search.parser';

const TODAY = '2026-10-16';

describe('sanitizeFilters', () => {
  it('keeps valid filters', () => {
    expect(
      sanitizeFilters(
        { keyword: ' lều ', location: 'Đà Lạt', category: 'CAMPING', maxPrice: 300000, dateFrom: '2026-10-17', dateTo: '2026-10-18', sort: 'price_asc' },
        TODAY,
      ),
    ).toEqual({
      keyword: 'lều', location: 'Đà Lạt', category: 'CAMPING', maxPrice: 300000,
      dateFrom: '2026-10-17', dateTo: '2026-10-18', sort: 'price_asc',
    });
  });

  it('drops unknown category, bad sort and non-numeric prices', () => {
    expect(sanitizeFilters({ category: 'BOATS', sort: 'random', minPrice: 'abc', maxPrice: -5 }, TODAY)).toEqual({});
  });

  it('swaps reversed price range', () => {
    expect(sanitizeFilters({ minPrice: 500000, maxPrice: 100000 }, TODAY)).toEqual({ minPrice: 100000, maxPrice: 500000 });
  });

  it('drops dates in the past, incomplete or inverted ranges', () => {
    expect(sanitizeFilters({ dateFrom: '2026-10-10', dateTo: '2026-10-12' }, TODAY)).toEqual({});
    expect(sanitizeFilters({ dateFrom: '2026-10-20' }, TODAY)).toEqual({});
    expect(sanitizeFilters({ dateFrom: '2026-10-20', dateTo: '2026-10-18' }, TODAY)).toEqual({});
    expect(sanitizeFilters({ dateFrom: '2026-13-40', dateTo: '2026-13-41' }, TODAY)).toEqual({});
  });

  it('ignores non-object input', () => {
    expect(sanitizeFilters(null, TODAY)).toEqual({});
    expect(sanitizeFilters('x', TODAY)).toEqual({});
  });
});

describe('extractJson', () => {
  it('pulls JSON out of surrounding text', () => {
    expect(extractJson('ok: {"keyword":"lều"} done')).toEqual({ keyword: 'lều' });
  });
  it('returns null on garbage', () => {
    expect(extractJson('no json')).toBeNull();
    expect(extractJson('{bad json}')).toBeNull();
  });
});

describe('buildDateAnchors', () => {
  it('resolves the coming weekend from a Friday', () => {
    const { date, anchors } = buildDateAnchors(new Date('2026-10-16T03:00:00Z'));
    expect(date).toBe('2026-10-16');
    expect(anchors).toContain('Cuối tuần này: 2026-10-17 đến 2026-10-18');
    expect(anchors).toContain('Cuối tuần sau: 2026-10-24 đến 2026-10-25');
  });

  it('keeps the current weekend on Saturday and Sunday', () => {
    expect(buildDateAnchors(new Date('2026-10-17T03:00:00Z')).anchors).toContain('Cuối tuần này: 2026-10-17 đến 2026-10-18');
    expect(buildDateAnchors(new Date('2026-10-18T03:00:00Z')).anchors).toContain('Cuối tuần này: 2026-10-17 đến 2026-10-18');
  });

  it('uses Vietnam date near midnight UTC', () => {
    expect(buildDateAnchors(new Date('2026-10-15T18:00:00Z')).date).toBe('2026-10-16');
  });
});
