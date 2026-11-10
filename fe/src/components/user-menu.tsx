'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, User, Wallet, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuthMutations';

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(-2)
    .join('');
}

export function UserMenu() {
  const { user, isAuthenticated } = useAuthStore();
  const { mutate: logout, isPending } = useLogout();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Đóng khi click ngoài
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Chưa đăng nhập → 2 nút Đăng nhập / Đăng ký
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105"
          style={{ background: '#2a7bd9' }}
        >
          Đăng nhập
        </Link>
        <Link
          href="/register"
          className="rounded-full border bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-slate-50"
          style={{ borderColor: '#e2e8f3', color: '#0f1729' }}
        >
          Đăng ký
        </Link>
      </div>
    );
  }

  const roles = (user.roles ?? []) as string[];
  const isProvider = roles.includes('PROVIDER');
  const isStaff = roles.includes('STAFF');
  const profileHref = isStaff ? '/staff/complete-profile' : isProvider ? '/profile/shop' : '/profile/travel';
  const initials = getInitials(user.name);

  function handleLogout() {
    logout();
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border bg-white px-2 py-1.5 pr-3 transition-shadow hover:shadow-md"
        style={{ borderColor: '#e2e8f3' }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="flex size-8 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{
            background:
              'linear-gradient(135deg, #2a7bd9 0%, #5fd6cd 100%)',
          }}
        >
          {initials || 'U'}
        </span>
        <span className="hidden text-sm font-semibold text-slate-900 sm:inline">
          {user.name?.split(' ')[0] || 'Tôi'}
        </span>
        <ChevronDown
          className={`size-4 text-slate-500 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border bg-white shadow-2xl"
          style={{ borderColor: '#e2e8f3' }}
          role="menu"
        >
          {/* Header — thông tin user */}
          <div
            className="border-b px-4 py-3"
            style={{ borderColor: '#e2e8f3' }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{
                  background:
                    'linear-gradient(135deg, #2a7bd9 0%, #5fd6cd 100%)',
                }}
              >
                {initials || 'U'}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user.name}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {roles.map((r) => (
                <span
                  key={r}
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: 'rgba(42,123,217,0.1)',
                    color: '#2a7bd9',
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <MenuItem
              icon={<User className="size-4" />}
              label={isProvider ? 'Hồ sơ shop' : 'Hồ sơ cá nhân'}
              href={profileHref}
            />
            <MenuItem
              icon={<Wallet className="size-4" />}
              label="Thanh toán & Ví"
              href="/profile/payments"
            />
            <MenuItem
              icon={<ShieldCheck className="size-4" />}
              label="Hồ sơ & Bảo mật"
              href="/profile"
            />
          </div>

          {/* Logout */}
          <div className="border-t" style={{ borderColor: '#e2e8f3' }}>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isPending}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
            >
              <LogOut className="size-4" />
              {isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
    >
      <span className="text-slate-500">{icon}</span>
      {label}
    </Link>
  );
}
