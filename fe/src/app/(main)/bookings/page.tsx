'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMyBookings } from '@/hooks/useBookings';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import type { BookingStatus } from '@/types/booking';
import { CATEGORY_LABELS } from '@/types/listing';

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
];

export default function BookingsPage() {
  const [activeStatus, setActiveStatus] = useState('');
  const { data: bookings, isLoading, error } = useMyBookings(
    activeStatus ? { status: activeStatus } : undefined
  );

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Đặt thuê của tôi</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Quản lý các đơn đặt thuê của bạn</p>
          </div>
          <Link
            href="/search"
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: '#2a7bd9' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Đặt thuê mới
          </Link>
        </div>

        {/* Status tabs */}
        <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b pb-px" style={{ borderColor: '#DCEFFB' }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              id={`booking-tab-${tab.value || 'all'}`}
              onClick={() => setActiveStatus(tab.value)}
              className="shrink-0 px-4 py-2.5 text-sm font-medium transition-all border-b-2"
              style={{
                borderColor: activeStatus === tab.value ? '#2a7bd9' : 'transparent',
                color: activeStatus === tab.value ? '#2a7bd9' : '#5a6b85',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border bg-white p-5 dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor: '#DCEFFB' }}>
                <div className="flex gap-4">
                  <div className="h-24 w-32 shrink-0 rounded-xl bg-[#e2e8f3]" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 w-3/4 rounded bg-[#e2e8f3]" />
                    <div className="h-4 w-1/2 rounded bg-[#e2e8f3]" />
                    <div className="h-4 w-1/3 rounded bg-[#e2e8f3]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}>
            {error.message}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!bookings || bookings.length === 0) && (
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-white py-20 dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor: '#DCEFFB' }}>
            <span className="mb-4 text-6xl">📋</span>
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Chưa có đơn đặt thuê</h3>
            <p className="mb-6 max-w-xs text-center text-sm text-slate-500 dark:text-slate-400">
              Khám phá hàng nghìn sản phẩm cho thuê và đặt ngay hôm nay.
            </p>
            <Link
              href="/search"
              className="rounded-full px-6 py-2.5 text-sm font-semibold text-white"
              style={{ background: '#2a7bd9' }}
            >
              Khám phá ngay
            </Link>
          </div>
        )}

        {/* Booking list */}
        {!isLoading && bookings && bookings.length > 0 && (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const price = typeof booking.totalPrice === 'number' ? booking.totalPrice : Number(booking.totalPrice);
              const startDate = new Date(booking.startDate);
              const endDate = new Date(booking.endDate);
              const nights = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);

              return (
                <Link
                  key={booking.id}
                  href={`/bookings/${booking.id}`}
                  className="group flex items-stretch gap-4 overflow-hidden rounded-2xl border bg-white p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 dark:bg-[#121A2C] dark:text-white dark:border-white/10"
                  style={{ borderColor: '#DCEFFB' }}
                >
                  {/* Listing image */}
                  <div className="h-auto w-32 shrink-0 overflow-hidden rounded-xl bg-[#f1f5fa]">
                    {booking.listing?.imageUrls?.[0] ? (
                      <img
                        src={booking.listing.imageUrls[0]}
                        alt={booking.listing.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">⛺</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div>
                          {booking.listing?.category && (
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#2a7bd9' }}>
                              {CATEGORY_LABELS[booking.listing.category] ?? booking.listing.category}
                            </span>
                          )}
                          <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                            {booking.listing?.title ?? `Đơn #${booking.id.slice(-8)}`}
                          </p>
                        </div>
                        <BookingStatusBadge status={booking.status as BookingStatus} />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {booking.listing?.location}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                        <span>
                          📅 {startDate.toLocaleDateString('vi-VN')} → {endDate.toLocaleDateString('vi-VN')}
                          <span className="ml-1 font-medium">({nights} ngày)</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold" style={{ color: '#2a7bd9' }}>
                          {price.toLocaleString('vi-VN')} {booking.listing?.currency ?? 'VND'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center self-center">
                    <svg className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" style={{ color: '#DCEFFB' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
