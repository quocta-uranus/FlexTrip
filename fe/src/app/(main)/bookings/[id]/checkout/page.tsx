'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBooking } from '@/hooks/useBookings';
import { useCheckout } from '@/hooks/useContracts';
import { useAuthStore } from '@/store/auth.store';
import { PhotoUploadGrid } from '@/components/contracts/PhotoUploadGrid';

export default function CheckoutPage() {
  const { id: bookingId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: booking, isLoading } = useBooking(bookingId);
  const checkout = useCheckout();

  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isProvider = booking && user?.id === booking.listing?.providerId;
  const isTraveler = booking && user?.id === booking.travelerId;
  const canCheckout = booking?.status === 'IN_PROGRESS';

  async function handleSubmit(action: 'complete' | 'upload') {
    if (photos.length < 1) return;
    setError(null);
    try {
      await checkout.mutateAsync({
        bookingId,
        payload: {
          photos,
          note: note || undefined,
          action: action === 'complete' ? 'complete' : undefined,
        },
      });
      if (action === 'complete') {
        router.push(`/bookings/${bookingId}?completed=1`);
      } else {
        router.push(`/bookings/${bookingId}`);
      }
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

  if (!booking || (!isProvider && !isTraveler)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: '#f6fbfe' }}>
        <p className="text-sm" style={{ color: '#8694ad' }}>Không tìm thấy đơn thuê hoặc bạn không có quyền truy cập.</p>
        <Link href="/bookings" className="text-sm font-medium" style={{ color: '#2a7bd9' }}>← Quay lại</Link>
      </div>
    );
  }

  if (!canCheckout) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: '#f6fbfe' }}>
        <p className="text-sm" style={{ color: '#8694ad' }}>
          Chỉ có thể trả đồ khi đơn đang ở trạng thái IN_PROGRESS. Hiện tại: {booking.status}
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
          <Link href={isProvider ? '/dashboard/bookings' : '/bookings'} className="hover:underline" style={{ color: '#2a7bd9' }}>
            {isProvider ? 'Quản lý đặt thuê' : 'Đơn thuê của tôi'}
          </Link>
          <span>/</span>
          <Link href={`/bookings/${bookingId}`} className="hover:underline" style={{ color: '#2a7bd9' }}>Chi tiết đơn</Link>
          <span>/</span>
          <span style={{ color: '#0f1729' }}>Trả đồ (Check-out)</span>
        </nav>

        <h1 className="mb-2 text-2xl font-bold" style={{ color: '#0f1729' }}>
          {isProvider ? 'Xác nhận nhận lại thiết bị' : 'Trả thiết bị'}
        </h1>
        <p className="mb-8 text-sm" style={{ color: '#5a6b85' }}>
          Đơn: <span className="font-semibold" style={{ color: '#0f1729' }}>{booking.listing?.title}</span>
        </p>

        <div className="space-y-6">
          {/* Photos */}
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#DCEFFB' }}>
            <h2 className="mb-4 text-base font-semibold" style={{ color: '#0f1729' }}>
              {isProvider ? 'Ảnh tình trạng thiết bị khi nhận lại' : 'Ảnh thiết bị khi trả'}
            </h2>
            <p className="mb-4 text-sm" style={{ color: '#5a6b85' }}>
              {isProvider
                ? 'Chụp ảnh tình trạng thiết bị từ nhiều góc. Nếu có hư hỏng, ghi chú bên dưới.'
                : 'Chụp ảnh thiết bị từ nhiều góc để xác nhận tình trạng khi trả.'}
            </p>
            <PhotoUploadGrid
              photos={photos}
              onChange={setPhotos}
              minCount={1}
              maxCount={10}
              label="Ảnh trả đồ"
            />
          </div>

          {/* Note (provider only for dispute) */}
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#DCEFFB' }}>
            <h2 className="mb-3 text-base font-semibold" style={{ color: '#0f1729' }}>
              Ghi chú tình trạng (tuỳ chọn)
            </h2>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isProvider
                ? 'Mô tả tình trạng thiết bị, hư hỏng nếu có…'
                : 'Ghi chú về tình trạng thiết bị khi trả…'}
              className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-[#2a7bd9]/30"
              style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
            />
          </div>

          {error && (
            <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {isTraveler && (
              <button
                onClick={() => handleSubmit('upload')}
                disabled={photos.length < 1 || checkout.isPending}
                className="w-full rounded-xl py-4 text-base font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: '#2a7bd9', boxShadow: '0 8px 24px -6px rgba(42,123,217,0.4)' }}
              >
                {checkout.isPending ? 'Đang xử lý…' : '📸 Xác nhận đã trả thiết bị'}
              </button>
            )}

            {isProvider && booking.assignedStaff && (
              <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                Nhân viên <strong>{booking.assignedStaff.name}</strong> sẽ kiểm tra, nhận lại thiết bị và hoàn thành cuộc thuê.
                Bạn không cần thao tác bước này.
              </p>
            )}

            {isProvider && !booking.assignedStaff && (
              <>
                <button
                  onClick={() => handleSubmit('complete')}
                  disabled={photos.length < 1 || checkout.isPending}
                  className="w-full rounded-xl py-4 text-base font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: '#16a34a', boxShadow: '0 8px 24px -6px rgba(22,163,74,0.35)' }}
                >
                  {checkout.isPending ? 'Đang xử lý…' : '✓ Đã nhận lại — Hoàn thành chuyến thuê'}
                </button>
                <button
                  onClick={() => handleSubmit('upload')}
                  disabled={photos.length < 1 || checkout.isPending}
                  className="w-full rounded-xl border py-4 text-base font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ borderColor: '#fca5a5', color: '#dc2626' }}
                >
                  ⚠️ Lưu ảnh & Báo cáo hư hỏng
                </button>
              </>
            )}
          </div>

          {photos.length < 1 && (
            <p className="text-center text-xs" style={{ color: '#8694ad' }}>
              Cần tải lên ít nhất 1 ảnh trước khi tiếp tục
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
