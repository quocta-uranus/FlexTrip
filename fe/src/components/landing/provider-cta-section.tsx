'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';

export function ProviderCtaSection() {
  const user = useAuthStore((s) => s.user);
  const isProvider = user?.roles?.includes('PROVIDER');

  // Already a provider — show a dashboard shortcut instead
  if (isProvider) {
    return (
      <section id="become-provider" className="border-t py-12" style={{ borderColor: '#DCEFFB', background: '#f6fbfe' }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-3xl border overflow-hidden p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6"
            style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderColor: '#bbf7d0' }}>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl"
              style={{ background: 'rgba(22,163,74,0.12)' }}>🏕️</div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#15803d' }}>Provider Dashboard</p>
              <h2 className="text-xl font-bold mb-1 text-slate-900 dark:text-slate-100">
                Chào mừng trở lại, {user?.name}!
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Quản lý tin đăng, đơn hàng và doanh thu của bạn.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link href="/dashboard/listings"
                className="rounded-2xl px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-lg"
                style={{ background: '#16a34a' }}>
                Quản lý sản phẩm →
              </Link>
              <Link href="/profile/shop"
                className="rounded-2xl border px-6 py-3 text-sm font-semibold transition-all hover:bg-white dark:bg-[#121A2C] dark:text-white dark:border-white/10"
                style={{ borderColor: '#bbf7d0', color: '#15803d' }}>
                Hồ sơ Shop
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Not a provider — show the full CTA
  return (
    <section id="become-provider" className="border-t py-16" style={{ borderColor: '#DCEFFB', background: '#f6fbfe' }}>
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-3xl border overflow-hidden" style={{ background: 'linear-gradient(135deg, #ffffff, #f1faff)', borderColor: '#DCEFFB' }}>
          <div className="flex flex-col lg:flex-row items-center gap-10 p-8 sm:p-12">
            <div className="flex-1">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: 'rgba(42,123,217,0.1)', color: '#2a7bd9' }}>
                Dành cho Provider
              </span>
              <h2 className="mb-4 text-3xl font-bold sm:text-4xl text-slate-900 dark:text-slate-100">
                Đồ nhàn rỗi?<br />Biến thành thu nhập.
              </h2>
              <p className="mb-6 max-w-md leading-relaxed text-slate-600 dark:text-slate-300">
                Đăng ký Provider trên FlexTrip, cho thuê thiết bị du lịch bạn không dùng đến và
                kiếm thêm thu nhập thụ động mỗi tháng — AI gợi ý giá thuê tối ưu theo thị trường.
              </p>
              <ul className="mb-8 space-y-2.5">
                {[
                  'Đăng tin miễn phí, không giới hạn số lượng',
                  'AI tự động gợi ý giá thuê theo khu vực & mùa vụ',
                  'Hợp đồng điện tử & cọc Escrow bảo vệ tài sản',
                  'Nhân viên FlexTrip hỗ trợ giao nhận chuyên nghiệp',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-900 dark:text-slate-100">
                    <svg className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#2a7bd9' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link href="/register-provider"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg"
                  style={{ background: '#2a7bd9', boxShadow: '0 4px 16px -4px rgba(42,123,217,0.4)' }}>
                  Trở thành Provider
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link href="/register-provider"
                  className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition-all hover:shadow-sm"
                  style={{ borderColor: 'rgba(42,123,217,0.3)', color: '#2a7bd9' }}>
                  Tìm hiểu thêm
                </Link>
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-4 lg:w-64 lg:shrink-0">
              {[
                { value: '4.2tr', label: 'Thu nhập TB / tháng', icon: '💰' },
                { value: '500+', label: 'Provider hoạt động', icon: '🏕️' },
                { value: '48h', label: 'Thời gian duyệt tin', icon: '⚡' },
                { value: '0đ', label: 'Phí đăng ký ban đầu', icon: '🎁' },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border bg-white p-4 text-center shadow-sm dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor: '#DCEFFB' }}>
                  <span className="mb-2 block text-2xl">{s.icon}</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
