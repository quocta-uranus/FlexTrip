'use client';

import Link from 'next/link';
import { useMyListings } from '@/hooks/useListings';
import { useProviderBookings } from '@/hooks/useBookings';
import { useAuthStore } from '@/store/auth.store';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import type { BookingStatus } from '@/types/booking';
import { CATEGORY_LABELS } from '@/types/listing';

function StatCard({ label, value, icon, sub }: { label: string; value: string | number; icon: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5 dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor: '#DCEFFB' }}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-300">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: listings, isLoading: loadListings } = useMyListings({ limit: 5 });
  const { data: bookings, isLoading: loadBookings } = useProviderBookings({ limit: 5 });

  const activeListings = listings?.filter((l) => l.status === 'ACTIVE').length ?? 0;
  const pendingBookings = bookings?.filter((b) => b.status === 'PENDING').length ?? 0;
  const confirmedBookings = bookings?.filter((b) => b.status === 'CONFIRMED').length ?? 0;
  const totalRevenue = bookings
    ?.filter((b) => ['CONFIRMED', 'COMPLETED'].includes(b.status))
    .reduce((s, b) => s + (typeof b.totalPrice === 'number' ? b.totalPrice : Number(b.totalPrice)), 0) ?? 0;

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              Chào, {user?.name?.split(' ').pop() ?? 'Provider'} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {user?.providerProfile?.shopName
                ? `Shop: ${user.providerProfile.shopName}`
                : 'Provider Dashboard'}
            </p>
          </div>
          <Link
            href="/dashboard/listings/new"
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
            style={{ background: '#2a7bd9' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Thêm sản phẩm
          </Link>
        </div>

        {/* KPI cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Sản phẩm đang cho thuê" value={activeListings} icon="🏕️" sub={`Tổng: ${listings?.length ?? 0} sản phẩm`} />
          <StatCard label="Đơn chờ xác nhận" value={pendingBookings} icon="⏳" sub="Cần phản hồi trong 24h" />
          <StatCard label="Đơn đang thực hiện" value={confirmedBookings} icon="✅" sub="Đã xác nhận" />
          <StatCard label="Doanh thu" value={`${totalRevenue.toLocaleString('vi-VN')} ₫`} icon="💰" sub="Từ đơn xác nhận & hoàn thành" />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Recent bookings */}
          <div className="rounded-2xl border bg-white dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor: '#DCEFFB' }}>
            <div className="flex items-center justify-between border-b p-5" style={{ borderColor: '#DCEFFB' }}>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Đơn đặt thuê gần đây</h2>
              <Link href="/dashboard/bookings" className="text-sm font-medium" style={{ color: '#2a7bd9' }}>
                Xem tất cả →
              </Link>
            </div>

            {loadBookings ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-12 w-16 rounded-lg bg-[#e2e8f3]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-[#e2e8f3]" />
                      <div className="h-3 w-1/2 rounded bg-[#e2e8f3]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !bookings?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="mb-3 text-4xl">📋</span>
                <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có đơn đặt thuê nào.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: '#DCEFFB' }}>
                {bookings.slice(0, 5).map((booking) => {
                  const price = typeof booking.totalPrice === 'number' ? booking.totalPrice : Number(booking.totalPrice);
                  return (
                    <Link
                      key={booking.id}
                      href={`/bookings/${booking.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#f6fbfe]"
                    >
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-[#f1f5fa]">
                        {booking.listing?.imageUrls?.[0] ? (
                          <img src={booking.listing.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                        ) : <div className="flex h-full items-center justify-center text-xl">⛺</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {booking.listing?.title ?? `Đơn #${booking.id.slice(-8)}`}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(booking.startDate).toLocaleDateString('vi-VN')} → {new Date(booking.endDate).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <BookingStatusBadge status={booking.status as BookingStatus} />
                        <p className="mt-1 text-xs font-semibold" style={{ color: '#2a7bd9' }}>
                          {price.toLocaleString('vi-VN')} ₫
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* My listings */}
          <div className="rounded-2xl border bg-white dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor: '#DCEFFB' }}>
            <div className="flex items-center justify-between border-b p-5" style={{ borderColor: '#DCEFFB' }}>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Sản phẩm của bạn</h2>
              <Link href="/dashboard/listings" className="text-sm font-medium" style={{ color: '#2a7bd9' }}>
                Quản lý →
              </Link>
            </div>

            {loadListings ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-12 w-16 rounded-lg bg-[#e2e8f3]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-[#e2e8f3]" />
                      <div className="h-3 w-1/2 rounded bg-[#e2e8f3]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !listings?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="mb-3 text-4xl">🏕️</span>
                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Chưa có sản phẩm nào.</p>
                <Link
                  href="/dashboard/listings/new"
                  className="rounded-full px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: '#2a7bd9' }}
                >
                  Thêm sản phẩm đầu tiên
                </Link>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: '#DCEFFB' }}>
                {listings.slice(0, 5).map((listing) => {
                  const price = typeof listing.price === 'number' ? listing.price : Number(listing.price);
                  return (
                    <Link
                      key={listing.id}
                      href={`/dashboard/listings/${listing.id}/edit`}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#f6fbfe]"
                    >
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-[#f1f5fa]">
                        {listing.imageUrls?.[0] ? (
                          <img src={listing.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                        ) : <div className="flex h-full items-center justify-center text-xl">⛺</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{listing.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {CATEGORY_LABELS[listing.category] ?? listing.category} · {listing.location}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
                          style={listing.status === 'ACTIVE'
                            ? { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }
                            : { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }
                          }
                        >
                          {listing.status === 'ACTIVE' ? 'Đang cho thuê' : 'Bản nháp'}
                        </span>
                        <p className="mt-1 text-xs font-semibold" style={{ color: '#2a7bd9' }}>
                          {price.toLocaleString('vi-VN')} ₫/ngày
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { href: '/dashboard/listings/new', icon: '➕', label: 'Thêm sản phẩm mới', sub: 'Đăng sản phẩm cho thuê' },
            { href: '/profile/shop', icon: '🏪', label: 'Cập nhật Shop', sub: 'Thông tin cửa hàng, địa chỉ' },
            { href: '/messages', icon: '💬', label: 'Xem tin nhắn', sub: 'Trò chuyện với khách hàng' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-4 rounded-2xl border bg-white p-5 transition-all hover:shadow-md hover:-translate-y-0.5 dark:bg-[#121A2C] dark:text-white dark:border-white/10"
              style={{ borderColor: '#DCEFFB' }}
            >
              <span className="text-3xl">{item.icon}</span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
