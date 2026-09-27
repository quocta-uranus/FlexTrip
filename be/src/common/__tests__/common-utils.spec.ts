import { Prisma } from '@prisma/client';
import { toCsv } from '../csv.util';
import { normalizeVi } from '../text.util';
import { toNumber, sumDecimal } from '../money.util';
import { resolveRange } from '../dto/date-range.dto';
import { paginate } from '../dto/pagination.dto';

const BOM = String.fromCharCode(0xfeff);

describe('common utils', () => {
  it('toCsv escapes quotes, commas and newlines and prefixes BOM', () => {
    const csv = toCsv([{ a: 'x,y', b: 'he said "hi"', c: 'l1\nl2', d: 5 }], [
      { header: 'A', value: (r) => r.a },
      { header: 'B', value: (r) => r.b },
      { header: 'C', value: (r) => r.c },
      { header: 'D', value: (r) => r.d },
    ]);
    expect(csv).toBe(BOM + 'A,B,C,D\r\n"x,y","he said ""hi""","l1\nl2",5\r\n');
  });

  it('toCsv neutralises spreadsheet formulas', () => {
    expect(toCsv([{ a: '=HYPERLINK("x")' }], [{ header: 'A', value: (r) => r.a }]))
      .toBe(BOM + 'A\r\n"\'=HYPERLINK(""x"")"\r\n');
  });

  it('normalizeVi strips diacritics, đ and case', () => {
    expect(normalizeVi('Quận 1, TP.Hồ Chí Minh')).toBe('quan 1, tp.ho chi minh');
    expect(normalizeVi('Đà Lạt')).toBe('da lat');
  });

  it('money helpers', () => {
    expect(toNumber(new Prisma.Decimal('1234.50'))).toBe(1234.5);
    expect(toNumber(null)).toBeNull();
    expect(sumDecimal([new Prisma.Decimal(1), new Prisma.Decimal('2.5')]).toString()).toBe('3.5');
  });

  it('resolveRange defaults and previous period of equal length', () => {
    const r = resolveRange({ from: '2026-09-01', to: '2026-09-30' }, 30);
    expect(r.from.toISOString()).toBe('2026-08-31T17:00:00.000Z'); // 00:00 VN
    expect(r.to.toISOString()).toBe('2026-09-30T16:59:59.999Z');
    expect(r.prevTo.getTime()).toBe(r.from.getTime() - 1);
    expect(r.prevTo.getTime() - r.prevFrom.getTime()).toBe(r.to.getTime() - r.from.getTime());
  });

  it('paginate', () => {
    expect(paginate([1, 2], 45, { page: 2, limit: 20 })).toEqual({
      items: [1, 2], total: 45, page: 2, limit: 20, totalPages: 3,
    });
  });
});
