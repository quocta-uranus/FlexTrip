'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/hooks/useSession';
import { getRefreshToken } from '@/lib/api/token';
import { useAuthStore } from '@/store/auth.store';

export function StaffGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const storedUser = useAuthStore((state) => state.user);
  const { data } = useMe();
  const user = data ?? storedUser;
  const isStaff = Boolean(user?.roles.includes('STAFF'));

  useEffect(() => {
    if (!getRefreshToken()) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user && !isStaff) router.replace(user.roles.includes('ADMIN') ? '/admin' : '/');
  }, [isStaff, pathname, router, user]);

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-6" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  return <>{children}</>;
}
