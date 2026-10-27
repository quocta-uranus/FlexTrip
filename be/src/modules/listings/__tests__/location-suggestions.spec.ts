import { jest } from '@jest/globals';
import { PrismaService } from '../../../prisma/prisma.service';
import { ListingsService } from '../listings.service';
import { buildLocationSuggestions, cleanLocation, foldKey } from '../location-suggestions';

const values = (rows: Array<[string, number]>) =>
  buildLocationSuggestions(rows.map(([location, count]) => ({ location, count }))).map((s) => s.value);

describe('location normalization', () => {
  it('collapses whitespace and folds case and diacritics for comparison', () => {
    expect(cleanLocation('  Đà   Lạt \n')).toBe('Đà Lạt');
    expect(foldKey('Đà Lạt')).toBe(foldKey('  da   LAT '));
  });
});

describe('buildLocationSuggestions', () => {
  it('prefers the city or tourist area over the street and district', () => {
    const result = values([['Quận 1, TP. Hồ Chí Minh', 3], ['Cầu Giấy, Hà Nội', 2]]);
    expect(result[0]).toBe('Hồ Chí Minh');
    expect(result).toEqual(expect.arrayContaining(['Hà Nội', 'Cầu Giấy']));
    expect(result.some((v) => v.startsWith('Quận'))).toBe(false);
  });

  it('keeps tourist places that are not the last segment', () => {
    const result = values([['Phường 2, Đà Lạt, Lâm Đồng', 4], ['Sa Pa', 2]]);
    expect(result).toEqual(expect.arrayContaining(['Đà Lạt', 'Lâm Đồng', 'Sa Pa']));
  });

  it('merges spelling variants and sums their counts under the most common one', () => {
    const result = buildLocationSuggestions([
      { location: 'Đà Nẵng', count: 5 },
      { location: 'TP. Đà Nẵng', count: 2 },
      { location: 'da nang ', count: 1 },
    ]);
    expect(result).toEqual([{ value: 'Đà Nẵng', count: 8 }]);
  });

  it('strips administrative prefixes so the value is contained in every variant', () => {
    expect(values([['Thành phố Huế', 1], ['Tỉnh Lâm Đồng', 1]])).toEqual(expect.arrayContaining(['Huế', 'Lâm Đồng']));
  });

  it('drops empty values and street-level addresses but keeps other unclassified text', () => {
    expect(values([['', 3], ['   ', 1], ['12 Nguyễn Huệ', 2], ['Số 5, Ngõ 7', 1], ['Quận 3', 1], ['Vịnh Hạ Long', 1]]))
      .toEqual(expect.arrayContaining(['Quận 3', 'Vịnh Hạ Long']));
    expect(values([['12 Nguyễn Huệ', 2], ['Số 5, Ngõ 7', 1], ['', 3]])).toEqual([]);
  });

  it('orders by how many listings use the place and respects the limit', () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({ location: `Điểm ${String.fromCharCode(65 + (i % 26))}${i}`, count: i + 1 }));
    const result = buildLocationSuggestions(rows, 5);
    expect(result).toHaveLength(5);
    expect(result[0].count).toBeGreaterThanOrEqual(result[4].count);
  });
});

describe('ListingsService.findLocations', () => {
  it('groups every public listing without paging and returns only normalized place names', async () => {
    const groupBy = jest.fn<(args: unknown) => Promise<unknown[]>>().mockResolvedValue([
      { location: 'Quận 1, TP. Hồ Chí Minh', _count: { _all: 3 } },
      { location: 'Sa Pa', _count: { _all: 1 } },
    ]);
    const prisma = { listing: { groupBy } } as unknown as PrismaService;

    const result = await new ListingsService(prisma, { get: () => '' } as never).findLocations();

    const args = groupBy.mock.calls[0][0] as { by: string[]; where: unknown; take?: number };
    expect(args.by).toEqual(['location']);
    expect(args.where).toEqual({ status: 'ACTIVE' });
    expect(args.take).toBeUndefined();
    expect(result.items).toEqual([{ value: 'Hồ Chí Minh', count: 3 }, { value: 'Sa Pa', count: 1 }]);
  });
});
