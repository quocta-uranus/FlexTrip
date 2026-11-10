'use client';

import { useEffect, useRef, useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api/payments';
type Result = 'pending' | 'success' | 'failed';

function TopupReturnContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<Result>('pending');
  const [amount, setAmount] = useState<number | null>(null);
  const qc = useQueryClient();
  const confirmed = useRef(false);

  useEffect(() => {
    // PayOS return URL params: ?code=00&status=PAID&orderCode=123456&cancel=false&amount=50000
    const code = searchParams.get('code');
    const status = searchParams.get('status');
    const cancelled = searchParams.get('cancel');
    const orderCode = searchParams.get('orderCode');

    if (code === '00' && status === 'PAID' && cancelled !== 'true' && orderCode) {
      // URL params are user-editable, so BE verifies with PayOS before crediting the wallet
      if (confirmed.current) return;
      confirmed.current = true;
      paymentsApi
        .confirmTopupReturn(orderCode)
        .then((res) => {
          setAmount(res.amount);
          setResult('success');
          qc.invalidateQueries({ queryKey: ['wallet'] });
          qc.invalidateQueries({ queryKey: ['wallet-transactions'] });
        })
        .catch(() => setResult('failed'));
    } else if (code !== null || cancelled === 'true') {
      setResult('failed');
    }
  }, [searchParams, qc]);

  useEffect(() => {
    if (result === 'success') {
      const t = setTimeout(() => router.push('/profile/payments'), 3000);
      return () => clearTimeout(t);
    }
  }, [result, router]);

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
        <h1 className="mt-4 text-xl font-bold" style={{ color: '#0f1729' }}>Nạp tiền thành công!</h1>
        {amount && (
          <p className="mt-2 text-2xl font-extrabold" style={{ color: '#2a7bd9' }}>
            +{amount.toLocaleString('vi-VN')}₫
          </p>
        )}
        <p className="mt-2 text-sm" style={{ color: '#5a6b85' }}>
          Số dư ví đã được cập nhật.
        </p>
        <p className="mt-1 text-xs" style={{ color: '#8694ad' }}>Tự động chuyển về ví sau 3 giây…</p>
        <div className="mt-6">
          <Link
            href="/profile/payments"
            className="rounded-full px-6 py-2.5 text-sm font-semibold text-white"
            style={{ background: '#2a7bd9' }}
          >
            Về ví ngay
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
      <h1 className="mt-4 text-xl font-bold" style={{ color: '#0f1729' }}>Nạp tiền thất bại</h1>
      <p className="mt-2 text-sm" style={{ color: '#5a6b85' }}>
        Giao dịch chưa hoàn tất. Vui lòng thử lại.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/profile/payments"
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: '#2a7bd9' }}
        >
          Thử lại
        </Link>
        <Link
          href="/"
          className="rounded-full border px-5 py-2.5 text-sm font-semibold"
          style={{ borderColor: '#d0dce8', color: '#5a6b85' }}
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}

export default function TopupReturnPage() {
  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-lg px-4 py-8">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-24">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2a7bd9] border-t-transparent" />
          </div>
        }>
          <TopupReturnContent />
        </Suspense>
      </div>
    </div>
  );
}
