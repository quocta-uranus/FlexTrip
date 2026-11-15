'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/hooks/useSession';
import { getRefreshToken } from '@/lib/api/token';
import { useAuthStore } from '@/store/auth.store';

// Khu vực của Provider: tài khoản chưa được duyệt (hoặc bị từ chối) không được vào.
export default function ProviderDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const storedUser = useAuthStore((state) => state.user);
  const { data } = useMe();
  const user = data ?? storedUser;
  const isProvider = Boolean(user?.roles.includes('PROVIDER'));

  useEffect(() => {
    if (!getRefreshToken()) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user && !isProvider) router.replace('/become-provider/status');
  }, [isProvider, pathname, router, user]);

  if (!isProvider) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 pb-8 pt-28" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return children;
}
