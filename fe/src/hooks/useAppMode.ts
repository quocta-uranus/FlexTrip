import { usePathname } from 'next/navigation';
import { modeForPath, readStoredMode, type AppMode } from '@/lib/app-mode';
import { useAuthStore } from '@/store/auth.store';
import { useModeStore } from '@/store/mode.store';

// Effective mode for the current page. Roles decide what is allowed; the stored
// preference only picks between modes the account really has.
export function useAppMode() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pathname = usePathname();
  const userId = user?.id;
  const savedInMemory = useModeStore((s) => (userId ? s.modes[userId] : undefined));
  const setStoreMode = useModeStore((s) => s.setMode);

  const roles = user?.roles ?? [];
  const hasProvider = isAuthenticated && roles.includes('PROVIDER');
  const hasTraveler = isAuthenticated && roles.includes('TRAVELER');
  const isDual = hasProvider && hasTraveler;

  let mode: AppMode = 'traveler';
  if (hasProvider && !hasTraveler) mode = 'provider';
  else if (isDual) mode = modeForPath(pathname) ?? savedInMemory ?? readStoredMode(userId) ?? 'traveler';

  function setMode(next: AppMode) {
    if (userId && isDual) setStoreMode(userId, next);
  }

  return { mode, isDual, hasProvider, hasTraveler, setMode };
}
