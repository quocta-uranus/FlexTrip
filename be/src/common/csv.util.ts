export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | Date | null | undefined;
}

const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const BOM = String.fromCharCode(0xfeff);

function cell(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  let s = raw instanceof Date ? raw.toISOString() : String(raw);
  if (typeof raw === 'string' && FORMULA_PREFIX.test(s)) s = `'${s}`;
  return /[",\r\n']/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((c) => cell(c.header)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(','));
  // BOM so Excel opens UTF-8 Vietnamese correctly.
  return BOM + lines.join('\r\n') + '\r\n';
}
