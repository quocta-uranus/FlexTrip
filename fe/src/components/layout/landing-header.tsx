'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/context/theme-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Menu,
  X,
  ChevronDown,
  Sun,
  Moon,
  ArrowUpRight,
  MoreHorizontal,
  HelpCircle,
  ShieldCheck,
  FileText,
  UserPlus,
} from 'lucide-react';

export function LandingHeader() {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

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
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const isDark = theme === 'dark';

  return (
    <header className="fixed top-2.5 sm:top-4 left-0 right-0 z-50 px-3 sm:px-6 transition-all duration-300">
      <div
        className={`mx-auto max-w-7xl h-14 sm:h-16 px-4 sm:px-6 rounded-2xl sm:rounded-full border transition-all duration-300 flex items-center justify-between gap-4 ${
          isDark
            ? 'bg-[#0E1626]/90 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl text-white'
            : 'bg-white/92 border-slate-200/80 shadow-[0_8px_30px_rgba(2,50,90,0.08)] backdrop-blur-xl text-slate-800'
        } ${scrolled ? 'scale-[0.99] shadow-xl' : ''}`}
      >
        {/* Left: Brand Logo + LOGIN Button */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-tr from-[#1877F2] via-[#00A3FF] to-[#00D8F6] flex items-center justify-center shadow-md shadow-[#00A3FF]/30 transition-transform duration-300 group-hover:scale-105">
              <span className="text-white font-black text-sm leading-none tracking-tight">F</span>
            </div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">
              FlexTrip
            </span>
          </Link>

          {/* Quick LOGIN Pill Button (GigBridge signature style) */}
          {!isAuthenticated ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#EBF5FB] hover:bg-[#DDF0FA] dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-[#0070F3] dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/40 shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              <span>LOGIN</span>
              <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </Link>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full border border-sky-200/80 dark:border-white/15 px-2.5 py-1 bg-[#EBF5FB] dark:bg-sky-950/40 text-slate-800 dark:text-white hover:border-[#00A3FF]/40 transition-all"
              >
                <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                  <AvatarImage src={user?.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-[#C8EDFF] dark:bg-sky-950 text-[#075D82] dark:text-sky-300 text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-bold max-w-[85px] truncate hidden sm:block">
                  {user?.name?.split(' ')[0]}
                </span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>

              {userMenuOpen && (
                <div className="absolute left-0 mt-2.5 w-52 bg-white dark:bg-[#121A2C] rounded-2xl border border-slate-200 dark:border-white/15 shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/10">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-slate-800 dark:text-slate-200 hover:bg-[#F1FAFF] dark:hover:bg-slate-800 rounded-lg mx-1 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Hồ sơ của tôi
                  </Link>
                  <Link
                    href="/bookings"
                    className="block px-4 py-2 text-sm text-slate-800 dark:text-slate-200 hover:bg-[#F1FAFF] dark:hover:bg-slate-800 rounded-lg mx-1 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Đơn của tôi
                  </Link>
                  <Link
                    href="/listings"
                    className="block px-4 py-2 text-sm text-slate-800 dark:text-slate-200 hover:bg-[#F1FAFF] dark:hover:bg-slate-800 rounded-lg mx-1 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Tin đăng của tôi
                  </Link>
                  <div className="border-t border-slate-100 dark:border-white/10 mt-1 pt-1">
                    <button
                      onClick={() => {
                        clearAuth();
                        setUserMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg mx-1 transition-colors"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center / Right: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
          <Link
            href="#top"
            className="hover:text-[#0070F3] dark:hover:text-[#38BDF8] transition-colors py-1"
          >
            Trang chủ
          </Link>
          <Link
            href="#categories"
            className="hover:text-[#0070F3] dark:hover:text-[#38BDF8] transition-colors py-1"
          >
            Danh mục
          </Link>
          <Link
            href="#how-it-works"
            className="hover:text-[#0070F3] dark:hover:text-[#38BDF8] transition-colors py-1"
          >
            Cách hoạt động
          </Link>
          <Link
            href="#featured"
            className="hover:text-[#0070F3] dark:hover:text-[#38BDF8] transition-colors py-1"
          >
            Khám phá
          </Link>
          <Link
            href="/register-provider"
            className="hover:text-[#0070F3] dark:hover:text-[#38BDF8] transition-colors py-1"
          >
            Trở thành Provider
          </Link>
        </nav>

        {/* Right: Theme Switcher + More Options Button + Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            type="button"
            aria-label="Chuyển đổi theme"
            className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-slate-200/80 dark:border-white/15 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
          >
            {isDark ? (
              <Moon className="h-4 w-4 text-cyan-300 transition-transform duration-300 rotate-0" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500 transition-transform duration-300 rotate-0" />
            )}
          </button>

          {/* More Options (Three dots Menu) */}
          <div className="relative hidden sm:block" ref={moreRef}>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              type="button"
              aria-label="Tùy chọn mở rộng"
              className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-slate-200/80 dark:border-white/15 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 mt-2.5 w-56 bg-white dark:bg-[#121A2C] rounded-2xl border border-slate-200 dark:border-white/15 shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Tiện ích FlexTrip
                </div>
                <Link
                  href="#how-it-works"
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl mx-1 transition-colors"
                  onClick={() => setMoreMenuOpen(false)}
                >
                  <HelpCircle className="h-4 w-4 text-[#0070F3]" />
                  <span>Câu hỏi thường gặp (FAQ)</span>
                </Link>
                <Link
                  href="#trust"
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl mx-1 transition-colors"
                  onClick={() => setMoreMenuOpen(false)}
                >
                  <ShieldCheck className="h-4 w-4 text-[#0070F3]" />
                  <span>Chính sách bảo vệ</span>
                </Link>
                <Link
                  href="/register-provider"
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl mx-1 transition-colors"
                  onClick={() => setMoreMenuOpen(false)}
                >
                  <FileText className="h-4 w-4 text-[#0070F3]" />
                  <span>Điều khoản dịch vụ</span>
                </Link>

                {!isAuthenticated && (
                  <>
                    <div className="border-t border-slate-100 dark:border-white/10 my-1" />
                    <Link
                      href="/register"
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#0070F3] dark:text-[#38BDF8] hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-xl mx-1 transition-colors"
                      onClick={() => setMoreMenuOpen(false)}
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Đăng ký tài khoản</span>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Mở menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <div className={`lg:hidden mt-2 rounded-2xl border p-4 flex flex-col gap-2 transition-all duration-200 shadow-2xl ${
          isDark
            ? 'bg-[#0E1626]/95 backdrop-blur-2xl border-white/10 text-white'
            : 'bg-white/95 backdrop-blur-2xl border-slate-200 text-slate-800'
        }`}>
          <Link
            href="#top"
            className="py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#00A3FF]/10 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            Trang chủ
          </Link>
          <Link
            href="#categories"
            className="py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#00A3FF]/10 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            Danh mục
          </Link>
          <Link
            href="#how-it-works"
            className="py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#00A3FF]/10 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            Cách hoạt động
          </Link>
          <Link
            href="#featured"
            className="py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#00A3FF]/10 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            Khám phá
          </Link>
          <Link
            href="/register-provider"
            className="py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#00A3FF]/10 transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            Trở thành Provider
          </Link>

          {!isAuthenticated && (
            <div className="flex gap-2.5 mt-2 pt-3 border-t border-slate-200/50 dark:border-white/10">
              <Link href="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                <button className="w-full rounded-xl py-2 px-3 border border-slate-200 dark:border-white/20 text-xs font-bold uppercase text-slate-800 dark:text-white">
                  Đăng nhập
                </button>
              </Link>
              <Link href="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                <button className="w-full rounded-xl py-2 px-3 bg-gradient-to-r from-[#1877F2] to-[#00A3FF] text-white text-xs font-bold uppercase shadow-md shadow-[#00A3FF]/30">
                  Đăng ký
                </button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}