'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, History, LogOut, ShieldCheck, User, Wallet } from 'lucide-react';
import { cn } from 'cn';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuthMutations';
import { useProfileSavedStore } from '@/store/profile-saved.store';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/profile/travel', label: 'Hồ sơ cá nhân', icon: User, roles: ['TRAVELER', 'PROVIDER', 'ADMIN'] },
  { href: '/profile/shop', label: 'Hồ sơ shop', icon: User, roles: ['PROVIDER'] },
  { href: '/profile/security', label: 'Bảo mật', icon: ShieldCheck, roles: ['TRAVELER', 'PROVIDER', 'ADMIN'] },
  { href: '/profile/payments', label: 'Thanh toán & Ví', icon: Wallet, roles: ['TRAVELER', 'PROVIDER', 'ADMIN'] },
  { href: '/profile/history', label: 'Lịch sử thuê / cho thuê', icon: History, roles: ['TRAVELER', 'PROVIDER'] },
  { href: '/profile/notifications', label: 'Thông báo', icon: Bell, roles: ['TRAVELER', 'PROVIDER', 'ADMIN'] },
] as const;

const AVAILABLE_ROUTES = new Set([
  '/profile/travel',
  '/profile/shop',
  '/profile/payments',
  '/profile/history',
]);

const ROLE_LABELS: Record<string, string> = {
  TRAVELER: 'Traveler',
  PROVIDER: 'Provider',
  ADMIN: 'Admin',
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(-2)
    .join('');
}

export function ProfileSidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { savedAt } = useProfileSavedStore();
  const { mutate: logout } = useLogout();
  const [showSaved, setShowSaved] = useState(false);

  // Hiện badge "Đã lưu" trong 3 giây sau khi lưu
  useEffect(() => {
    if (!savedAt) return;
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [savedAt]);

  const name = user?.name ?? '…';
  const initials = user ? getInitials(user.name) : '?';
  const userRoles = user?.roles ?? [];
  const roleLabel = userRoles.map((r) => ROLE_LABELS[r] ?? r).join(' · ') ?? '';

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-6 border-r border-border bg-card px-4 py-7">
      <Link href="/" className="flex items-center gap-2.5 px-1">
        <span className="flex size-7 items-center justify-center rounded-[10px] bg-gradient-to-br from-brand-from to-brand-to">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12l7-7v4h11v6H10v4z" />
          </svg>
        </span>
        <span className="font-heading text-lg font-bold tracking-tight text-foreground">FlexTrip</span>
      </Link>

      <div className="flex items-center gap-2.5 rounded-2xl bg-muted p-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-from to-brand-to font-heading text-sm font-semibold text-white">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          {roleLabel && (
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          )}
          {/* Badge Đã lưu */}
          <div
            className={`mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-600 transition-all duration-300 ${
              showSaved ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
            }`}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Đã lưu hồ sơ
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isAvailable = AVAILABLE_ROUTES.has(item.href) &&
            item.roles.some((r) => userRoles.includes(r));
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (!isAvailable) {
            return (
              <div
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground/60"
              >
                <Icon className="size-5" strokeWidth={1.8} />
                <span>{item.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                isActive && 'bg-secondary text-secondary-foreground font-semibold hover:bg-secondary',
              )}
            >
              <Icon className="size-5" strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => logout()}
        className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
      >
        <LogOut className="size-5" strokeWidth={1.8} />
        <span>Đăng xuất</span>
      </button>
    </aside>
  );
}
