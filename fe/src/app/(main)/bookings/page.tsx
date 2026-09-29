'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMyBookings } from '@/hooks/useBookings';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import type { BookingStatus } from '@/types/booking';
import { CATEGORY_LABELS } from '@/types/listing';

const TABS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING_PAYMENT', label: 'Chờ TT' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'IN_PROGRESS', label: 'Đang thuê' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
];

// Steps in the happy-path journey — used for mini progress bar
const HAPPY_STEPS: BookingStatus[] = [
  'PENDING_PAYMENT', 'PENDING_APPROVAL', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED',
];

const STEP_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Thanh toán',
  PENDING_APPROVAL: 'Duyệt đơn',
  CONFIRMED: 'Xác nhận',
  IN_PROGRESS: 'Đang thuê',
  COMPLETED: 'Hoàn thành',
};

function MiniProgress({ status }: { status: BookingStatus }) {
  const idx = HAPPY_STEPS.indexOf(status);
  if (idx === -1) return null; // cancelled / disputed — no progress

  return (
    <div className="mt-3 flex items-center gap-0.5">
      {HAPPY_STEPS.map((step, i) => {
        const done = i <= idx;
        const current = i === idx;
        return (
          <div key={step} className="flex flex-1 flex-col items-center gap-0.5">
            <div
              className="h-1.5 w-full rounded-full transition-all"
              style={{ background: done ? '#2a7bd9' : '#e2e8f3' }}
            />
            {current && (
              <span className="text-[9px] font-medium" style={{ color: '#2a7bd9' }}>
                {STEP_LABELS[step]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function BookingsPage() {
  const [activeStatus, setActiveStatus] = useState('');
  const { data: bookings, isLoading, error } = useMyBookings(
    activeStatus ? { status: activeStatus } : undefined,
  );

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0f1729' }}>Đặt thuê của tôi</h1>
            <p className="mt-1 text-sm" style={{ color: '#8694ad' }}>Theo dõi và quản lý các đơn thuê</p>
          </div>
          <Link
            href="/search"
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: '#2a7bd9' }}
          >
            + Đặt thuê mới
          </Link>
        </div>

        {/* Tabs */}
        <div
          className="mb-6 flex items-center gap-1 overflow-x-auto border-b pb-px"
          style={{ borderColor: '#DCEFFB' }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className="shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-all"
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
              <div
                key={i}
                className="animate-pulse rounded-2xl border bg-white p-5"
                style={{ borderColor: '#DCEFFB' }}
              >
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
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}
          >
            {error.message}
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && !bookings?.length && (
          <div
            className="flex flex-col items-center justify-center rounded-2xl border bg-white py-20"
            style={{ borderColor: '#DCEFFB' }}
          >
            <span className="mb-4 text-6xl">📋</span>
            <h3 className="mb-2 text-lg font-semibold" style={{ color: '#0f1729' }}>
              Chưa có đơn đặt thuê
            </h3>
            <p className="mb-6 max-w-xs text-center text-sm" style={{ color: '#8694ad' }}>
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

        {/* List */}
        {!isLoading && !!bookings?.length && (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const price =
                typeof booking.totalPrice === 'number'
                  ? booking.totalPrice
                  : Number(booking.totalPrice);
              const start = new Date(booking.startDate);
              const end = new Date(booking.endDate);
              const rentalDays =
                Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
              const isCancelled = ['CANCELLED', 'DISPUTED', 'REFUNDING', 'REFUNDED'].includes(
                booking.status,
              );

              return (
                <Link
                  key={booking.id}
                  href={`/bookings/${booking.id}`}
                  className="group block overflow-hidden rounded-2xl border bg-white p-5 transition-all hover:shadow-lg hover:-translate-y-0.5"
                  style={{
                    borderColor: isCancelled ? '#e2e8f3' : '#DCEFFB',
                    opacity: isCancelled ? 0.75 : 1,
                  }}
                >
                  <div className="flex items-stretch gap-4">
                    {/* Image */}
                    <div className="h-auto w-28 shrink-0 overflow-hidden rounded-xl bg-[#f1f5fa]">
                      {booking.listing?.imageUrls?.[0] ? (
                        <img
                          src={booking.listing.imageUrls[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-[80px] items-center justify-center text-3xl">
                          ⛺
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {booking.listing?.category && (
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider"
                                style={{ color: '#2a7bd9' }}
                              >
                                {CATEGORY_LABELS[booking.listing.category] ??
                                  booking.listing.category}
                              </span>
                            )}
                            <p
                              className="truncate font-semibold"
                              style={{ color: '#0f1729' }}
                            >
                              {booking.listing?.title ?? `Đơn #${booking.id.slice(-8)}`}
                            </p>
                          </div>
                          <BookingStatusBadge status={booking.status as BookingStatus} />
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: '#5a6b85' }}>
                          <span>
                            📅{' '}
                            {start.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                            {' → '}
                            {end.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                            <span className="ml-1 font-medium">({rentalDays} ngày)</span>
                          </span>
                          {(booking.quantity ?? 1) > 1 && (
                            <span>× {booking.quantity} thiết bị</span>
                          )}
                          {booking.deliveryMethod === 'DELIVERY' && (
                            <span style={{ color: '#8694ad' }}>🚚 Giao hàng</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-base font-bold" style={{ color: '#2a7bd9' }}>
                          {price.toLocaleString('vi-VN')}{' '}
                          <span className="text-xs font-normal" style={{ color: '#8694ad' }}>
                            {booking.listing?.currency ?? 'VND'}
                          </span>
                        </p>
                        <span
                          className="text-xs transition-transform duration-300 group-hover:translate-x-1"
                          style={{ color: '#8694ad' }}
                        >
                          Xem chi tiết →
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mini progress bar */}
                  {!isCancelled && (
                    <MiniProgress status={booking.status as BookingStatus} />
                  )}

                  {/* Cancellation reason */}
                  {isCancelled && booking.cancellationReason && (
                    <p className="mt-2 text-xs" style={{ color: '#8694ad' }}>
                      Lý do: {booking.cancellationReason}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
