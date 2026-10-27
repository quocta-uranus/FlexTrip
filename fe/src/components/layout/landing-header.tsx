'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PillButton } from '@/components/ui/pill-button';
import { Menu, X, ChevronDown, Compass, User, ClipboardList, Package, LogOut, Heart } from 'lucide-react';
import { useLogout } from '@/hooks/useAuthMutations';
import { WishlistHeaderLink } from '@/components/wishlist-header-link';

export function LandingHeader() {
  const { user, isAuthenticated } = useAuthStore();
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isProvider = user?.roles?.includes('PROVIDER') ?? false;
  const isStaff = user?.roles?.includes('STAFF') ?? false;
  const isAdmin = user?.roles?.includes('ADMIN') ?? false;

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';
  const profileHref = isStaff ? '/staff/complete-profile' : '/profile';

  const NAV_ITEMS = [
    { href: '#top', label: 'Trang chủ' },
    { href: '#categories', label: 'Danh mục' },
    { href: '#how-it-works', label: 'Cách hoạt động' },
    { href: '#featured', label: 'Khám phá' },
    isProvider
      ? { href: '/dashboard', label: 'Dashboard' }
      : { href: '/become-provider', label: 'Trở thành Provider' },
  ];

  return (
    <header className="fixed top-[24px] sm:top-[28px] left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2.5rem)] max-w-5xl z-50 transition-all duration-300">
      {/* Wayfare Ivory White Floating Pill Shell (#FFFFFF / #F7F7F5) */}
      <div
        className={`h-15 sm:h-16 px-4 sm:px-6 rounded-full flex items-center justify-between gap-4 transition-all duration-300 ${
          scrolled
            ? 'bg-[#FFFFFF]/96 backdrop-blur-md border border-black/8 shadow-[0_12px_32px_rgba(20,19,18,0.08)]'
            : 'bg-[#F7F7F5]/92 backdrop-blur-md border border-black/6 shadow-[0_8px_24px_rgba(20,19,18,0.06)]'
        }`}
      >
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#1877F2] via-[#00A3FF] to-[#00D8F6] text-white flex items-center justify-center shadow-sm shadow-[#00A3FF]/25 transition-transform duration-200 group-hover:scale-105">
            <Compass className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#161513]">
            Flex<span className="text-[#00A3FF]">Trip</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-3.5 py-1.5 rounded-full text-[#161513] hover:text-[#00A3FF] hover:bg-black/5 transition-colors duration-200 font-medium"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <WishlistHeaderLink variant="landing" />
          {!isAuthenticated ? (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex text-sm font-semibold text-[#161513] hover:text-[#00A3FF] px-3.5 py-1.5 rounded-full hover:bg-black/5 transition-colors"
              >
                Đăng nhập
              </Link>
              <PillButton href="/register" variant="brand" size="sm" className="hidden sm:inline-flex">
                Đăng ký
              </PillButton>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full border border-black/8 bg-black/5 pl-1.5 pr-2.5 py-1 text-sm font-medium text-[#161513] hover:bg-black/10 transition-all shadow-sm cursor-pointer"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-[#EFECE6] text-[#161513] text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[100px] truncate hidden sm:block font-semibold text-[#161513]">
                  {user?.name?.split(' ')[0]}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#161513]" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-56 bg-white rounded-2xl border border-black/8 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 border-b border-black/6">
                    <p className="text-xs font-bold text-[#161513] truncate">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    {isStaff && (
                      <>
                        <Link
                          href="/staff"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#161513] hover:bg-[#F7F5F0] rounded-xl mx-1 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <ClipboardList className="h-4 w-4 text-slate-500" />
                          Dashboard
                        </Link>
                        <Link
                          href="/staff/bookings"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#161513] hover:bg-[#F7F5F0] rounded-xl mx-1 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <ClipboardList className="h-4 w-4 text-slate-500" />
                          Booking của tôi
                        </Link>
                      </>
                    )}

                    <Link
                      href={profileHref}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#161513] hover:bg-[#F7F5F0] rounded-xl mx-1 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4 text-slate-500" />
                      Hồ sơ cá nhân
                    </Link>

                    {!isStaff && (
                      <Link
                        href="/bookings"
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#161513] hover:bg-[#F7F5F0] rounded-xl mx-1 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <ClipboardList className="h-4 w-4 text-slate-500" />
                        Đơn thuê của tôi
                      </Link>
                    )}

                    {!isAdmin && !isStaff && (
                      <Link
                        href="/wishlist"
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#161513] hover:bg-[#F7F5F0] rounded-xl mx-1 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Heart className="h-4 w-4 text-slate-500" />
                        Danh sách yêu thích
                      </Link>
                    )}

                    {(isProvider || isAdmin) && (
                      <Link
                        href="/dashboard/listings"
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#161513] hover:bg-[#F7F5F0] rounded-xl mx-1 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Package className="h-4 w-4 text-slate-500" />
                        Quản lý thiết bị
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-black/6 mt-1 pt-1">
                    <button
                      onClick={() => {
                        logout.mutate();
                        setUserMenuOpen(false);
                      }}
                      className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl mx-1 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 text-red-500" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-full text-[#161513] hover:bg-black/5 transition-colors cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Mở menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileOpen && (
        <div className="md:hidden mt-2 p-3 rounded-3xl bg-white/98 backdrop-blur-xl border border-black/8 shadow-2xl text-[#161513] flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="py-2.5 px-4 text-sm font-semibold rounded-2xl hover:bg-[#F7F5F0] transition-colors text-[#161513]"
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}

          {!isAuthenticated && (
            <div className="flex gap-2.5 mt-2 pt-3 border-t border-black/6">
              <Link href="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                <button className="w-full h-10 rounded-full font-semibold text-sm border border-black/15 text-[#161513] hover:bg-black/5 transition-colors">
                  Đăng nhập
                </button>
              </Link>
              <div className="flex-1" onClick={() => setMobileOpen(false)}>
                <PillButton href="/register" variant="brand" size="md" className="w-full">
                  Đăng ký
                </PillButton>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
