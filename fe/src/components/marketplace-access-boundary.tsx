'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

// Auth pages admin can still visit (login/register flows)
const ADMIN_ALLOWED_PATHS = new Set([
  '/login',
  '/register',
  '/2fa-challenge',
  '/forgot-password',
  '/reset-password',
]);

// Prefix-based paths admin can visit
const ADMIN_ALLOWED_PREFIXES = ['/admin', '/profile'];

export function MarketplaceAccessBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const isAdmin = user?.roles?.includes('ADMIN') ?? false;

  const isAdminBlocked =
    isAuthenticated &&
    isAdmin &&
    !ADMIN_ALLOWED_PATHS.has(pathname) &&
    !ADMIN_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (isAdminBlocked) router.replace('/admin');
  }, [isAdminBlocked, router]);

  if (isAdminBlocked) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-6">
        <p className="text-sm text-slate-500">Đang chuyển về trang quản trị…</p>
      </main>
    );
  }

  return children;
}
