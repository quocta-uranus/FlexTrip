'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBooking } from '@/hooks/useBookings';
import { useCheckin } from '@/hooks/useContracts';
import { useAuthStore } from '@/store/auth.store';
import { IdCaptureStep, type IdDocumentType } from '@/components/contracts/IdCaptureStep';
import { PhotoUploadGrid } from '@/components/contracts/PhotoUploadGrid';

export default function CheckinPage() {
  const { id: bookingId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: booking, isLoading } = useBooking(bookingId);
  const checkin = useCheckin();

  const [idPhotoUrl, setIdPhotoUrl] = useState<string | null>(null);
  const [idDocumentType, setIdDocumentType] = useState<IdDocumentType>('NATIONAL_ID');
  const [checkInPhotos, setCheckInPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isProvider = booking && user?.id === booking.listing?.providerId;
  const canCheckin = booking?.status === 'CONFIRMED';
  const isReady = !!idPhotoUrl && checkInPhotos.length >= 3;

  async function handleSubmit() {
    if (!isReady) return;
    setError(null);
    try {
      await checkin.mutateAsync({
        bookingId,
        payload: {
          idDocumentUrl: idPhotoUrl!,
          idDocumentType,
          checkInPhotos,
        },
      });
      router.push(`/bookings/${bookingId}?checkin=1`);
    } catch (err) {
      setError((err as Error).message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#f6fbfe' }}>
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2a7bd9] border-t-transparent" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: '#f6fbfe' }}>
        <p className="text-sm" style={{ color: '#8694ad' }}>Không tìm thấy đơn thuê.</p>
        <Link href="/dashboard/bookings" className="text-sm font-medium" style={{ color: '#2a7bd9' }}>← Quay lại</Link>
      </div>
    );
  }

  if (!isProvider) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: '#f6fbfe' }}>
        <p className="text-sm" style={{ color: '#8694ad' }}>Chỉ người cho thuê mới có thể thực hiện checkin.</p>
        <Link href={`/bookings/${bookingId}`} className="text-sm font-medium" style={{ color: '#2a7bd9' }}>← Về chi tiết đơn</Link>
      </div>
    );
  }

  if (booking.assignedStaff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f6fbfe] px-4 text-center">
        <p className="max-w-md text-sm text-slate-500">
          Nhân viên <strong className="text-slate-800">{booking.assignedStaff.name}</strong> được giao bàn giao thiết bị cho đơn này,
          nên bạn không cần checkin. Nhân viên sẽ xác nhận và bắt đầu cuộc thuê.
        </p>
        <Link href={`/bookings/${bookingId}`} className="text-sm font-medium text-[#2a7bd9]">← Về chi tiết đơn</Link>
      </div>
    );
  }

  if (!canCheckin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: '#f6fbfe' }}>
        <p className="text-sm" style={{ color: '#8694ad' }}>
          Chỉ có thể checkin khi đơn ở trạng thái Đã xác nhận (CONFIRMED). Hiện tại: {booking.status}
        </p>
        <Link href={`/bookings/${bookingId}`} className="text-sm font-medium" style={{ color: '#2a7bd9' }}>← Về chi tiết đơn</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm" style={{ color: '#8694ad' }}>
          <Link href="/dashboard/bookings" className="hover:underline" style={{ color: '#2a7bd9' }}>Quản lý đặt thuê</Link>
          <span>/</span>
          <Link href={`/bookings/${bookingId}`} className="hover:underline" style={{ color: '#2a7bd9' }}>Chi tiết đơn</Link>
          <span>/</span>
          <span style={{ color: '#0f1729' }}>Giao hàng (Check-in)</span>
        </nav>

        <h1 className="mb-2 text-2xl font-bold" style={{ color: '#0f1729' }}>Xác nhận giao hàng</h1>
        <p className="mb-8 text-sm" style={{ color: '#5a6b85' }}>
          Đơn: <span className="font-semibold" style={{ color: '#0f1729' }}>{booking.listing?.title}</span>
          {' · '}Khách: <span className="font-semibold" style={{ color: '#0f1729' }}>{booking.traveler?.name}</span>
        </p>

        <div className="space-y-6">
          {/* Step 1: CCCD */}
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#DCEFFB' }}>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: idPhotoUrl ? '#16a34a' : '#2a7bd9' }}>
                {idPhotoUrl ? '✓' : '1'}
              </div>
              <h2 className="text-base font-semibold" style={{ color: '#0f1729' }}>Xác minh CCCD / Hộ chiếu</h2>
            </div>
            <IdCaptureStep
              idPhotoUrl={idPhotoUrl}
              idDocumentType={idDocumentType}
              onIdPhotoChange={setIdPhotoUrl}
              onDocumentTypeChange={setIdDocumentType}
            />
          </div>

          {/* Step 2: Product photos */}
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#DCEFFB' }}>
            <div className="mb-4 flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: checkInPhotos.length >= 3 ? '#16a34a' : '#2a7bd9' }}
              >
                {checkInPhotos.length >= 3 ? '✓' : '2'}
              </div>
              <h2 className="text-base font-semibold" style={{ color: '#0f1729' }}>Ảnh tình trạng sản phẩm trước khi giao</h2>
            </div>
            <p className="mb-4 text-sm" style={{ color: '#5a6b85' }}>
              Chụp ít nhất 3 ảnh từ nhiều góc độ để làm bằng chứng tình trạng ban đầu của thiết bị.
            </p>
            <PhotoUploadGrid
              photos={checkInPhotos}
              onChange={setCheckInPhotos}
              minCount={3}
              maxCount={10}
              label="Ảnh tình trạng sản phẩm"
            />
          </div>

          {error && (
            <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!isReady || checkin.isPending}
            className="w-full rounded-xl py-4 text-base font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: isReady ? '#2a7bd9' : '#94a3b8',
              boxShadow: isReady ? '0 8px 24px -6px rgba(42,123,217,0.4)' : 'none',
            }}
          >
            {checkin.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang xử lý…
              </span>
            ) : '✓ Xác nhận đã giao hàng → Bắt đầu kỳ thuê'}
          </button>

          {!isReady && (
            <p className="text-center text-xs" style={{ color: '#8694ad' }}>
              Hoàn thành: {!idPhotoUrl ? '① Ảnh CCCD ' : ''}
              {checkInPhotos.length < 3 ? `② Ảnh sản phẩm (${checkInPhotos.length}/3)` : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
