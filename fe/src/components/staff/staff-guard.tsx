'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/hooks/useSession';
import { getRefreshToken } from '@/lib/api/token';
import { useAuthStore } from '@/store/auth.store';
import { isStaffProfileComplete, STAFF_PROFILE_PATH } from '@/lib/staff-profile';

export function StaffGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const storedUser = useAuthStore((state) => state.user);
  const { data } = useMe();
  const user = data ?? storedUser;
  const isStaff = Boolean(user?.roles.includes('STAFF'));
  const profileComplete = Boolean(user && isStaffProfileComplete(user));
  const isProfilePage = pathname === STAFF_PROFILE_PATH;

  useEffect(() => {
    if (!getRefreshToken()) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user && !isStaff) {
      router.replace(user.roles.includes('ADMIN') ? '/admin' : '/');
      return;
    }
    if (isStaff && !profileComplete && !isProfilePage) {
      router.replace(STAFF_PROFILE_PATH);
      return;
    }
  }, [isProfilePage, isStaff, pathname, profileComplete, router, user]);

  if (!isStaff || (!profileComplete && !isProfilePage)) {
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
