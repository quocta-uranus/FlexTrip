'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

const ADMIN_BLOCKED_ROUTES = [
  '/bookings',
  '/cart',
  '/messages',
  '/dashboard',
  '/profile/payments',
  '/profile/reviews',
  '/profile/preferences',
  '/profile/history',
  '/profile/shop',
  '/profile/travel',
  '/register-provider',
];

export function MarketplaceAccessBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const isAdmin = user?.roles?.includes('ADMIN') ?? false;
  const isBlocked = isAuthenticated && isAdmin && ADMIN_BLOCKED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  useEffect(() => {
    if (isBlocked) router.replace('/admin');
  }, [isBlocked, router]);

  if (isBlocked) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-6">
        <p className="text-sm text-slate-500">Đang chuyển về trang quản trị…</p>
      </main>
    );
  }

  return children;
}
