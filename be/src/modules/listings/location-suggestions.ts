export interface LocationRow {
  location: string;
  count: number;
}

export interface LocationSuggestion {
  value: string;
  count: number;
}

// Street, ward and house-number level text: too specific to suggest, and the part most likely to be a private address.
// Vietnamese letters are not \w, so word ends are checked with \p{L} instead of \b.
const ADDRESS_LEVEL =
  /^(\d|số(?!\p{L})|ngõ(?!\p{L})|ngách(?!\p{L})|hẻm(?!\p{L})|đường(?!\p{L})|phố(?!\p{L})|phường(?!\p{L})|p\.|xã(?!\p{L})|thôn(?!\p{L})|ấp(?!\p{L})|khu phố(?!\p{L})|tổ(?!\p{L}))/iu;
// District level units are skipped when a city or area is also present.
const DISTRICT_LEVEL = /^(quận(?!\p{L})|q\.|huyện(?!\p{L})|h\.|thị xã(?!\p{L})|tx\.)/iu;
// "TP. Hồ Chí Minh" and "Hồ Chí Minh" are the same place, and the shorter form is contained in both.
const ADMIN_PREFIX = /^(thành phố|tỉnh|thị trấn|tp|tt)(?:\.\s*|\s+)/iu;

const MAX_PER_LOCATION = 3;

export function cleanLocation(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

// Lower case without diacritics, so "Đà Lạt" and "da lat" merge.
export function foldKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function candidatesFor(location: string): string[] {
  const cleaned = cleanLocation(location);
  if (!cleaned) return [];

  const segments = cleaned.split(',').map(cleanLocation).filter(Boolean);
  const areas = segments.filter((s) => !ADDRESS_LEVEL.test(s) && !DISTRICT_LEVEL.test(s));
  if (areas.length > 0) {
    return areas
      .slice(-MAX_PER_LOCATION)
      .map((s) => cleanLocation(s.replace(ADMIN_PREFIX, '')) || s);
  }

  // Nothing reliable to extract: keep the original text, unless it is clearly a street address.
  return ADDRESS_LEVEL.test(cleaned) ? [] : [cleaned];
}

export function buildLocationSuggestions(rows: LocationRow[], limit = 30): LocationSuggestion[] {
  const groups = new Map<string, { counts: Map<string, number>; total: number }>();

  for (const row of rows) {
    // A place named twice in one location (e.g. "Đà Lạt, Đà Lạt") still counts once for that row.
    const keys = new Set<string>();
    for (const candidate of candidatesFor(row.location)) {
      const key = foldKey(candidate);
      if (!key || keys.has(key)) continue;
      keys.add(key);
      const group = groups.get(key) ?? { counts: new Map(), total: 0 };
      group.counts.set(candidate, (group.counts.get(candidate) ?? 0) + row.count);
      group.total += row.count;
      groups.set(key, group);
    }
  }

  return [...groups.values()]
    .map(({ counts, total }) => {
      const [value] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0];
      return { value, count: total };
    })
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'vi'))
    .slice(0, limit);
}
