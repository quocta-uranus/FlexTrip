'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuthMutations';
import { useCart } from '@/hooks/useCart';

const BASE_NAV_LINKS = [
  { href: '/search', label: 'Khám phá', icon: '🔍' },
  { href: '/bookings', label: 'Đặt thuê', icon: '📋' },
  { href: '/messages', label: 'Tin nhắn', icon: '💬' },
];

const PROVIDER_NAV_LINKS = [
  { href: '/search', label: 'Khám phá', icon: '🔍' },
  { href: '/dashboard/bookings', label: 'Đơn thuê', icon: '📋' },
  { href: '/dashboard/listings', label: 'Sản phẩm', icon: '🏕️' },
  { href: '/messages', label: 'Tin nhắn', icon: '💬' },
];

function CartIcon() {
  const { data: cart } = useCart();
  const count = cart?.items.length ?? 0;
  return (
    <Link
      href="/cart"
      className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[#f1f5fa]"
      title="Giỏ hàng"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ color: '#5a6b85' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {count > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ background: '#2a7bd9' }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const { mutate: logout } = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);

  const isProvider = user?.roles?.includes('PROVIDER') ?? false;
  const NAV_LINKS = isProvider ? PROVIDER_NAV_LINKS : BASE_NAV_LINKS;

  // Hide on auth pages and landing page (LandingHeader handles those)
  if (pathname === '/' ||
      pathname.startsWith('/login') || pathname.startsWith('/register') ||
      pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password') ||
      pathname.startsWith('/2fa-challenge')) {
    return null;
  }

  return (
    <nav
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{ background: 'rgba(255,255,255,0.92)', borderColor: '#DCEFFB' }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg, #2a7bd9 0%, #92eee8 100%)' }}
          >
            <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: '#0f1729' }}>FlexTrip</span>
        </Link>

        {/* Search bar (desktop) */}
        <Link
          href="/search"
          className="hidden sm:flex flex-1 max-w-sm items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all hover:shadow-md"
          style={{ borderColor: '#DCEFFB', background: '#f1f5fa', color: '#8694ad' }}
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Tìm thiết bị, địa điểm, trải nghiệm…</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all"
                style={{
                  color: active ? '#2a7bd9' : '#5a6b85',
                  background: active ? 'rgba(42,123,217,0.08)' : 'transparent',
                }}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right: user / auth */}
        <div className="flex items-center gap-2 shrink-0">

          {isAuthenticated && <CartIcon />}

          {isAuthenticated && user ? (
            <div className="relative">
              <button
                id="nav-user-menu-btn"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all hover:shadow-sm"
                style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #2a7bd9, #92eee8)' }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="max-w-[100px] truncate hidden sm:block">{user.name}</span>
                <svg className="h-3.5 w-3.5 text-[#8694ad]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border bg-white py-1.5 shadow-xl"
                    style={{ borderColor: '#DCEFFB' }}
                  >
                    <div className="border-b px-4 py-2.5" style={{ borderColor: '#DCEFFB' }}>
                      <p className="text-xs font-semibold" style={{ color: '#0f1729' }}>{user.name}</p>
                      <p className="text-xs truncate" style={{ color: '#8694ad' }}>{user.email}</p>
                    </div>
                    {[
                      { href: '/profile', label: 'Hồ sơ', icon: '👤' },
                      { href: '/bookings', label: 'Đặt thuê của tôi', icon: '📋' },
                      { href: '/messages', label: 'Tin nhắn', icon: '💬' },
                      { href: '/profile/payments', label: 'Thanh toán & Ví', icon: '💳' },
                      ...(isProvider ? [
                        { href: '/dashboard/listings', label: 'Quản lý sản phẩm', icon: '📦' },
                        { href: '/dashboard', label: 'Provider Dashboard', icon: '🏕️' },
                      ] : []),
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-[#f1f5fa]"
                        style={{ color: '#0f1729' }}
                      >
                        <span>{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                    <div className="mt-1 border-t pt-1" style={{ borderColor: '#DCEFFB' }}>
                      <button
                        id="nav-logout-btn"
                        onClick={() => { setMenuOpen(false); logout(); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-red-50"
                        style={{ color: '#dc2626' }}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-[#f1f5fa]"
                style={{ color: '#2a7bd9' }}
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                style={{ background: '#2a7bd9' }}
              >
                Đăng ký
              </Link>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            id="nav-mobile-menu-btn"
            className="flex h-9 w-9 items-center justify-center rounded-lg md:hidden"
            style={{ color: '#5a6b85' }}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav links */}
      {menuOpen && (
        <div className="border-t md:hidden" style={{ borderColor: '#DCEFFB', background: '#fff' }}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-6 py-3 text-sm font-medium"
              style={{ color: '#0f1729' }}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
