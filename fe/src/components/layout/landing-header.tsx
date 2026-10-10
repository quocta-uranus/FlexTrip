'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, X, ChevronDown } from 'lucide-react';

export function LandingHeader() {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setScrolled(window.scrollY > 20);
  }, []);

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

  const isAdmin = user?.roles?.includes('ADMIN') ?? false;

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';
  const profileHref = user?.roles.includes('STAFF') ? '/staff/complete-profile' : '/profile';

  // Inline styles to guarantee text color regardless of Tailwind cascade
  const textColor = scrolled ? '#1B364D' : '#ffffff';
  const textShadow = scrolled ? 'none' : '0 1px 4px rgba(0,0,0,0.6)';

  const headerStyle: React.CSSProperties = scrolled
    ? {
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(220,239,251,0.8)',
        boxShadow: '0 4px 20px -4px rgba(2,50,90,0.07)',
      }
    : {
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
        borderBottom: '1px solid transparent',
      };

  const navLinkStyle: React.CSSProperties = {
    color: textColor,
    textShadow,
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={headerStyle}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 sm:h-[68px] flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-[#1877F2] via-[#00A3FF] to-[#00D8F6] flex items-center justify-center shadow-md shadow-[#00A3FF]/30 transition-transform duration-300 group-hover:scale-105">
            <span className="text-white font-black text-sm leading-none tracking-tight">F</span>
          </div>
          <span
            className="font-extrabold text-lg sm:text-xl tracking-tight transition-colors duration-200"
            style={navLinkStyle}
          >
            FlexTrip
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-semibold">
          {[
            { href: '#top', label: 'Trang chủ' },
            { href: '#categories', label: 'Danh mục' },
            { href: '#how-it-works', label: 'Cách hoạt động' },
            { href: '#featured', label: 'Khám phá' },
            { href: '/register-provider', label: 'Trở thành Provider' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-3.5 py-1.5 rounded-full transition-all duration-200 hover:bg-white/15"
              style={navLinkStyle}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {!isAuthenticated ? (
            <>
              <Link href="/login" className="hidden sm:block">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full px-4 transition-colors hover:bg-white/15 font-semibold"
                  style={navLinkStyle}
                >
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-[#1877F2] via-[#00A3FF] to-[#00D8F6] hover:brightness-110 text-white rounded-full px-5 py-2 shadow-md shadow-[#00A3FF]/30 font-bold text-sm transition-all hover:scale-105 active:scale-95"
                >
                  Đăng ký
                </Button>
              </Link>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full border px-2.5 py-1 transition-all"
                style={
                  scrolled
                    ? { borderColor: '#DCEFFB', color: '#0E2233' }
                    : { borderColor: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.12)', color: '#ffffff', backdropFilter: 'blur(8px)' }
                }
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-[#C8EDFF] text-[#075D82] text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold max-w-[90px] truncate hidden sm:block">
                  {user?.name?.split(' ')[0]}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-52 bg-white rounded-2xl border border-[#DCEFFB] shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 border-b border-[#DCEFFB]">
                    <p className="text-xs font-bold text-[#0E2233]">{user?.name}</p>
                    <p className="text-xs text-[#5B7A93] truncate">{user?.email}</p>
                  </div>
                  <Link
                    href={profileHref}
                    className="block px-4 py-2 text-sm text-[#0E2233] hover:bg-[#F1FAFF] rounded-lg mx-1 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Hồ sơ của tôi
                  </Link>
                  <Link
                    href="/bookings"
                    className="block px-4 py-2 text-sm text-[#0E2233] hover:bg-[#F1FAFF] rounded-lg mx-1 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Đơn của tôi
                  </Link>
                  <Link
                    href="/listings"
                    className="block px-4 py-2 text-sm text-[#0E2233] hover:bg-[#F1FAFF] rounded-lg mx-1 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Tin đăng của tôi
                  </Link>
                  <div className="border-t border-[#DCEFFB] mt-1 pt-1">
                    <button
                      onClick={() => {
                        clearAuth();
                        setUserMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg mx-1 transition-colors"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-xl transition-colors hover:bg-white/15"
            style={{ color: textColor }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Mở menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-b border-[#DCEFFB] px-4 py-3 flex flex-col gap-1.5 bg-white/95 backdrop-blur-2xl text-[#0E2233] shadow-xl">
          {[
            { href: '#top', label: 'Trang chủ' },
            { href: '#categories', label: 'Danh mục' },
            { href: '#how-it-works', label: 'Cách hoạt động' },
            { href: '#featured', label: 'Khám phá' },
            { href: '/register-provider', label: 'Trở thành Provider' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="py-2 px-3 text-sm font-semibold rounded-xl hover:bg-[#00A3FF]/10 transition-colors text-[#0E2233]"
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}
          {!isAuthenticated && (
            <div className="flex gap-2.5 mt-2 pt-3 border-t border-slate-200/50">
              <Link href="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" size="sm" className="w-full rounded-full font-semibold">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full rounded-full bg-gradient-to-r from-[#1877F2] via-[#00A3FF] to-[#00D8F6] text-white font-bold shadow-md shadow-[#00A3FF]/30">
                  Đăng ký
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
