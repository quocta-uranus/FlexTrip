'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useBooking, useCancelBooking, useDeclineBooking, useStartBooking, useCompleteBooking } from '@/hooks/useBookings';
import { useModifyRequests, useCreateModifyRequest, useAcceptModifyRequest, useRejectModifyRequest } from '@/hooks/useModifyBooking';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import type { BookingStatus, ModifyRequestStatus } from '@/types/booking';
import { CATEGORY_LABELS } from '@/types/listing';
import { useAuthStore } from '@/store/auth.store';
import { ReviewForm } from '@/components/reviews/review-form';
import { useMyReviews } from '@/hooks/useReviews';
import { useContract } from '@/hooks/useContracts';
import { ContractViewer } from '@/components/contracts/ContractViewer';
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_COLOR } from '@/types/contract';
import type { ContractStatus } from '@/types/contract';
import { printContract } from '@/lib/printContract';

const STATUS_STEPS: BookingStatus[] = ['PENDING_APPROVAL', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];

function BookingDetailContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const justCreated = searchParams.get('created') === '1';
  const { user } = useAuthStore();
  const { data: myReviews } = useMyReviews(user?.roles.includes('TRAVELER') ?? false);
  const { data: booking, isLoading, error } = useBooking(id);
  const { mutateAsync: cancelBookingAsync, isPending: cancelling } = useCancelBooking();
  const startBooking = useStartBooking();
  const completeBooking = useCompleteBooking();
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const decline = useDeclineBooking();
  const { data: contract } = useContract(id);
  const { data: modifyRequests } = useModifyRequests(id);
  const createModify = useCreateModifyRequest(id);
  const acceptModify = useAcceptModifyRequest(id);
  const rejectModify = useRejectModifyRequest(id);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyStart, setModifyStart] = useState('');
  const [modifyEnd, setModifyEnd] = useState('');
  const [modifyQtyStr, setModifyQtyStr] = useState('');
  const [modifyReason, setModifyReason] = useState('');
  const [modifyError, setModifyError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 rounded bg-[#e2e8f3]" />
        <div className="h-48 rounded-2xl bg-[#e2e8f3]" />
        <div className="h-32 rounded-2xl bg-[#e2e8f3]" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="mb-4 text-5xl">😕</span>
        <h1 className="mb-2 text-xl font-bold" style={{ color: '#0f1729' }}>Không tìm thấy đơn</h1>
        <Link href="/bookings" className="mt-4 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: '#2a7bd9' }}>
          Về danh sách đơn
        </Link>
      </div>
    );
  }

  const price = typeof booking.totalPrice === 'number' ? booking.totalPrice : Number(booking.totalPrice);
  const startDate = new Date(booking.startDate);
  const endDate = new Date(booking.endDate);
  const nights = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
  const currentStepIdx = STATUS_STEPS.indexOf(booking.status as BookingStatus);
  const canCancel = ['PENDING_PAYMENT', 'PENDING_APPROVAL', 'CONFIRMED'].includes(booking.status);
  const isProvider = user?.id === booking.listing?.providerId;
  const currentReview = myReviews?.find((review) => review.bookingId === booking.id);
  const isPendingApproval = booking.status === 'PENDING_APPROVAL';
  const canModify = !isProvider && booking.status === 'CONFIRMED';
  const hasPendingRequest = modifyRequests?.some((r) => r.status === 'PENDING') ?? false;
  const deposit = typeof booking.depositAmount === 'number'
    ? booking.depositAmount
    : Number(booking.depositAmount ?? 0);
  const daysUntilStart = Math.ceil(
    (new Date(booking.startDate).getTime() - Date.now()) / 86_400_000,
  );

  // Compute expected refund for traveler cancel
  const bStatus = booking.status;
  const refundPolicy: { amount: number; label: string; warning: string | null } =
    bStatus === 'PENDING_PAYMENT'
      ? { amount: 0, label: 'Không mất tiền (chưa thanh toán)', warning: null }
      : bStatus === 'PENDING_APPROVAL'
      ? { amount: deposit, label: 'Hoàn 100% tiền cọc', warning: null }
      : bStatus === 'CONFIRMED' && daysUntilStart >= 3
      ? { amount: deposit, label: 'Hoàn 100% tiền cọc', warning: null }
      : bStatus === 'CONFIRMED' && daysUntilStart < 3
      ? {
          amount: 0,
          label: 'Không hoàn tiền cọc',
          warning: `Còn ${daysUntilStart} ngày đến ngày thuê — huỷ trong vòng 3 ngày trước khi bắt đầu sẽ mất cọc.`,
        }
      : { amount: 0, label: '—', warning: null };

  return (
    <div className="space-y-6">
      {/* Success toast */}
      {justCreated && (
        <div className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(146,238,232,0.4)', background: 'rgba(146,238,232,0.12)', color: '#15803d' }}>
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Đặt thuê thành công! Provider sẽ xác nhận trong vòng 24 giờ.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm" style={{ color: '#8694ad' }}>Đơn #{booking.id.slice(-12).toUpperCase()}</p>
          <h1 className="mt-1 text-2xl font-bold" style={{ color: '#0f1729' }}>Chi tiết đặt thuê</h1>
        </div>
        <BookingStatusBadge status={booking.status as BookingStatus} />
      </div>

      {/* Progress tracker */}
      {!['CANCELLED', 'REFUNDING', 'REFUNDED'].includes(booking.status) && (
        <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#DCEFFB' }}>
          <h2 className="mb-5 text-sm font-semibold" style={{ color: '#0f1729' }}>Tiến trình</h2>
          <div className="flex items-center">
            {STATUS_STEPS.map((step, i) => {
              const done = currentStepIdx >= i;
              const current = currentStepIdx === i;
              const labels: Record<string, string> = {
                PENDING_APPROVAL: 'Chờ xác nhận',
                CONFIRMED: 'Đã xác nhận',
                IN_PROGRESS: 'Đang thuê',
                COMPLETED: 'Hoàn thành',
              };
              return (
                <div key={step} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white transition-all"
                      style={{ background: done ? '#2a7bd9' : '#e2e8f3', color: done ? '#fff' : '#8694ad' }}
                    >
                      {done && !current ? '✓' : i + 1}
                    </div>
                    <span className="text-center text-[10px] font-medium" style={{ color: done ? '#2a7bd9' : '#8694ad' }}>
                      {labels[step]}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className="mx-2 h-0.5 flex-1" style={{ background: done && currentStepIdx > i ? '#2a7bd9' : '#e2e8f3' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: listing + dates */}
        <div className="lg:col-span-2 space-y-5">
          {/* Listing card */}
          {booking.listing && (
            <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: '#DCEFFB' }}>
              <div className="flex items-stretch gap-0">
                <div className="h-auto w-40 shrink-0 overflow-hidden bg-[#f1f5fa]">
                  {booking.listing.imageUrls?.[0] ? (
                    <img src={booking.listing.imageUrls[0]} alt={booking.listing.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl">⛺</div>
                  )}
                </div>
                <div className="flex-1 p-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#2a7bd9' }}>
                    {CATEGORY_LABELS[booking.listing.category] ?? booking.listing.category}
                  </span>
                  <p className="mt-1 font-semibold" style={{ color: '#0f1729' }}>{booking.listing.title}</p>
                  <p className="mt-1 text-sm" style={{ color: '#8694ad' }}>{booking.listing.location}</p>
                  <Link
                    href={`/listings/${booking.listing.id}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: '#2a7bd9' }}
                  >
                    Xem sản phẩm →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: '#DCEFFB' }}>
            <h2 className="mb-4 text-sm font-semibold" style={{ color: '#0f1729' }}>Thời gian thuê</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="mb-1 text-xs" style={{ color: '#8694ad' }}>Nhận đồ</p>
                <p className="font-semibold" style={{ color: '#0f1729' }}>{startDate.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div>
                <p className="mb-1 text-xs" style={{ color: '#8694ad' }}>Trả đồ</p>
                <p className="font-semibold" style={{ color: '#0f1729' }}>{endDate.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg px-3 py-2.5 text-sm" style={{ background: '#f6fbfe' }}>
              Tổng: <strong style={{ color: '#0f1729' }}>{nights} ngày</strong>
            </div>
          </div>

          {/* Delivery info */}
          {booking.deliveryMethod === 'DELIVERY' && booking.deliveryAddress && (
            <div className="rounded-2xl border bg-white p-5" style={{ borderColor: '#DCEFFB' }}>
              <h2 className="mb-2 text-sm font-semibold" style={{ color: '#0f1729' }}>Địa chỉ giao hàng</h2>
              <p className="text-sm" style={{ color: '#5a6b85' }}>{booking.deliveryAddress}</p>
            </div>
          )}
        </div>

        {/* Right: payment + actions */}
        <div className="space-y-5">
          {/* Payment */}
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: '#DCEFFB' }}>
            <h2 className="mb-4 text-sm font-semibold" style={{ color: '#0f1729' }}>Thanh toán</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span style={{ color: '#5a6b85' }}>Đơn giá</span>
                <span style={{ color: '#0f1729' }}>
                  {booking.listing
                    ? `${Number(booking.listing.price).toLocaleString('vi-VN')} × ${nights} ngày`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2.5 text-base font-bold" style={{ borderColor: '#DCEFFB' }}>
                <span style={{ color: '#0f1729' }}>Tổng cộng</span>
                <span style={{ color: '#2a7bd9' }}>{price.toLocaleString('vi-VN')} {booking.listing?.currency ?? 'VND'}</span>
              </div>
              {booking.payment && (
                <div className="mt-2 rounded-lg px-3 py-2 text-xs" style={{ background: '#f6fbfe', color: '#5a6b85' }}>
                  Phương thức: {booking.payment.method} · Trạng thái: {booking.payment.status}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-2xl border bg-white p-5 space-y-3" style={{ borderColor: '#DCEFFB' }}>
            <h2 className="mb-2 text-sm font-semibold" style={{ color: '#0f1729' }}>Hành động</h2>

            {/* Provider: sign contract / decline */}
            {isProvider && isPendingApproval && (
              <>
                <div
                  className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
                  style={{ borderColor: '#bfdbfe', background: '#eff6ff' }}
                >
                  <span className="text-base">📜</span>
                  <p className="text-xs leading-snug" style={{ color: '#1d4ed8' }}>
                    <strong>Khách đã ký hợp đồng.</strong> Bạn cần đọc và ký để xác nhận đơn.
                  </p>
                </div>
                <Link
                  href={`/bookings/${booking.id}/contract`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition"
                  style={{ background: '#2a7bd9' }}
                >
                  ✍️ Xem & ký hợp đồng
                </Link>
                <button
                  onClick={() => setShowDeclineModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition hover:bg-red-50"
                  style={{ borderColor: '#fca5a5', color: '#dc2626' }}
                >
                  ✕ Từ chối đơn
                </button>
              </>
            )}

            {/* Provider: start rental */}
            {isProvider && booking.status === 'CONFIRMED' && (
              <button
                onClick={() => startBooking.mutate(booking.id)}
                disabled={startBooking.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ background: '#16a34a' }}
              >
                {startBooking.isPending ? 'Đang xử lý…' : '▶ Bắt đầu cho thuê'}
              </button>
            )}

            {/* Provider: complete rental */}
            {isProvider && booking.status === 'IN_PROGRESS' && (
              <button
                onClick={() => completeBooking.mutate(booking.id)}
                disabled={completeBooking.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ background: '#2a7bd9' }}
              >
                {completeBooking.isPending ? 'Đang xử lý…' : '✓ Hoàn thành cho thuê'}
              </button>
            )}

            {/* Traveler: contact provider */}
            {!isProvider && booking.listing && (
              <Link
                href={`/messages?to=${booking.listing.providerId}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all hover:shadow-sm"
                style={{ borderColor: '#DCEFFB', color: '#2a7bd9' }}
              >
                💬 Liên hệ Provider
              </Link>
            )}

            {/* Traveler: modify request */}
            {canModify && (
              <button
                onClick={() => {
                  setModifyStart(booking.startDate.slice(0, 10));
                  setModifyEnd(booking.endDate.slice(0, 10));
                  setModifyQtyStr(String(booking.quantity));
                  setModifyReason('');
                  setModifyError(null);
                  setShowModifyModal(true);
                }}
                disabled={hasPendingRequest}
                title={hasPendingRequest ? 'Đang có yêu cầu thay đổi chờ xử lý' : ''}
                className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: '#DCEFFB', color: '#5a6b85' }}
              >
                ✏️ {hasPendingRequest ? 'Đã gửi yêu cầu thay đổi' : 'Yêu cầu thay đổi ngày'}
              </button>
            )}

            {/* Traveler: cancel */}
            {!isProvider && canCancel && (
              <button
                onClick={() => setShowDeclineModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all hover:bg-red-50"
                style={{ borderColor: '#fca5a5', color: '#dc2626' }}
              >
                ✕ Huỷ đơn
              </button>
            )}
          </div>

          {/* Modify request modal */}
          {showModifyModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.4)' }}
            >
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <h3 className="mb-1 text-base font-semibold" style={{ color: '#0f1729' }}>
                  Yêu cầu thay đổi ngày
                </h3>
                <p className="mb-4 text-xs" style={{ color: '#8694ad' }}>
                  Provider sẽ xem xét và xác nhận yêu cầu của bạn.
                </p>

                {modifyError && (
                  <div
                    className="mb-3 rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}
                  >
                    {modifyError}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium" style={{ color: '#5a6b85' }}>
                        Ngày nhận mới
                      </label>
                      <input
                        type="date"
                        value={modifyStart}
                        onChange={(e) => setModifyStart(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                        style={{ borderColor: '#d0dce8' }}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium" style={{ color: '#5a6b85' }}>
                        Ngày trả mới
                      </label>
                      <input
                        type="date"
                        value={modifyEnd}
                        onChange={(e) => setModifyEnd(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                        style={{ borderColor: '#d0dce8' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium" style={{ color: '#5a6b85' }}>
                      Số lượng (tuỳ chọn)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={modifyQtyStr}
                      onChange={(e) => setModifyQtyStr(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                      style={{ borderColor: '#d0dce8' }}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium" style={{ color: '#5a6b85' }}>
                      Lý do (tuỳ chọn)
                    </label>
                    <textarea
                      rows={2}
                      value={modifyReason}
                      onChange={(e) => setModifyReason(e.target.value)}
                      placeholder="Giải thích lý do thay đổi..."
                      className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                      style={{ borderColor: '#d0dce8' }}
                    />
                  </div>
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => { setShowModifyModal(false); setModifyError(null); }}
                    className="flex-1 rounded-lg border py-2.5 text-sm font-medium"
                    style={{ borderColor: '#DCEFFB', color: '#5a6b85' }}
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={async () => {
                      setModifyError(null);
                      const qty = modifyQtyStr ? parseInt(modifyQtyStr, 10) : undefined;
                      try {
                        await createModify.mutateAsync({
                          newStartDate: modifyStart,
                          newEndDate: modifyEnd,
                          newQuantity: qty,
                          reason: modifyReason || undefined,
                        });
                        setShowModifyModal(false);
                      } catch (err: unknown) {
                        setModifyError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
                      }
                    }}
                    disabled={!modifyStart || !modifyEnd || createModify.isPending}
                    className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: '#2a7bd9' }}
                  >
                    {createModify.isPending ? 'Đang gửi…' : 'Gửi yêu cầu'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Provider: reject modify request modal */}
          {rejectTarget && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.4)' }}
            >
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <h3 className="mb-4 text-base font-semibold" style={{ color: '#0f1729' }}>
                  Từ chối yêu cầu thay đổi
                </h3>
                <textarea
                  rows={3}
                  placeholder="Lý do từ chối (tuỳ chọn)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                  style={{ borderColor: '#d0dce8' }}
                />
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                    className="flex-1 rounded-lg border py-2.5 text-sm font-medium"
                    style={{ borderColor: '#DCEFFB', color: '#5a6b85' }}
                  >
                    Quay lại
                  </button>
                  <button
                    onClick={async () => {
                      if (!rejectTarget) return;
                      await rejectModify.mutateAsync({ requestId: rejectTarget, reason: rejectReason || undefined });
                      setRejectTarget(null);
                      setRejectReason('');
                    }}
                    disabled={rejectModify.isPending}
                    className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: '#e84040' }}
                  >
                    {rejectModify.isPending ? 'Đang xử lý…' : 'Từ chối'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cancel / decline modal */}
          {showDeclineModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.4)' }}
            >
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <h3 className="mb-4 text-base font-semibold" style={{ color: '#0f1729' }}>
                  {isProvider ? 'Từ chối đơn' : 'Huỷ đơn'}
                </h3>

                {/* Refund policy for traveler */}
                {!isProvider && (
                  <div
                    className="mb-4 rounded-xl p-4 text-sm"
                    style={{ background: refundPolicy.amount > 0 ? '#f0fdf4' : '#fff7ed',
                      border: `1px solid ${refundPolicy.amount > 0 ? '#bbf7d0' : '#fed7aa'}` }}
                  >
                    <p className="font-semibold" style={{ color: refundPolicy.amount > 0 ? '#15803d' : '#c2410c' }}>
                      {refundPolicy.label}
                    </p>
                    {refundPolicy.amount > 0 && (
                      <p className="mt-0.5 text-xs" style={{ color: '#5a6b85' }}>
                        Hoàn lại: {refundPolicy.amount.toLocaleString('vi-VN')} VND
                      </p>
                    )}
                    {refundPolicy.warning && (
                      <p className="mt-1 text-xs" style={{ color: '#c2410c' }}>
                        ⚠ {refundPolicy.warning}
                      </p>
                    )}
                  </div>
                )}

                <textarea
                  rows={3}
                  placeholder={isProvider ? 'Lý do từ chối (tuỳ chọn)' : 'Lý do huỷ (tuỳ chọn)'}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                  style={{ borderColor: '#d0dce8' }}
                />

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => { setShowDeclineModal(false); setDeclineReason(''); }}
                    className="flex-1 rounded-lg border py-2.5 text-sm font-medium"
                    style={{ borderColor: '#DCEFFB', color: '#5a6b85' }}
                  >
                    Quay lại
                  </button>
                  <button
                    onClick={async () => {
                      if (isProvider) {
                        await decline.mutateAsync({ id: booking.id, reason: declineReason || undefined });
                      } else {
                        await cancelBookingAsync({ id: booking.id, reason: declineReason || undefined });
                      }
                      setShowDeclineModal(false);
                      setDeclineReason('');
                    }}
                    disabled={decline.isPending || cancelling}
                    className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: '#e84040' }}
                  >
                    {(decline.isPending || cancelling) ? 'Đang xử lý…'
                      : isProvider ? 'Xác nhận từ chối'
                      : 'Xác nhận huỷ'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contract section — visible throughout rental */}
      {contract && (
        <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: '#DCEFFB' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ background: '#f6fbfe', borderBottom: '1px solid #DCEFFB' }}>
            <div className="flex items-center gap-2.5">
              <span className="text-base">📄</span>
              <span className="text-sm font-semibold" style={{ color: '#0f1729' }}>Hợp đồng thuê thiết bị</span>
              {(() => {
                const cfg = CONTRACT_STATUS_COLOR[contract.status as ContractStatus];
                return (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                    style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                  >
                    {CONTRACT_STATUS_LABEL[contract.status as ContractStatus]}
                  </span>
                );
              })()}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  printContract(
                    contract,
                    booking.traveler?.name ?? 'Khách thuê',
                    booking.listing?.title ?? 'Người cho thuê',
                  )
                }
                className="text-xs font-medium"
                style={{ color: '#5a6b85' }}
              >
                🖨️ Xuất PDF
              </button>
              <Link
                href={`/bookings/${booking.id}/contract`}
                className="text-xs font-medium"
                style={{ color: '#2a7bd9' }}
              >
                Xem đầy đủ →
              </Link>
            </div>
          </div>
          <div className="px-5 py-4">
            <ContractViewer
              terms={contract.terms}
              penaltyRules={contract.penaltyRules ?? undefined}
              conditionNote={contract.productConditionNote}
              isHighValue={contract.isHighValue}
              collapsible
            />
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg px-3 py-2.5" style={{ background: '#f6fbfe' }}>
                <p className="font-bold uppercase tracking-wide mb-0.5" style={{ color: '#8694ad' }}>Khách thuê</p>
                {contract.travelerSignedAt
                  ? <p style={{ color: '#15803d' }}>✓ Đã ký {new Date(contract.travelerSignedAt).toLocaleString('vi-VN')}</p>
                  : <p style={{ color: '#f59e0b' }}>⏳ Chưa ký</p>}
              </div>
              <div className="rounded-lg px-3 py-2.5" style={{ background: '#f6fbfe' }}>
                <p className="font-bold uppercase tracking-wide mb-0.5" style={{ color: '#8694ad' }}>Người cho thuê</p>
                {contract.providerSignedAt
                  ? <p style={{ color: '#15803d' }}>✓ Đã ký {new Date(contract.providerSignedAt).toLocaleString('vi-VN')}</p>
                  : <p style={{ color: '#f59e0b' }}>⏳ Chưa ký</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isProvider && booking.status === 'COMPLETED' && !currentReview && (
        <ReviewForm bookingId={booking.id} />
      )}

      {!isProvider && currentReview && (
        <div className="rounded-2xl border bg-white p-5" style={{ borderColor: '#DCEFFB' }}>
          <h2 className="text-sm font-semibold" style={{ color: '#0f1729' }}>Đánh giá của bạn</h2>
          <p className="mt-2 text-xl" style={{ color: '#f59e0b' }}>{'★'.repeat(currentReview.rating)}{'☆'.repeat(5 - currentReview.rating)}</p>
          <p className="mt-2 text-sm" style={{ color: '#5a6b85' }}>{currentReview.comment}</p>
          {currentReview.status === 'PENDING' && (
            <p className="mt-2 text-xs" style={{ color: '#a16207' }}>AI đang phân tích đánh giá trước khi hiển thị công khai.</p>
          )}
          {currentReview.status === 'FLAGGED' && (
            <p className="mt-2 text-xs" style={{ color: '#a16207' }}>Đánh giá cần Admin kiểm duyệt trước khi có thể công khai.</p>
          )}
          {currentReview.status === 'PUBLISHED' && (
            <p className="mt-2 text-xs" style={{ color: '#15803d' }}>Đánh giá đã được công khai.</p>
          )}
          {currentReview.status === 'REJECTED' && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-semibold text-red-700">Đánh giá không được công khai</p>
              <p className="mt-1 text-xs leading-5 text-red-600">
                Lý do: {currentReview.rejectionReason ?? 'Đánh giá không đáp ứng chính sách nội dung.'}
              </p>
              <p className="mt-1 text-xs text-red-500">Đánh giá này chỉ bạn và quản trị viên nhìn thấy.</p>
            </div>
          )}
        </div>
      )}

      {/* Modify requests history */}
      {!!modifyRequests?.length && (
        <ModifyRequestsSection
          requests={modifyRequests}
          isProvider={isProvider}
          bookingId={booking.id}
          acceptModify={acceptModify}
          onReject={(requestId) => { setRejectTarget(requestId); setRejectReason(''); }}
        />
      )}
    </div>
  );
}

const MODIFY_STATUS_CONFIG: Record<ModifyRequestStatus, { label: string; bg: string; text: string; border: string }> = {
  PENDING:  { label: 'Chờ xử lý', bg: '#fefce8', text: '#a16207', border: '#fef08a' },
  ACCEPTED: { label: 'Đã chấp nhận', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  REJECTED: { label: 'Đã từ chối', bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
};

function ModifyRequestsSection({
  requests,
  isProvider,
  bookingId: _bookingId,
  acceptModify,
  onReject,
}: {
  requests: import('@/types/booking').ModifyRequest[];
  isProvider: boolean;
  bookingId: string;
  acceptModify: ReturnType<typeof useAcceptModifyRequest>;
  onReject: (requestId: string) => void;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5" style={{ borderColor: '#DCEFFB' }}>
      <h2 className="mb-4 text-sm font-semibold" style={{ color: '#0f1729' }}>
        Yêu cầu thay đổi ({requests.length})
      </h2>
      <div className="space-y-3">
        {requests.map((req) => {
          const cfg = MODIFY_STATUS_CONFIG[req.status];
          const newStart = new Date(req.newStartDate);
          const newEnd = new Date(req.newEndDate);
          const newDays = Math.round((newEnd.getTime() - newStart.getTime()) / 86_400_000) + 1;
          const isAccepting = acceptModify.isPending && (acceptModify.variables as { requestId: string })?.requestId === req.id;

          return (
            <div
              key={req.id}
              className="rounded-xl border p-4"
              style={{ borderColor: req.status === 'PENDING' ? '#fef08a' : '#e2e8f3' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-xs" style={{ color: '#8694ad' }}>
                    {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                {!isProvider && (
                  <span className="text-xs" style={{ color: '#8694ad' }}>
                    {req.requestedBy.name}
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: '#8694ad' }}>Ngày nhận mới</p>
                  <p className="font-medium" style={{ color: '#0f1729' }}>
                    {newStart.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: '#8694ad' }}>Ngày trả mới</p>
                  <p className="font-medium" style={{ color: '#0f1729' }}>
                    {newEnd.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <p className="mt-1.5 text-xs" style={{ color: '#5a6b85' }}>
                {newDays} ngày
                {req.newQuantity != null && ` · × ${req.newQuantity} thiết bị`}
              </p>

              {req.reason && (
                <p className="mt-1.5 text-xs italic" style={{ color: '#8694ad' }}>
                  "{req.reason}"
                </p>
              )}

              {/* Provider actions for PENDING */}
              {isProvider && req.status === 'PENDING' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onReject(req.id)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-red-50"
                    style={{ borderColor: '#fca5a5', color: '#dc2626' }}
                  >
                    Từ chối
                  </button>
                  <button
                    onClick={() => acceptModify.mutate({ requestId: req.id })}
                    disabled={isAccepting}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: '#2a7bd9' }}
                  >
                    {isAccepting ? 'Đang xử lý…' : '✓ Chấp nhận'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm" style={{ color: '#8694ad' }}>
          <Link href="/bookings" className="hover:underline" style={{ color: '#2a7bd9' }}>Đặt thuê của tôi</Link>
          <span>/</span>
          <span style={{ color: '#0f1729' }}>Chi tiết đơn</span>
        </nav>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-[#e2e8f3]" />}>
          <BookingDetailContent />
        </Suspense>
      </div>
    </div>
  );
}
