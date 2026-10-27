'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuthMutations';
import { useCart } from '@/hooks/useCart';
import { NotificationBell } from '@/components/notification-bell';
import { WishlistHeaderLink } from '@/components/wishlist-header-link';
import { PillButton } from '@/components/ui/pill-button';
import { ProviderMenuItem } from '@/components/provider/provider-menu-item';
import { ModeSwitcher } from '@/components/layout/mode-switcher';
import { useAppMode } from '@/hooks/useAppMode';
import { modeHome, type AppMode } from '@/lib/app-mode';
import { jumpToSection } from '@/lib/scroll-to-section';
import {
  Compass,
  Search,
  ShoppingBag,
  ChevronDown,
  User,
  ClipboardList,
  CreditCard,
  Shield,
  Star,
  Package,
  LogOut,
  Menu,
  X,
  Globe,
  Heart,
} from 'lucide-react';

interface SiteHeaderProps {
  isRoot?: boolean;
}

const EXACT_ONLY_HREFS = ['/dashboard', '/staff'];

const GUEST_SECTIONS = [
  { id: 'categories', label: 'Danh mục' },
  { id: 'featured', label: 'Nổi bật' },
  { id: 'how-it-works', label: 'Cách hoạt động' },
  { id: 'provider', label: 'Trở thành Provider' },
  { id: 'faq', label: 'FAQ' },
] as const;


function isLinkActive(pathname: string, href: string) {
  if (href.includes('#')) return false;
  if (EXACT_ONLY_HREFS.includes(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CartIcon({ onDark = false }: { onDark?: boolean }) {
  const { data: cart } = useCart();
  const count = cart?.items.length ?? 0;
  return (
    <Link
      href="/cart"
      className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${onDark ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'}`}
      title="Giỏ hàng"
    >
      <ShoppingBag className="h-5 w-5" strokeWidth={2} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-black bg-brand text-white shadow-xs">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}

export function SiteHeader({ isRoot = false }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { mutate: logout } = useLogout();
  const { mode, isDual, setMode } = useAppMode();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const spyActive = pathname === '/' && !isAuthenticated;
  useEffect(() => {
    if (!spyActive) return;
    const onScroll = () => {
      let current: string | null = null;
      for (const { id } of GUEST_SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) current = id;
      }
      setActiveSection(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [spyActive]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Avoid double rendering when layout.tsx wraps pages that explicitly mount SiteHeader
  if (isRoot && pathname === '/') {
    return null;
  }

  // Hide on auth & standalone admin layouts
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/2fa-challenge')
  ) {
    return null;
  }

  const isProvider = user?.roles?.includes('PROVIDER') ?? false;
  const isStaff = user?.roles?.includes('STAFF') ?? false;
  const isAdmin = user?.roles?.includes('ADMIN') ?? false;

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .slice(-2)
        .join('')
    : 'U';

  // Accounts with both roles follow the selected mode; provider-only accounts keep the provider navigation.
  const providerNav = isProvider && (!isDual || mode === 'provider');
  const providerModeOnly = isDual && mode === 'provider';

  const profileHref = isStaff
    ? '/staff/complete-profile'
    : providerNav
      ? '/profile/shop'
      : '/profile/travel';

  function handleModeChange(next: AppMode) {
    setMode(next);
    setUserMenuOpen(false);
    setMobileOpen(false);
    router.push(modeHome(next));
  }

  // Role-specific navigation links for logged-in users
  const loggedInNavLinks = isAdmin
    ? [{ href: '/search', label: 'Xem marketplace' }]
    : isStaff
      ? [
          { href: '/staff', label: 'Lịch vận hành' },
          { href: '/staff#mediations', label: 'Tranh chấp tại chỗ' },
        ]
      : providerNav
        ? [
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/dashboard/bookings', label: 'Đơn thuê' },
            { href: '/dashboard/listings', label: 'Sản phẩm' },
            { href: '/dashboard/reviews', label: 'Đánh giá' },
          ]
        : [
            { href: '/search', label: 'Khám phá' },
            { href: '/bookings', label: 'Đơn của tôi' },
          ];

  const icon = (Icon: typeof User) => <Icon className="h-4 w-4 text-slate-500" />;
  const profileItem = { href: profileHref, label: 'Hồ sơ cá nhân', icon: icon(User) };
  const walletItem = { href: '/profile/payments', label: 'Thanh toán & Ví', icon: icon(CreditCard) };
  const travelerItems = [
    profileItem,
    { href: '/bookings', label: 'Đơn thuê của tôi', icon: icon(ClipboardList) },
    { href: '/wishlist', label: 'Thiết bị đã lưu', icon: icon(Heart) },
    walletItem,
  ];
  const providerItems = [
    profileItem,
    { href: '/dashboard', label: 'Provider Dashboard', icon: icon(Compass) },
    { href: '/dashboard/listings', label: 'Quản lý thiết bị', icon: icon(Package) },
    { href: '/dashboard/bookings', label: 'Đơn thuê', icon: icon(ClipboardList) },
    { href: '/dashboard/reviews', label: 'Quản lý đánh giá', icon: icon(Star) },
    walletItem,
  ];
  const menuItems = isAdmin
    ? [
        { href: '/admin', label: 'Bảng điều khiển Admin', icon: icon(Shield) },
        { href: '/profile', label: 'Hồ sơ cá nhân', icon: icon(User) },
      ]
    : isStaff
      ? [
          { href: '/staff', label: 'Dashboard', icon: icon(ClipboardList) },
          { href: '/staff/bookings', label: 'Booking của tôi', icon: icon(ClipboardList) },
          { href: '/staff/complete-profile', label: 'Hồ sơ cá nhân', icon: icon(User) },
        ]
      : isDual
        ? mode === 'provider' ? providerItems : travelerItems
        : isProvider
          ? [...travelerItems, ...providerItems.filter((item) => item !== profileItem && item !== walletItem)]
          : travelerItems;

  const onHome = pathname === '/';
  // Trên trang chủ, header Guest nằm trong suốt đè lên ảnh hero và chỉ thành thanh nền trắng khi cuộn.
  // Same on-hero look for guests and signed-in users; the content of the header does not change.
  const overlay = onHome && !scrolled;
  const guestNavLinks = GUEST_SECTIONS.map(({ id, label }) => ({
    id,
    label,
    href: onHome ? `#${id}` : `/#${id}`,
  }));

  const handleGuestLinkClick = (e: React.MouseEvent, id: string) => {
    if (!onHome) return;
    e.preventDefault();
    jumpToSection(id);
  };

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      router.push('/search');
      return;
    }
    router.push(`/search?keyword=${encodeURIComponent(searchQuery.trim())}`);
  }

  return (
    <header className={`fixed top-3.5 sm:top-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.25rem)] sm:w-[calc(100%-2.5rem)] ${overlay ? 'max-w-[1360px]' : 'max-w-5xl'} z-50 transition-all duration-300`}>
      <div
        className={`rounded-full flex items-center justify-between gap-2.5 sm:gap-4 transition-all duration-300 ${
          overlay
            ? 'h-14 sm:h-16 px-2 sm:px-6 bg-transparent border border-transparent text-white'
            : scrolled
              ? 'h-11 sm:h-12 px-3 sm:px-4 bg-white/95 backdrop-blur-xl border border-black/10 shadow-[0_12px_32px_rgba(10,37,51,0.12)]'
              : 'h-12 sm:h-13 px-4 sm:px-5 bg-white/90 backdrop-blur-md border border-black/6 shadow-[0_8px_24px_rgba(10,37,51,0.06)]'
        }`}
      >
        {/* Brand Logo */}
        <Link href="/" className={`flex items-center gap-2 shrink-0 group whitespace-nowrap ${overlay ? 'md:flex-1 md:basis-0' : ''}`}>
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-brand-blue via-brand to-brand-mint text-white flex items-center justify-center shadow-xs shadow-brand/30 transition-transform duration-200 group-hover:scale-105">
            <Compass className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <span className={`text-lg sm:text-xl font-extrabold tracking-tight ${overlay ? 'text-white' : 'text-ink'}`}>
            Flex<span className="text-brand">Trip</span>
          </span>
        </Link>

        {/* Center Nav / Search */}
        <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {isAuthenticated && (
            <form
              onSubmit={handleSearchSubmit}
              className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border focus-within:border-brand focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/20 transition-all text-xs mr-1 ${overlay ? 'bg-white/15 border-white/25 [&_input]:text-white [&_input]:placeholder:text-white/70 [&_svg]:text-white/80 focus-within:[&_input]:text-slate-800 focus-within:[&_input]:placeholder:text-slate-400 focus-within:[&_svg]:text-slate-400' : 'bg-slate-100/90 border-slate-200/80'}`}
            >
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm thiết bị..."
                className="w-24 lg:w-32 xl:w-40 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 font-medium"
              />
            </form>
          )}

          {isAuthenticated
            ? loggedInNavLinks.map((link) => {
                const active = isLinkActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition-all ${
                      overlay
                        ? active
                          ? 'bg-white/20 text-white'
                          : 'text-white/90 hover:text-white hover:bg-white/10'
                        : active
                          ? 'bg-sky-100 text-sky-700'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-black/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })
            : guestNavLinks.map((link) => {
                const active = onHome && activeSection === link.id;
                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    onClick={(e) => handleGuestLinkClick(e, link.id)}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      overlay
                        ? active
                          ? 'bg-white/20 text-white font-semibold'
                          : 'text-white/90 hover:text-white hover:bg-white/10'
                        : active
                          ? 'bg-sky-100 text-sky-700 font-semibold'
                          : 'text-slate-700 hover:text-brand hover:bg-black/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
        </div>

        {/* Right Section */}
        <div className={`flex items-center gap-1.5 sm:gap-2.5 shrink-0 ${overlay ? 'md:flex-1 md:basis-0 justify-end' : ''}`}>
          {/* Guest language toggle */}
          {!isAuthenticated && (
            <button
              type="button"
              onClick={() => setLang((prev) => (prev === 'vi' ? 'en' : 'vi'))}
              className={`hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${overlay ? 'text-white/90 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'}`}
              title="Đổi ngôn ngữ"
            >
              <Globe className={`h-3.5 w-3.5 ${overlay ? 'text-white/80' : 'text-slate-500'}`} />
              <span className="uppercase">{lang}</span>
            </button>
          )}

          {/* Logged in action icons */}
          {isAuthenticated && user && (
            <>
              <NotificationBell isProvider={providerNav} onDark={overlay} />
              {!isAdmin && !isStaff && !providerModeOnly && <CartIcon onDark={overlay} />}
              {!providerModeOnly && <WishlistHeaderLink variant={overlay ? 'overlay' : 'default'} />}
            </>
          )}

          {/* User Auth / Profile */}
          {isAuthenticated && user ? (
            <div className="relative" ref={menuRef}>
              <button
                id="site-header-user-btn"
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className={`flex items-center gap-2 rounded-full border pl-1.5 pr-2.5 py-1 text-sm font-semibold transition-all shadow-xs cursor-pointer whitespace-nowrap ${overlay ? 'border-white/25 bg-white/10 text-white hover:bg-white/20' : 'border-black/8 bg-white/80 text-ink hover:bg-white hover:border-black/15'}`}
              >
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.name}
                    width={28}
                    height={28}
                    unoptimized
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${overlay ? 'bg-white/20 text-white' : 'bg-slate-100 text-ink'}`}>
                    {initials}
                  </div>
                )}
                <span className="max-w-[100px] truncate hidden lg:block">{user.name}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${overlay ? 'text-white/80' : 'text-slate-500'} ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-black/8 bg-white py-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="border-b border-black/6 px-4 py-2.5">
                    <p className="text-xs font-bold text-ink truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(user.roles ?? []).map((r) => (
                        <span
                          key={r}
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-brand/10 text-brand-blue"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  {isDual && <ModeSwitcher mode={mode} onChange={handleModeChange} />}

                  <div className="py-1">
                    {menuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-800 rounded-xl mx-1 transition-colors hover:bg-slate-50 whitespace-nowrap"
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>

                  <ProviderMenuItem onNavigate={() => setUserMenuOpen(false)} />

                  <div className="mt-1 border-t border-black/6 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-danger rounded-xl mx-1 transition-colors hover:bg-red-50 cursor-pointer whitespace-nowrap"
                    >
                      <LogOut className="h-4 w-4 text-danger" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/login"
                className={`whitespace-nowrap text-sm font-semibold px-3 sm:px-3.5 py-1.5 rounded-full transition-colors ${overlay ? 'text-white hover:bg-white/10' : 'text-slate-800 hover:text-brand hover:bg-black/5'}`}
              >
                Đăng nhập
              </Link>
              <PillButton
                href="/register"
                size="sm"
                variant={overlay ? 'on-dark' : 'primary'}
                className={`whitespace-nowrap border-none font-semibold px-4 ${overlay ? 'bg-sky-200 hover:bg-sky-100' : 'hover:bg-brand-blue shadow-xs shadow-brand/30'}`}
              >
                Đăng ký
              </PillButton>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            id="site-header-mobile-toggle"
            className={`flex h-9 w-9 items-center justify-center rounded-full md:hidden cursor-pointer ${overlay ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-black/5'}`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden mt-2 p-4 rounded-3xl bg-white/98 backdrop-blur-xl border border-black/8 shadow-2xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <form onSubmit={(e) => { handleSearchSubmit(e); setMobileOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-100 border border-slate-200 text-sm">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm thiết bị..."
              className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400 font-medium"
            />
          </form>

          {isDual && <ModeSwitcher mode={mode} onChange={handleModeChange} />}

          <div className="flex flex-col gap-1 py-1">
            {isAuthenticated
              ? loggedInNavLinks.map((link) => {
                  const active = isLinkActive(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                        active ? 'bg-sky-100 text-sky-700' : 'text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })
              : guestNavLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={link.href}
                    onClick={(e) => {
                      handleGuestLinkClick(e, link.id);
                      setMobileOpen(false);
                    }}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                      onHome && activeSection === link.id ? 'bg-sky-100 text-sky-700' : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
          </div>

          {!isAuthenticated ? (
            <div className="flex flex-col gap-2 pt-2 border-t border-black/6">
              <div className="flex items-center justify-between px-2 text-xs text-slate-500">
                <span>Ngôn ngữ</span>
                <button
                  type="button"
                  onClick={() => setLang((prev) => (prev === 'vi' ? 'en' : 'vi'))}
                  className="font-bold text-slate-800 uppercase"
                >
                  {lang === 'vi' ? 'Tiếng Việt' : 'English'}
                </button>
              </div>
              <div className="flex gap-2">
                <Link href="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <button className="w-full h-10 rounded-full font-semibold text-sm border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors">
                    Đăng nhập
                  </button>
                </Link>
                <Link href="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <button className="w-full h-10 rounded-full font-semibold text-sm bg-brand text-white hover:bg-brand-blue shadow-xs transition-colors">
                    Đăng ký
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-black/6">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-danger rounded-2xl hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
