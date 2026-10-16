'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { paymentsApi } from '@/lib/api/payments';

type Result = 'success' | 'failed' | 'pending';

function PaymentReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<Result>('pending');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);

  const confirmed = useRef(false);

  useEffect(() => {
    // PayOS return URL params: ?code=00&status=PAID&orderCode=123456&cancel=false
    const code = searchParams.get('code');
    const status = searchParams.get('status');
    const cancelled = searchParams.get('cancel');
    const orderCode = searchParams.get('orderCode');

    if (code === '00' && status === 'PAID' && cancelled !== 'true' && orderCode) {
      // URL params are user-editable, so BE verifies with PayOS before the booking moves on
      if (confirmed.current) return;
      confirmed.current = true;
      paymentsApi
        .confirmPayosReturn(orderCode)
        .then((res) => {
          setBookingId(res.bookingId);
          setBookingStatus(res.status);
          setResult('success');
        })
        .catch(() => setResult('failed'));
    } else if (code !== null || cancelled === 'true') {
      setResult('failed');
    }
  }, [searchParams]);

  // Auto-redirect to booking on success
  useEffect(() => {
    if (result === 'success' && bookingId) {
      const t = setTimeout(() => {
        router.push(`/bookings/${bookingId}`);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [result, bookingId, router]);

  if (result === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2a7bd9] border-t-transparent" />
        <p className="mt-4 text-sm" style={{ color: '#5a6b85' }}>Đang xác nhận giao dịch…</p>
      </div>
    );
  }

  if (result === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: '#f0fdf4' }}>
          <svg className="h-8 w-8" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-bold" style={{ color: '#0f1729' }}>Thanh toán thành công!</h1>
        <p className="mt-2 text-sm" style={{ color: '#5a6b85' }}>
          {bookingStatus === 'CONFIRMED'
            ? 'Giao dịch đã được xác nhận. Bạn đã thanh toán đủ tiền thuê, provider sẽ giao hàng theo lịch.'
            : 'Đã nhận tiền cọc. Đơn thuê của bạn đang chờ provider xác nhận, sau đó bạn sẽ thanh toán nốt tiền thuê trong 24 giờ.'}
        </p>
        {bookingId ? (
          <p className="mt-1 text-xs" style={{ color: '#8694ad' }}>Tự động chuyển hướng sau 3 giây…</p>
        ) : null}
        <div className="mt-6 flex gap-3">
          {bookingId && (
            <Link
              href={`/bookings/${bookingId}`}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: '#2a7bd9' }}
            >
              Xem đơn thuê
            </Link>
          )}
          <Link
            href="/bookings"
            className="rounded-full border px-5 py-2.5 text-sm font-semibold"
            style={{ borderColor: '#d0dce8', color: '#5a6b85' }}
          >
            Tất cả đơn thuê
          </Link>
          <Link
            href="/profile/payments"
            className="rounded-full border px-5 py-2.5 text-sm font-semibold"
            style={{ borderColor: '#d0dce8', color: '#5a6b85' }}
          >
            Xem ví
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: '#fef2f2' }}>
        <svg className="h-8 w-8" style={{ color: '#dc2626' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="mt-4 text-xl font-bold" style={{ color: '#0f1729' }}>Thanh toán thất bại</h1>
      <p className="mt-2 text-sm" style={{ color: '#5a6b85' }}>
        Giao dịch chưa hoàn tất. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.
      </p>
      <div className="mt-6 flex gap-3">
        {bookingId && (
          <Link
            href={`/bookings/${bookingId}`}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: '#2a7bd9' }}
          >
            Thử lại
          </Link>
        )}
        <Link
          href="/bookings"
          className="rounded-full border px-5 py-2.5 text-sm font-semibold"
          style={{ borderColor: '#d0dce8', color: '#5a6b85' }}
        >
          Về danh sách đơn
        </Link>
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-lg px-4 py-8">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-24">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2a7bd9] border-t-transparent" />
          </div>
        }>
          <PaymentReturnContent />
        </Suspense>
      </div>
    </div>
  );
}
