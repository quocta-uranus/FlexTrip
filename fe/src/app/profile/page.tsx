"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMe } from '@/hooks/useSession';

/**
 * /profile — redirect tự động theo role:
 *   PROVIDER  → /profile/shop
 *   TRAVELER  → /profile/travel
 *   ADMIN     → /profile/admin
 *   khác      → /profile/travel
 */
export default function ProfileHubPage() {
  const router = useRouter();
  const { data: me } = useMe();

  useEffect(() => {
    if (!me) return;
    const roles = (me.roles ?? []) as string[];
    if (roles.includes('PROVIDER')) {
      router.replace('/profile/shop');
    } else if (roles.includes('TRAVELER')) {
      router.replace('/profile/travel');
    } else if (roles.includes('ADMIN')) {
      router.replace('/profile/admin');
    } else {
      router.replace('/profile/travel');
    }
  }, [me, router]);

  // Loading state trong khi chờ user data
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4"
          style={{ borderColor: '#e2e8f3', borderTopColor: '#2a7bd9' }}
        />
        <p className="text-sm" style={{ color: '#5a6b85' }}>Đang chuyển hồ sơ…</p>
      </div>
    </div>
  );
}
