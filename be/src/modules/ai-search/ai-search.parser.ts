export const SEARCH_CATEGORIES = [
  'CAMERA_GEAR',
  'CAMPING',
  'TREKKING',
  'BEACH',
  'TRAVEL_ESSENTIALS',
  'FAMILY',
] as const;

export const SEARCH_SORTS = ['newest', 'price_asc', 'price_desc', 'rating'] as const;

export interface ParsedSearchFilters {
  keyword?: string;
  location?: string;
  category?: (typeof SEARCH_CATEGORIES)[number];
  minPrice?: number;
  maxPrice?: number;
  dateFrom?: string;
  dateTo?: string;
  sort?: (typeof SEARCH_SORTS)[number];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim().slice(0, max);
  return text || undefined;
}

function cleanPrice(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
}

function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

// LLM output is untrusted: only keep values the search API would accept, so a bad answer
// degrades to a looser search instead of a 400 from /listings.
export function sanitizeFilters(raw: unknown, today: string): ParsedSearchFilters {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: ParsedSearchFilters = {};

  const keyword = cleanText(r.keyword, 60);
  if (keyword) out.keyword = keyword;
  const location = cleanText(r.location, 80);
  if (location) out.location = location;

  if (SEARCH_CATEGORIES.includes(r.category as (typeof SEARCH_CATEGORIES)[number])) {
    out.category = r.category as (typeof SEARCH_CATEGORIES)[number];
  }
  if (SEARCH_SORTS.includes(r.sort as (typeof SEARCH_SORTS)[number]) && r.sort !== 'newest') {
    out.sort = r.sort as (typeof SEARCH_SORTS)[number];
  }

  let minPrice = cleanPrice(r.minPrice);
  let maxPrice = cleanPrice(r.maxPrice);
  if (minPrice !== undefined && maxPrice !== undefined && maxPrice < minPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  if (minPrice) out.minPrice = minPrice;
  if (maxPrice !== undefined) out.maxPrice = maxPrice;

  const from = typeof r.dateFrom === 'string' ? r.dateFrom : '';
  const to = typeof r.dateTo === 'string' ? r.dateTo : '';
  if (isValidDate(from) && isValidDate(to) && from >= today && to >= from) {
    out.dateFrom = from;
    out.dateTo = to;
  }

  return out;
}

export function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// LLMs miscount weekdays, so relative dates ("cuối tuần này") are resolved here and handed over as fixed anchors
export function buildDateAnchors(now: Date): { date: string; anchors: string } {
  const vn = new Date(now.getTime() + 7 * 3_600_000);
  const base = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate());
  const iso = (offset: number) => new Date(base + offset * 86_400_000).toISOString().slice(0, 10);
  const dow = vn.getUTCDay(); // 0 = Chủ nhật
  const names = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  // From Saturday on, "cuối tuần này" is the current weekend; otherwise the coming one
  const toSat = dow === 6 ? 0 : dow === 0 ? -1 : 6 - dow;
  const sat = toSat;
  const nextSat = sat + 7;

  const date = iso(0);
  const anchors = [
    `Mốc ngày: hôm nay ${date} (${names[dow]}); ngày mai ${iso(1)}; ngày kia ${iso(2)}.`,
    `Cuối tuần này: ${iso(sat)} đến ${iso(sat + 1)}. Cuối tuần sau: ${iso(nextSat)} đến ${iso(nextSat + 1)}.`,
    `Tuần sau bắt đầu từ ${iso(dow === 0 ? 1 : 8 - dow)}.`,
  ].join('\n');
  return { date, anchors };
}

// Short product phrases the LLM thinks the traveler may need; used as semantic queries, so keep them tight
export function sanitizeNeeds(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const needs = (raw as { needs?: unknown }).needs;
  if (!Array.isArray(needs)) return [];
  const seen = new Set<string>();
  for (const n of needs) {
    const text = cleanText(n, 40);
    if (text) seen.add(text);
    if (seen.size >= 5) break;
  }
  return [...seen];
}
