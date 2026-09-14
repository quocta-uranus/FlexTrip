'use client';

import { useEffect } from 'react';
import { userApi } from '@/lib/api/client';
import { getAccessToken, getRefreshToken } from '@/lib/api/token';
import { useAuthStore } from '@/store/auth.store';

/**
 * Runs once on app mount. If the user has a stored refresh token but no
 * in-memory access token (page reload scenario), silently restore auth.
 * tryRefresh() in client.ts handles redirect-to-login on failure.
 */
export function AuthBootstrap() {
  const { setUser, setAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated || getAccessToken()) return;
    if (!getRefreshToken()) return;

    // userApi.me() triggers 401 → tryRefresh() → retries with new token.
    // After this resolves, tryRefresh has already stored the new tokens.
    userApi
      .me()
      .then((user) => {
        // Hydrate Zustand store. The tokens in localStorage/memory are
        // already correct (set by tryRefresh internally).
        const at = getAccessToken() ?? '';
        const rt = getRefreshToken() ?? '';
        setAuth(user, at, rt);
      })
      .catch(() => {
        // tryRefresh already cleared tokens and is redirecting to /login.
        useAuthStore.getState().clearAuth();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
