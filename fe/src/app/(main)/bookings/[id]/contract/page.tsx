'use client';

import { Suspense, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBooking } from '@/hooks/useBookings';
import { useContract, useProviderSignContract } from '@/hooks/useContracts';
import { useAuthStore } from '@/store/auth.store';
import { ContractViewer } from '@/components/contracts/ContractViewer';
import { SignatureCheckbox } from '@/components/contracts/SignatureCheckbox';
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_COLOR } from '@/types/contract';
import type { ContractStatus } from '@/types/contract';
import { printContract } from '@/lib/printContract';

function ContractSignContent() {
  const { id: bookingId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: booking, isLoading: bookingLoading } = useBooking(bookingId);
  const { data: contract, isLoading: contractLoading } = useContract(bookingId, !!bookingId);
  const signContract = useProviderSignContract();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = bookingLoading || contractLoading;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 animate-pulse rounded bg-[#e2e8f3]" />
        <div className="h-64 animate-pulse rounded-2xl bg-[#e2e8f3]" />
        <div className="h-16 animate-pulse rounded-xl bg-[#e2e8f3]" />
      </div>
    );
  }

  if (!booking || !contract) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="mb-4 text-5xl">📄</span>
        <p className="text-sm mb-4" style={{ color: '#8694ad' }}>Không tìm thấy hợp đồng.</p>
        <Link href={`/bookings/${bookingId}`} className="rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: '#2a7bd9' }}>
          Về chi tiết đơn
        </Link>
      </div>
    );
  }

  const isProvider = user?.id === booking.listing?.providerId;
  const canSign = isProvider && contract.status === 'TRAVELER_SIGNED';
  const alreadySigned = contract.status !== 'PENDING' && contract.status !== 'TRAVELER_SIGNED';

  const statusCfg = CONTRACT_STATUS_COLOR[contract.status as ContractStatus];

  async function handleSign() {
    if (!agreed || !canSign) return;
    setError(null);
    try {
      await signContract.mutateAsync(bookingId);
      router.push(`/bookings/${bookingId}?signed=1`);
    } catch (err) {
      setError((err as Error).message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm" style={{ color: '#8694ad' }}>
            Đơn #{booking.id.slice(-12).toUpperCase()}
          </p>
          <h1 className="mt-1 text-2xl font-bold" style={{ color: '#0f1729' }}>
            Hợp đồng thuê thiết bị
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              printContract(
                contract,
                booking.traveler?.name ?? 'Khách thuê',
                booking.listing?.title ?? 'Người cho thuê',
              )
            }
            className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-[#f6fbfe]"
            style={{ borderColor: '#DCEFFB', color: '#2a7bd9' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Xuất PDF
          </button>
          <span
            className="rounded-full px-3 py-1 text-sm font-semibold"
            style={{ background: statusCfg.bg, color: statusCfg.text, border: `1px solid ${statusCfg.border}` }}
          >
            {CONTRACT_STATUS_LABEL[contract.status as ContractStatus] ?? contract.status}
          </span>
        </div>
      </div>

      {/* Signing parties info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-white p-5" style={{ borderColor: '#DCEFFB' }}>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: '#8694ad' }}>Khách thuê</p>
          <p className="font-semibold" style={{ color: '#0f1729' }}>{booking.traveler?.name ?? '—'}</p>
          {contract.travelerSignedAt && (
            <p className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: '#15803d' }}>
              <span>✓</span>
              Đã ký {new Date(contract.travelerSignedAt).toLocaleString('vi-VN')}
            </p>
          )}
        </div>
        <div className="rounded-2xl border bg-white p-5" style={{ borderColor: '#DCEFFB' }}>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: '#8694ad' }}>Người cho thuê</p>
          <p className="font-semibold" style={{ color: '#0f1729' }}>{booking.listing?.title ?? '—'}</p>
          {contract.providerSignedAt ? (
            <p className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: '#15803d' }}>
              <span>✓</span>
              Đã ký {new Date(contract.providerSignedAt).toLocaleString('vi-VN')}
            </p>
          ) : (
            <p className="mt-1.5 text-xs" style={{ color: '#f59e0b' }}>
              ⏳ Chờ ký
            </p>
          )}
        </div>
      </div>

      {/* Contract body */}
      <ContractViewer
        terms={contract.terms}
        penaltyRules={contract.penaltyRules ?? undefined}
        conditionNote={contract.productConditionNote}
        isHighValue={contract.isHighValue}
        collapsible={false}
      />

      {/* Sign area (provider only, when TRAVELER_SIGNED) */}
      {canSign && (
        <div className="rounded-2xl border bg-white p-6 space-y-4" style={{ borderColor: '#DCEFFB' }}>
          <h2 className="text-base font-semibold" style={{ color: '#0f1729' }}>Ký hợp đồng</h2>
          <p className="text-sm" style={{ color: '#5a6b85' }}>
            Bằng cách ký hợp đồng, bạn xác nhận đã đọc và đồng ý với toàn bộ điều khoản,
            đồng thời xác nhận đơn thuê này.
          </p>

          <SignatureCheckbox checked={agreed} onChange={setAgreed} />

          {error && (
            <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSign}
            disabled={!agreed || signContract.isPending}
            className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: agreed ? '#2a7bd9' : '#94a3b8',
              boxShadow: agreed ? '0 8px 24px -6px rgba(42,123,217,0.4)' : 'none',
            }}
          >
            {signContract.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang xử lý…
              </span>
            ) : '✍️ Ký hợp đồng & Xác nhận đơn'}
          </button>
        </div>
      )}

      {/* Already signed notice */}
      {alreadySigned && (
        <div
          className="flex items-center gap-3 rounded-xl border px-5 py-4 text-sm"
          style={{ borderColor: '#bbf7d0', background: '#f0fdf4', color: '#15803d' }}
        >
          <span className="text-xl">✓</span>
          <div>
            <p className="font-semibold">Hợp đồng đã được ký bởi cả hai bên</p>
            {contract.providerSignedAt && (
              <p className="text-xs mt-0.5" style={{ color: '#16a34a' }}>
                Ký lúc: {new Date(contract.providerSignedAt).toLocaleString('vi-VN')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Non-provider notice */}
      {!isProvider && !alreadySigned && (
        <div
          className="rounded-xl border px-5 py-4 text-sm"
          style={{ borderColor: '#DCEFFB', background: '#f6fbfe', color: '#5a6b85' }}
        >
          Hợp đồng đang chờ người cho thuê ký xác nhận.
        </div>
      )}
    </div>
  );
}

export default function ContractPage() {
  const { id: bookingId } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <nav className="mb-6 flex items-center gap-2 text-sm" style={{ color: '#8694ad' }}>
          <Link href="/dashboard/bookings" className="hover:underline" style={{ color: '#2a7bd9' }}>
            Quản lý đặt thuê
          </Link>
          <span>/</span>
          <Link href={`/bookings/${bookingId}`} className="hover:underline" style={{ color: '#2a7bd9' }}>
            Chi tiết đơn
          </Link>
          <span>/</span>
          <span style={{ color: '#0f1729' }}>Hợp đồng</span>
        </nav>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-[#e2e8f3]" />}>
          <ContractSignContent />
        </Suspense>
      </div>
    </div>
  );
}
