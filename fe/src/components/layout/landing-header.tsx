'use client';

import { useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
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

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-[#DCEFFB]'
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#2A7BD9] to-[#92EEE8] flex items-center justify-center shadow-md shadow-[#2A7BD9]/20">
            <span className="text-white font-bold text-sm leading-none">F</span>
          </div>
          <span className="font-bold text-lg text-[#0E2233]">FlexTrip</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5B7A93]">
          <Link href="#categories" className="hover:text-[#2A7BD9] transition-colors">
            Danh mục
          </Link>
          <Link href="#how-it-works" className="hover:text-[#2A7BD9] transition-colors">
            Cách hoạt động
          </Link>
          <Link href="/register-provider" className="hover:text-[#2A7BD9] transition-colors">
            Trở thành Provider
          </Link>
          <Link href="#" className="hover:text-[#2A7BD9] transition-colors">
            Blog & Ưu đãi
          </Link>
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {!isAuthenticated ? (
            <>
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="text-[#5B7A93] hover:text-[#0E2233]">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="bg-[#2A7BD9] hover:bg-[#1e5aa8] text-white rounded-full px-5 shadow-md shadow-[#2A7BD9]/25"
                >
                  Đăng ký
                </Button>
              </Link>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full border border-[#DCEFFB] hover:border-[#2A7BD9]/40 px-2.5 py-1 transition-colors"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-[#C8EDFF] text-[#075D82] text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-[#0E2233] max-w-[90px] truncate hidden sm:block">
                  {user?.name?.split(' ')[0]}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#5B7A93]" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-[#DCEFFB] shadow-xl py-1 z-50">
                  <div className="px-4 py-2.5 border-b border-[#DCEFFB]">
                    <p className="text-xs font-semibold text-[#0E2233]">{user?.name}</p>
                    <p className="text-xs text-[#5B7A93] truncate">{user?.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="block px-4 py-2.5 text-sm text-[#0E2233] hover:bg-[#F1FAFF] transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Hồ sơ của tôi
                  </Link>
                  <Link
                    href="/bookings"
                    className="block px-4 py-2.5 text-sm text-[#0E2233] hover:bg-[#F1FAFF] transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Đơn của tôi
                  </Link>
                  <Link
                    href="/listings"
                    className="block px-4 py-2.5 text-sm text-[#0E2233] hover:bg-[#F1FAFF] transition-colors"
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
                      className="block w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
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
            className="md:hidden p-2 rounded-lg hover:bg-[#F1FAFF] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#DCEFFB] bg-white/98 px-4 py-3 flex flex-col gap-1">
          <Link
            href="#categories"
            className="py-2.5 px-2 text-sm font-medium text-[#5B7A93] hover:text-[#2A7BD9] rounded-lg hover:bg-[#F1FAFF]"
            onClick={() => setMobileOpen(false)}
          >
            Danh mục
          </Link>
          <Link
            href="#how-it-works"
            className="py-2.5 px-2 text-sm font-medium text-[#5B7A93] hover:text-[#2A7BD9] rounded-lg hover:bg-[#F1FAFF]"
            onClick={() => setMobileOpen(false)}
          >
            Cách hoạt động
          </Link>
          <Link
            href="#become-provider"
            className="py-2.5 px-2 text-sm font-medium text-[#5B7A93] hover:text-[#2A7BD9] rounded-lg hover:bg-[#F1FAFF]"
            onClick={() => setMobileOpen(false)}
          >
            Trở thành Provider
          </Link>
          {!isAuthenticated && (
            <div className="flex gap-2 mt-2 pt-2 border-t border-[#DCEFFB]">
              <Link href="/login" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register" className="flex-1">
                <Button size="sm" className="w-full bg-[#2A7BD9] hover:bg-[#1e5aa8] text-white">
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
