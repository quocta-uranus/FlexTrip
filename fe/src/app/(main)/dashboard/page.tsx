'use client';

import Link from 'next/link';
import { useMyListings } from '@/hooks/useListings';
import { useProviderBookings } from '@/hooks/useBookings';
import { useAuthStore } from '@/store/auth.store';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import type { BookingStatus } from '@/types/booking';
import { CATEGORY_LABELS } from '@/types/listing';
import { TrendingUp, Package, Clock, CheckCircle, DollarSign, ArrowRight, Plus, BarChart2, ShoppingBag, Store, MessageCircle } from 'lucide-react';

function StatCard({
  label, value, icon: Icon, sub, accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.04] transition-all hover:shadow-md hover:-translate-y-0.5">
      <div
        className="absolute right-0 top-0 h-24 w-24 rounded-bl-full opacity-10"
        style={{ background: accent }}
      />
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: `${accent}18` }}
        >
          <Icon className="h-5 w-5" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, link, linkLabel, children }: {
  title: string;
  link: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="font-semibold text-slate-800">{title}</h2>
        <Link
          href={link}
          className="flex items-center gap-1 text-sm font-medium text-[#2a7bd9] hover:underline"
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {children}
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, sub, color }: {
  href: string;
  icon: React.ElementType;
  label: string;
  sub: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04] transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
        style={{ background: `${color}15` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 truncate">{label}</p>
        <p className="mt-0.5 text-xs text-slate-400 truncate">{sub}</p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: listings, isLoading: loadListings } = useMyListings({ limit: 5 });
  const { data: bookings, isLoading: loadBookings } = useProviderBookings({ limit: 5 });

  const activeListings   = listings?.filter((l) => l.status === 'ACTIVE').length ?? 0;
  const pendingBookings  = bookings?.filter((b) => b.status === 'PENDING_APPROVAL').length ?? 0;
  const confirmedBookings = bookings?.filter((b) => b.status === 'CONFIRMED').length ?? 0;
  const totalRevenue     = bookings
    ?.filter((b) => ['CONFIRMED', 'COMPLETED'].includes(b.status))
    .reduce((s, b) => s + (typeof b.totalPrice === 'number' ? b.totalPrice : Number(b.totalPrice)), 0) ?? 0;

  const firstName = user?.name?.split(' ').pop() ?? 'Provider';
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#f3f8fd]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">{today}</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
              Chào, {firstName} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {user?.providerProfile?.shopName
                ? `Shop: ${user.providerProfile.shopName}`
                : 'Provider Dashboard'}
            </p>
          </div>
          <Link
            href="/dashboard/listings/new"
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[#2a7bd9] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#2a7bd9]/25 transition-all hover:brightness-110 hover:shadow-lg active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Thêm sản phẩm
          </Link>
        </div>

        {/* ── KPI Cards ── */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Sản phẩm đang cho thuê"
            value={activeListings}
            icon={Package}
            sub={`Tổng: ${listings?.length ?? 0} sản phẩm`}
            accent="#2a7bd9"
          />
          <StatCard
            label="Đơn chờ xác nhận"
            value={pendingBookings}
            icon={Clock}
            sub="Cần phản hồi trong 24h"
            accent="#f59e0b"
          />
          <StatCard
            label="Đơn đang thực hiện"
            value={confirmedBookings}
            icon={CheckCircle}
            sub="Đã xác nhận"
            accent="#10b981"
          />
          <StatCard
            label="Doanh thu"
            value={`${totalRevenue.toLocaleString('vi-VN')} ₫`}
            icon={TrendingUp}
            sub="Từ đơn xác nhận & hoàn thành"
            accent="#8b5cf6"
          />
        </div>

        {/* ── Main Grid ── */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">

          {/* Recent bookings */}
          <SectionCard title="Đơn đặt thuê gần đây" link="/dashboard/bookings" linkLabel="Xem tất cả">
            {loadBookings ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-14 w-16 rounded-xl bg-slate-100 shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3.5 w-3/4 rounded-md bg-slate-100" />
                      <div className="h-3 w-1/2 rounded-md bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !bookings?.length ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                  <ShoppingBag className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400">Chưa có đơn đặt thuê nào.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {bookings.slice(0, 5).map((booking) => {
                  const price = typeof booking.totalPrice === 'number' ? booking.totalPrice : Number(booking.totalPrice);
                  return (
                    <li key={booking.id}>
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/80"
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-black/[0.04]">
                          {booking.listing?.imageUrls?.[0] ? (
                            <img src={booking.listing.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-2xl">⛺</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {booking.listing?.title ?? `Đơn #${booking.id.slice(-8)}`}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {new Date(booking.startDate).toLocaleDateString('vi-VN')} →{' '}
                            {new Date(booking.endDate).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <BookingStatusBadge status={booking.status as BookingStatus} />
                          <p className="mt-1.5 text-xs font-bold text-[#2a7bd9]">
                            {price.toLocaleString('vi-VN')} ₫
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          {/* My listings */}
          <SectionCard title="Sản phẩm của bạn" link="/dashboard/listings" linkLabel="Quản lý">
            {loadListings ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-14 w-14 rounded-xl bg-slate-100 shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3.5 w-3/4 rounded-md bg-slate-100" />
                      <div className="h-3 w-1/2 rounded-md bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !listings?.length ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                  <Package className="h-7 w-7 text-slate-300" />
                </div>
                <p className="mb-4 text-sm text-slate-400">Chưa có sản phẩm nào.</p>
                <Link
                  href="/dashboard/listings/new"
                  className="rounded-xl bg-[#2a7bd9] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110"
                >
                  Thêm sản phẩm đầu tiên
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {listings.slice(0, 5).map((listing) => {
                  const price = typeof listing.price === 'number' ? listing.price : Number(listing.price);
                  const isActive = listing.status === 'ACTIVE';
                  return (
                    <li key={listing.id}>
                      <Link
                        href={`/dashboard/listings/${listing.id}/edit`}
                        className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/80"
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-black/[0.04]">
                          {listing.imageUrls?.[0] ? (
                            <img src={listing.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-2xl">⛺</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{listing.title}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {CATEGORY_LABELS[listing.category] ?? listing.category} · {listing.location}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                            style={
                              isActive
                                ? { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }
                                : { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }
                            }
                          >
                            {isActive ? 'Đang cho thuê' : 'Bản nháp'}
                          </span>
                          <p className="mt-1.5 text-xs font-bold text-[#2a7bd9]">
                            {price.toLocaleString('vi-VN')} ₫/ngày
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* ── Quick Links ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink href="/dashboard/bookings"    icon={BarChart2}      label="Quản lý đơn thuê"  sub="Duyệt, bắt đầu, hoàn thành" color="#2a7bd9" />
          <QuickLink href="/dashboard/listings/new" icon={Plus}           label="Thêm sản phẩm"     sub="Đăng sản phẩm cho thuê"     color="#10b981" />
          <QuickLink href="/profile/shop"           icon={Store}          label="Cập nhật Shop"     sub="Thông tin cửa hàng, địa chỉ" color="#f59e0b" />
          <QuickLink href="/messages"               icon={MessageCircle}  label="Tin nhắn"          sub="Trò chuyện với khách hàng"   color="#8b5cf6" />
        </div>

      </div>
    </div>
  );
}
