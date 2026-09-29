'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProviderBookings, useApproveBooking, useDeclineBooking, useStartBooking, useCompleteBooking } from '@/hooks/useBookings';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import type { BookingStatus } from '@/types/booking';

type Tab = 'PENDING_APPROVAL' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'ALL';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'IN_PROGRESS', label: 'Đang thuê' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'ALL', label: 'Tất cả' },
];

function DeclineModal({
  bookingId,
  onClose,
}: {
  bookingId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const decline = useDeclineBooking();

  async function handleDecline() {
    await decline.mutateAsync({ id: bookingId, reason: reason || undefined });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" style={{ borderColor: '#DCEFFB' }}>
        <h3 className="mb-4 text-base font-semibold" style={{ color: '#0f1729' }}>Từ chối đơn</h3>
        <textarea
          rows={3}
          placeholder="Lý do từ chối (tuỳ chọn)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
          style={{ borderColor: '#d0dce8' }}
        />
        <div className="mt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border py-2.5 text-sm font-medium"
            style={{ borderColor: '#DCEFFB', color: '#5a6b85' }}
          >
            Huỷ
          </button>
          <button
            onClick={handleDecline}
            disabled={decline.isPending}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#e84040' }}
          >
            {decline.isPending ? 'Đang xử lý…' : 'Xác nhận từ chối'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProviderBookingsPage() {
  const [tab, setTab] = useState<Tab>('PENDING_APPROVAL');
  const [declineTarget, setDeclineTarget] = useState<string | null>(null);
  const approve = useApproveBooking();
  const startBooking = useStartBooking();
  const completeBooking = useCompleteBooking();

  const { data: bookings, isLoading } = useProviderBookings({
    status: tab === 'ALL' ? undefined : tab,
    limit: 50,
  });

  const pendingCount = useProviderBookings({ status: 'PENDING_APPROVAL', limit: 1 }).data?.length ?? 0;

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      {declineTarget && (
        <DeclineModal bookingId={declineTarget} onClose={() => setDeclineTarget(null)} />
      )}

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm" style={{ color: '#8694ad' }}>
              ← Dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-bold" style={{ color: '#0f1729' }}>Quản lý đặt thuê</h1>
          </div>
          {pendingCount > 0 && (
            <span
              className="rounded-full px-3 py-1 text-sm font-semibold"
              style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}
            >
              {pendingCount} đơn chờ duyệt
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border bg-white p-1" style={{ borderColor: '#DCEFFB' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all"
              style={
                tab === t.key
                  ? { background: '#2a7bd9', color: '#fff' }
                  : { color: '#5a6b85' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#e2e8f3]" />
            ))}
          </div>
        ) : !bookings?.length ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-white py-20" style={{ borderColor: '#DCEFFB' }}>
            <span className="mb-3 text-5xl">📋</span>
            <p className="text-sm" style={{ color: '#8694ad' }}>
              {tab === 'PENDING_APPROVAL' ? 'Không có đơn nào đang chờ duyệt.' : 'Không có đơn nào.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => {
              const price =
                typeof booking.totalPrice === 'number'
                  ? booking.totalPrice
                  : Number(booking.totalPrice);
              const rentalDays =
                Math.round(
                  (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
                    86_400_000,
                ) + 1;
              const isPending = booking.status === 'PENDING_APPROVAL';
              const isApproving = approve.isPending && approve.variables === booking.id;

              return (
                <div
                  key={booking.id}
                  className="rounded-2xl border bg-white transition-shadow hover:shadow-md"
                  style={{
                    borderColor: isPending ? '#fed7aa' : '#DCEFFB',
                    background: isPending ? '#fffbf7' : '#fff',
                  }}
                >
                  <div className="flex items-start gap-4 p-5">
                    {/* Listing image */}
                    <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f1f5fa]">
                      {booking.listing?.imageUrls?.[0] ? (
                        <img
                          src={booking.listing.imageUrls[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl">⛺</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold" style={{ color: '#0f1729' }}>
                            {booking.listing?.title ?? `Đơn #${booking.id.slice(-8).toUpperCase()}`}
                          </p>
                          <p className="mt-0.5 text-xs" style={{ color: '#8694ad' }}>
                            Mã đơn: #{booking.id.slice(-8).toUpperCase()}
                          </p>
                        </div>
                        <BookingStatusBadge status={booking.status as BookingStatus} />
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        <span style={{ color: '#5a6b85' }}>
                          📅{' '}
                          {new Date(booking.startDate).toLocaleDateString('vi-VN', {
                            day: 'numeric',
                            month: 'numeric',
                          })}{' '}
                          →{' '}
                          {new Date(booking.endDate).toLocaleDateString('vi-VN', {
                            day: 'numeric',
                            month: 'numeric',
                          })}{' '}
                          <span style={{ color: '#8694ad' }}>({rentalDays} ngày)</span>
                        </span>
                        {booking.quantity > 1 && (
                          <span style={{ color: '#5a6b85' }}>× {booking.quantity}</span>
                        )}
                        <span className="font-semibold" style={{ color: '#2a7bd9' }}>
                          {price.toLocaleString('vi-VN')} ₫
                        </span>
                      </div>

                      {booking.traveler && (
                        <div className="mt-2 flex items-center gap-2">
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ background: '#2a7bd9' }}
                          >
                            {booking.traveler.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs" style={{ color: '#5a6b85' }}>
                            {booking.traveler.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions row */}
                  <div
                    className="flex items-center gap-2 border-t px-5 py-3"
                    style={{ borderColor: isPending ? '#fed7aa' : '#DCEFFB' }}
                  >
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="text-xs font-medium"
                      style={{ color: '#2a7bd9' }}
                    >
                      Xem chi tiết →
                    </Link>

                    {isPending && (
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => setDeclineTarget(booking.id)}
                          className="rounded-lg border px-4 py-1.5 text-xs font-semibold transition hover:bg-red-50"
                          style={{ borderColor: '#fca5a5', color: '#dc2626' }}
                        >
                          Từ chối
                        </button>
                        <button
                          onClick={() => approve.mutate(booking.id)}
                          disabled={isApproving}
                          className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                          style={{ background: '#2a7bd9' }}
                        >
                          {isApproving ? 'Đang duyệt…' : '✓ Duyệt đơn'}
                        </button>
                      </div>
                    )}

                    {booking.status === 'CONFIRMED' && (
                      <button
                        onClick={() => startBooking.mutate(booking.id)}
                        disabled={startBooking.isPending && startBooking.variables === booking.id}
                        className="ml-auto rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                        style={{ background: '#16a34a' }}
                      >
                        ▶ Bắt đầu cho thuê
                      </button>
                    )}

                    {booking.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => completeBooking.mutate(booking.id)}
                        disabled={completeBooking.isPending && completeBooking.variables === booking.id}
                        className="ml-auto rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                        style={{ background: '#2a7bd9' }}
                      >
                        ✓ Hoàn thành
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
