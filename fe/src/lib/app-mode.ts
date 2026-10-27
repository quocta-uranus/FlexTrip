export type AppMode = 'traveler' | 'provider';

const STORAGE_PREFIX = 'flextrip:mode:';

// Routes that only make sense in one mode. Everything else (profile, messages,
// notifications, a single booking or listing) works in both, so it keeps the saved mode.
const TRAVELER_ONLY = [/^\/search(\/|$)/, /^\/wishlist(\/|$)/, /^\/cart(\/|$)/, /^\/bookings(\/new)?$/, /^\/profile\/travel(\/|$)/];
const PROVIDER_ONLY = [/^\/dashboard(\/|$)/, /^\/profile\/shop(\/|$)/];

export function modeForPath(pathname: string): AppMode | null {
  if (PROVIDER_ONLY.some((p) => p.test(pathname))) return 'provider';
  if (TRAVELER_ONLY.some((p) => p.test(pathname))) return 'traveler';
  return null;
}

// Only a UI preference. Permissions always come from the roles the backend returns.
export function readStoredMode(userId: string | undefined): AppMode | null {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(STORAGE_PREFIX + userId);
    return value === 'traveler' || value === 'provider' ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredMode(userId: string, mode: AppMode) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + userId, mode);
  } catch {
    // Storage can be blocked; the mode then simply is not remembered.
  }
}

export function modeHome(mode: AppMode) {
  return mode === 'provider' ? '/dashboard' : '/';
}
