'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { modeForPath, readStoredMode } from '@/lib/app-mode';
import { useAuthStore } from '@/store/auth.store';
import { useModeStore } from '@/store/mode.store';

// Keeps the saved mode in step with where the user actually is. Depends on the
// path (not on the saved mode) so an explicit switch is never reverted mid-navigation.
export function ModeSync() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const setMode = useModeStore((s) => s.setMode);
  const userId = user?.id;
  const roles = user?.roles ?? [];
  const hasProvider = roles.includes('PROVIDER');
  const hasTraveler = roles.includes('TRAVELER');

  useEffect(() => {
    if (!userId) return;
    // Provider access is gone: fall back to Traveler instead of keeping a mode the account cannot use.
    if (!hasProvider) {
      if (readStoredMode(userId) === 'provider') setMode(userId, 'traveler');
      return;
    }
    if (!hasTraveler) return;
    const implied = modeForPath(pathname);
    if (implied && readStoredMode(userId) !== implied) setMode(userId, implied);
  }, [pathname, userId, hasProvider, hasTraveler, setMode]);

  return null;
}
