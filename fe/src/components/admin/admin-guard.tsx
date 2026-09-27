'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMe } from '@/hooks/useSession';
import { useAuthStore } from '@/store/auth.store';
import { getRefreshToken } from '@/lib/api/token';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const storeUser = useAuthStore((s) => s.user);
  const { data } = useMe();
  const me = data ?? storeUser;
  const isAdmin = !!me?.roles.includes('ADMIN');

  useEffect(() => {
    if (!getRefreshToken()) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (me && !isAdmin) router.replace('/');
  }, [me, isAdmin, pathname, router]);

  if (!isAdmin) {
    return (
      <div className="space-y-4 p-8" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  return <>{children}</>;
}
