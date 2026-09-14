import { create } from 'zustand';
import type { UserProfile } from '@/lib/api/client';
import { setAccessToken, setRefreshToken } from '@/lib/api/token';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;

  setAuth: (user: UserProfile, accessToken: string, refreshToken: string) => void;
  setUser: (user: UserProfile) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  setAuth(user, accessToken, refreshToken) {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    set({ user, isAuthenticated: true });
  },

  setUser(user) {
    set({ user });
  },

  clearAuth() {
    setAccessToken(null);
    setRefreshToken(null);
    set({ user: null, isAuthenticated: false });
  },
}));
