'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { getRefreshToken } from '@/lib/api/token';
import { modeHome, type AppMode } from '@/lib/app-mode';
import { useAppMode } from '@/hooks/useAppMode';
import { useAuthStore } from '@/store/auth.store';
import { TravelerHome } from './traveler-home';

// AuthBootstrap restores the session asynchronously; wait for it so a logged-in
// traveler does not see the guest landing flash before the home swaps in.
const RESTORE_TIMEOUT_MS = 4000;

const subscribeNone = () => () => {};
const hasStoredSession = () => Boolean(getRefreshToken());
const noStoredSessionOnServer = () => false;

export function HomeGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { mode, isDual } = useAppMode();
  const storedSession = useSyncExternalStore(subscribeNone, hasStoredSession, noStoredSessionOnServer);
  const [gaveUp, setGaveUp] = useState(false);
  // The mode the account arrived in. Later flips (a notification or a task card opening Provider mode)
  // navigate by themselves and must not be turned into a redirect to the dashboard from here.
  const [arrival, setArrival] = useState<{ userId: string; mode: AppMode } | null>(null);
  if (isAuthenticated && user && arrival?.userId !== user.id) setArrival({ userId: user.id, mode });
  const arrivalMode = arrival && arrival.userId === user?.id ? arrival.mode : mode;

  useEffect(() => {
    const timer = setTimeout(() => setGaveUp(true), RESTORE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const roles = user?.roles ?? [];
  const isStaffOrAdmin = roles.includes('ADMIN') || roles.includes('STAFF');
  // An account with both roles sees the traveler home in Traveler mode and its dashboard in Provider mode.
  const sendToProvider = isAuthenticated && !isStaffOrAdmin && isDual && arrivalMode === 'provider';
  const showTravelerHome =
    isAuthenticated && !isStaffOrAdmin && roles.includes('TRAVELER') && (!roles.includes('PROVIDER') || arrivalMode === 'traveler');

  useEffect(() => {
    if (sendToProvider) router.replace(modeHome('provider'));
  }, [sendToProvider, router]);

  if (sendToProvider) return <div className="min-h-screen bg-sky-50" aria-busy="true" />;
  if (showTravelerHome && user) return <TravelerHome userName={user.name} />;
  if (storedSession && !isAuthenticated && !gaveUp) {
    return <div className="min-h-screen bg-sky-50" aria-busy="true" />;
  }
  return <>{children}</>;
}
