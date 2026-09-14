'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, History, LogOut, ShieldCheck, User, Wallet } from 'lucide-react';
import { cn } from 'cn';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuthMutations';

const NAV_ITEMS = [
  { href: '/profile/travel', label: 'Hồ sơ cá nhân', icon: User },
  { href: '/profile/security', label: 'Bảo mật', icon: ShieldCheck },
  { href: '/profile/payments', label: 'Thanh toán & Ví', icon: Wallet },
  { href: '/profile/history', label: 'Lịch sử thuê / cho thuê', icon: History },
  { href: '/profile/notifications', label: 'Thông báo', icon: Bell },
] as const;

const AVAILABLE_ROUTES = new Set(['/profile/travel', '/profile/payments', '/profile/history']);

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
  const { mutate: logout } = useLogout();

  const name = user?.name ?? '…';
  const initials = user ? getInitials(user.name) : '?';
  const roleLabel = user?.roles?.map((r) => ROLE_LABELS[r] ?? r).join(' · ') ?? '';

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
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          {roleLabel && (
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          )}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isAvailable = AVAILABLE_ROUTES.has(item.href);
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
        className="flex items-center gap-3 border-t border-border px-3.5 pt-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <LogOut className="size-5" strokeWidth={1.8} />
        <span>Đăng xuất</span>
      </button>
    </aside>
  );
}
