'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuthMutations';
import { useCart } from '@/hooks/useCart';
import { NotificationBell } from '@/components/notification-bell';
import { PillButton } from '@/components/ui/pill-button';
import { Compass, ShoppingBag, ChevronDown, User, ClipboardList, MessageSquare, CreditCard, Shield, Star, Package, LogOut, Menu, X } from 'lucide-react';

const BASE_NAV_LINKS = [
  { href: '/search', label: 'Khám phá', icon: '🔍' },
  { href: '/bookings', label: 'Đặt thuê', icon: '📋' },
  { href: '/messages', label: 'Tin nhắn', icon: '💬' },
];

const PROVIDER_NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/bookings', label: 'Đơn thuê', icon: '📋' },
  { href: '/dashboard/listings', label: 'Sản phẩm', icon: '🏕️' },
  { href: '/dashboard/reviews', label: 'Đánh giá', icon: '⭐' },
  { href: '/messages', label: 'Tin nhắn', icon: '💬' },
];

const STAFF_NAV_LINKS = [
  { href: '/staff', label: 'Lịch vận hành', icon: '🗓️' },
  { href: '/staff#mediations', label: 'Tranh chấp tại chỗ', icon: '⚖️' },
];

function CartIcon() {
  const { data: cart } = useCart();
  const count = cart?.items.length ?? 0;
  return (
    <Link
      href="/cart"
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#68655E] hover:text-[#141312] hover:bg-black/5 transition-colors"
      title="Giỏ hàng"
    >
      <ShoppingBag className="h-5 w-5" strokeWidth={2} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-black bg-[#F4B942] text-[#141312] shadow-xs">
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
  const isStaff = user?.roles?.includes('STAFF') ?? false;
  const isAdmin = user?.roles?.includes('ADMIN') ?? false;
  const NAV_LINKS = isAdmin
    ? [{ href: '/search', label: 'Xem marketplace', icon: '🔍' }]
    : isStaff
      ? STAFF_NAV_LINKS
      : isProvider
        ? PROVIDER_NAV_LINKS
        : BASE_NAV_LINKS;

  // Hide on pages that render LandingHeader, auth pages, and admin
  if (
    pathname === '/' ||
    pathname === '/register-provider' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/2fa-challenge')
  ) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[rgba(20,19,18,0.06)] bg-white/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="h-8 w-8 rounded-full bg-[#161513] text-[#F4B942] flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
            <Compass className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-[#141312]">
            Flex<span className="text-[#F4B942]">Trip</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1.5">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{ color: active ? '#ffffff' : undefined }}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-[#161513] !text-white shadow-xs'
                    : 'text-[#68655E] hover:text-[#141312] hover:bg-black/4'
                }`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right: user / auth */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isAuthenticated && user && <NotificationBell isProvider={isProvider} />}
          {isAuthenticated && !isAdmin && !isStaff && <CartIcon />}

          {isAuthenticated && user ? (
            <div className="relative">
              <button
                id="nav-user-menu-btn"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-black/8 bg-white/80 pl-1.5 pr-2.5 py-1 text-sm font-semibold text-[#141312] hover:bg-white hover:border-black/15 transition-all shadow-xs cursor-pointer"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EFECE6] text-xs font-bold text-[#141312]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="max-w-[100px] truncate hidden sm:block">{user.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#68655E]" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-black/8 bg-white py-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="border-b border-black/6 px-4 py-2.5">
                      <p className="text-xs font-bold text-[#141312] truncate">{user.name}</p>
                      <p className="text-xs text-[#68655E] truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      {[
                        ...(isAdmin
                          ? [
                              { href: '/admin', label: 'Bảng điều khiển Admin', icon: <Shield className="h-4 w-4 text-[#68655E]" /> },
                              { href: '/profile', label: 'Hồ sơ & bảo mật', icon: <User className="h-4 w-4 text-[#68655E]" /> },
                            ]
                          : [
                              { href: isStaff ? '/staff/complete-profile' : '/profile', label: 'Hồ sơ cá nhân', icon: <User className="h-4 w-4 text-[#68655E]" /> },
                              { href: '/bookings', label: 'Đặt thuê của tôi', icon: <ClipboardList className="h-4 w-4 text-[#68655E]" /> },
                              { href: '/messages', label: 'Tin nhắn', icon: <MessageSquare className="h-4 w-4 text-[#68655E]" /> },
                              { href: '/profile/payments', label: 'Thanh toán & Ví', icon: <CreditCard className="h-4 w-4 text-[#68655E]" /> },
                            ]),
                        ...(!isAdmin && isStaff
                          ? [{ href: '/staff', label: 'Bảng điều phối', icon: <ClipboardList className="h-4 w-4 text-[#68655E]" /> }]
                          : []),
                        ...(!isAdmin && isProvider
                          ? [
                              { href: '/dashboard/listings', label: 'Quản lý sản phẩm', icon: <Package className="h-4 w-4 text-[#68655E]" /> },
                              { href: '/dashboard/reviews', label: 'Quản lý đánh giá', icon: <Star className="h-4 w-4 text-[#68655E]" /> },
                              { href: '/dashboard', label: 'Provider Dashboard', icon: <Compass className="h-4 w-4 text-[#68655E]" /> },
                            ]
                          : []),
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#141312] rounded-xl mx-1 transition-colors hover:bg-[#F7F5F0]"
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>

                    <div className="mt-1 border-t border-black/6 pt-1">
                      <button
                        id="nav-logout-btn"
                        onClick={() => {
                          setMenuOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 rounded-xl mx-1 transition-colors hover:bg-red-50 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 text-red-500" />
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
                className="hidden sm:inline-flex text-sm font-semibold text-[#141312] hover:text-black px-3.5 py-1.5 rounded-full hover:bg-black/4 transition-colors"
              >
                Đăng nhập
              </Link>
              <PillButton href="/register" variant="primary" size="sm">
                Đăng ký
              </PillButton>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            id="nav-mobile-menu-btn"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#141312] hover:bg-black/5 md:hidden cursor-pointer"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav links */}
      {menuOpen && (
        <div className="border-t border-black/6 bg-white px-4 py-3 md:hidden flex flex-col gap-1 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active ? 'bg-[#161513] text-white' : 'text-[#141312] hover:bg-[#F7F5F0]'
                }`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
