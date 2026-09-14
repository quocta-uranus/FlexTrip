/**
 * accessToken: in-memory only (cleared on page reload — 15 min TTL from BE).
 * refreshToken: localStorage (persists across tabs and browser restarts — 7d TTL from BE).
 * flextrip_authed cookie: non-httpOnly presence indicator for middleware.
 */

const RT_KEY = 'flextrip_rt';
const AUTH_COOKIE = 'flextrip_authed';

let _accessToken: string | null = null;

export const getAccessToken = (): string | null => _accessToken;

export const setAccessToken = (token: string | null): void => {
  _accessToken = token;
};

export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(RT_KEY);
};

export const setRefreshToken = (token: string | null): void => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(RT_KEY, token);
    document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
  } else {
    localStorage.removeItem(RT_KEY);
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
  }
};
