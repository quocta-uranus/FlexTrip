'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBookingSchema, type CreateBookingInput } from '@/lib/validators/booking.schema';
import { useCreateBooking } from '@/hooks/useBookings';
import { useListing } from '@/hooks/useListings';
import { useBookingStore } from '@/store/booking.store';
import { CATEGORY_LABELS } from '@/types/listing';
import Link from 'next/link';

function BookingNewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get('listingId') ?? '';
  const fromDate = searchParams.get('from') ?? '';
  const toDate = searchParams.get('to') ?? '';

  const { data: listing, isLoading: loadingListing } = useListing(listingId);
  const { mutate: createBooking, isPending, error, isSuccess, data: newBooking } = useCreateBooking();
  const { clearDraft } = useBookingStore();

  const price = listing ? (typeof listing.price === 'number' ? listing.price : Number(listing.price)) : 0;
  const nights = fromDate && toDate
    ? Math.max(0, Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86_400_000))
    : 0;
  const total = nights * price;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      listingId,
      startDate: fromDate,
      endDate: toDate,
    },
  });

  useEffect(() => {
    if (isSuccess && newBooking) {
      clearDraft();
      router.push(`/bookings/${newBooking.id}?created=1`);
    }
  }, [isSuccess, newBooking, clearDraft, router]);

  if (!listingId) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="mb-4 text-5xl">🗓️</span>
        <p className="text-sm" style={{ color: '#8694ad' }}>Vui lòng chọn sản phẩm trước.</p>
        <Link href="/search" className="mt-4 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: '#2a7bd9' }}>
          Tìm sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm" style={{ color: '#8694ad' }}>
          <Link href="/search" className="hover:underline" style={{ color: '#2a7bd9' }}>Tìm kiếm</Link>
          <span>/</span>
          {listing && <Link href={`/listings/${listing.id}`} className="hover:underline" style={{ color: '#2a7bd9' }}>{listing.title}</Link>}
          {listing && <span>/</span>}
          <span style={{ color: '#0f1729' }}>Đặt thuê</span>
        </nav>

        <h1 className="mb-8 text-2xl font-bold" style={{ color: '#0f1729' }}>Xác nhận đặt thuê</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dates summary */}
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#DCEFFB' }}>
              <h2 className="mb-4 text-lg font-semibold" style={{ color: '#0f1729' }}>Thông tin đặt thuê</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: '#5a6b85' }}>Ngày bắt đầu</label>
                  <input
                    id="checkout-start-date"
                    type="date"
                    {...register('startDate')}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                    style={{ borderColor: errors.startDate ? '#fca5a5' : '#DCEFFB', color: '#0f1729' }}
                  />
                  {errors.startDate && <p className="mt-1 text-xs text-red-500">{errors.startDate.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: '#5a6b85' }}>Ngày kết thúc</label>
                  <input
                    id="checkout-end-date"
                    type="date"
                    {...register('endDate')}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                    style={{ borderColor: errors.endDate ? '#fca5a5' : '#DCEFFB', color: '#0f1729' }}
                  />
                  {errors.endDate && <p className="mt-1 text-xs text-red-500">{errors.endDate.message}</p>}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#DCEFFB' }}>
              <h2 className="mb-4 text-lg font-semibold" style={{ color: '#0f1729' }}>Ghi chú (tùy chọn)</h2>
              <textarea
                id="checkout-notes"
                {...register('notes')}
                rows={4}
                placeholder="Yêu cầu đặc biệt, thời gian giao nhận, ghi chú thêm cho Provider…"
                className="w-full resize-none rounded-lg border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30 placeholder:text-[#8694ad]"
                style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}>
                {error.message}
              </div>
            )}
          </div>

          {/* Right: summary */}
          <div>
            <div className="sticky top-24 space-y-4">
              {/* Listing summary card */}
              {loadingListing ? (
                <div className="h-40 animate-pulse rounded-2xl bg-[#e2e8f3]" />
              ) : listing ? (
                <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: '#DCEFFB' }}>
                  <div className="h-32 overflow-hidden bg-[#f1f5fa]">
                    {listing.imageUrls?.[0] ? (
                      <img src={listing.imageUrls[0]} alt={listing.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl">⛺</div>
                    )}
                  </div>
                  <div className="p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#2a7bd9' }}>
                      {CATEGORY_LABELS[listing.category] ?? listing.category}
                    </span>
                    <p className="mt-1 text-sm font-semibold line-clamp-2" style={{ color: '#0f1729' }}>{listing.title}</p>
                    <p className="mt-1 text-xs" style={{ color: '#8694ad' }}>{listing.location}</p>
                  </div>
                </div>
              ) : null}

              {/* Price breakdown */}
              <div className="rounded-2xl border bg-white p-5" style={{ borderColor: '#DCEFFB' }}>
                <h3 className="mb-4 text-sm font-semibold" style={{ color: '#0f1729' }}>Chi tiết giá</h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: '#5a6b85' }}>Giá/ngày</span>
                    <span style={{ color: '#0f1729' }}>{price.toLocaleString('vi-VN')} {listing?.currency ?? 'VND'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#5a6b85' }}>Số ngày</span>
                    <span style={{ color: '#0f1729' }}>{nights} ngày</span>
                  </div>
                  <div className="flex justify-between border-t pt-2.5 text-base font-bold" style={{ borderColor: '#DCEFFB' }}>
                    <span style={{ color: '#0f1729' }}>Tổng cộng</span>
                    <span style={{ color: '#2a7bd9' }}>{total.toLocaleString('vi-VN')} {listing?.currency ?? 'VND'}</span>
                  </div>
                </div>

                <button
                  id="confirm-booking-btn"
                  onClick={handleSubmit((data) => createBooking({ ...data, listingId }))}
                  disabled={isPending || nights <= 0}
                  className="mt-5 w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#2a7bd9', boxShadow: '0 8px 24px -6px rgba(42,123,217,0.4)' }}
                >
                  {isPending ? 'Đang xử lý…' : 'Xác nhận đặt thuê'}
                </button>

                <p className="mt-2 text-center text-xs" style={{ color: '#8694ad' }}>
                  Provider sẽ xác nhận trong vòng 24 giờ
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingNewPage() {
  return (
    <Suspense>
      <BookingNewForm />
    </Suspense>
  );
}
