const STORAGE_KEY = 'flextrip:guest-wishlist:v1';
const CHANGE_EVENT = 'flextrip:guest-wishlist-change';
const MAX_GUEST_ITEMS = 500;
const EMPTY: string[] = [];
let cachedRaw: string | null | undefined;
let cachedIds: string[] = EMPTY;

function sanitize(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))]
    .slice(0, MAX_GUEST_ITEMS);
}

export function getGuestWishlist(): string[] {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedIds;
    cachedRaw = raw;
    cachedIds = sanitize(JSON.parse(raw ?? '[]'));
    return cachedIds;
  } catch {
    cachedRaw = undefined;
    cachedIds = EMPTY;
    return cachedIds;
  }
}

function save(ids: string[]) {
  if (typeof window === 'undefined') return;
  const next = sanitize(ids);
  const raw = JSON.stringify(next);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedIds = next;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function addGuestWishlist(listingId: string) {
  save([...getGuestWishlist(), listingId]);
}

export function removeGuestWishlist(listingId: string) {
  save(getGuestWishlist().filter((id) => id !== listingId));
}

export function removeProcessedGuestWishlist(listingIds: readonly string[]) {
  const processed = new Set(listingIds);
  save(getGuestWishlist().filter((id) => !processed.has(id)));
}

export function subscribeGuestWishlist(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}
