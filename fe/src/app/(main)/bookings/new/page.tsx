'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useListing } from '@/hooks/useListings';
import { useCreateBooking, useConfirmPayment } from '@/hooks/useBookings';
import { useContractPreview } from '@/hooks/useContracts';
import { CATEGORY_LABELS } from '@/types/listing';
import { ContractViewer } from '@/components/contracts/ContractViewer';
import { SignatureCheckbox } from '@/components/contracts/SignatureCheckbox';

const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản ngân hàng', icon: '🏦' },
  { value: 'MOMO', label: 'Ví MoMo', icon: '💜' },
  { value: 'ZALOPAY', label: 'ZaloPay', icon: '💙' },
  { value: 'VNPAY', label: 'VNPay', icon: '🟡' },
  { value: 'CASH', label: 'Tiền mặt khi nhận', icon: '💵' },
];

function BookingCheckoutForm() {
  const router = useRouter();
  const sp = useSearchParams();

  const listingId = sp.get('listingId') ?? '';
  const from = sp.get('from') ?? '';
  const to = sp.get('to') ?? '';
  const qty = parseInt(sp.get('qty') ?? '1', 10);
  const delivery = (sp.get('delivery') ?? 'PICKUP') as 'PICKUP' | 'DELIVERY';
  const address = sp.get('address') ?? '';

  const { data: listing, isLoading } = useListing(listingId);
  const createBooking = useCreateBooking();
  const confirmPayment = useConfirmPayment();

  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1); // 1=info+payment, 2=contract
  const [contractAgreed, setContractAgreed] = useState(false);
  const [step, setStep] = useState<'form' | 'processing' | 'done'>('form');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [fatalError, setFatalError] = useState<string | null>(null);

  // Preview contract — cần bookingId tạm (dùng listingId làm key preview trước khi có bookingId)
  // Preview được fetch sau khi tạo booking (bookingId có)
  const { data: contractPreview } = useContractPreview(bookingId ?? '', !!bookingId);

  const price = listing ? (typeof listing.price === 'number' ? listing.price : Number(listing.price)) : 0;
  const depositRate = listing ? parseFloat(String((listing as { depositRate?: string }).depositRate ?? '0.2')) : 0.2;
  const rentalDays = from && to
    ? Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1
    : 0;
  const subtotal = price * qty * rentalDays;
  const deposit = subtotal * depositRate;

  // Countdown for hold expiry
  useEffect(() => {
    if (!holdExpiry) return;
    const tick = setInterval(() => {
      const s = Math.max(0, Math.round((holdExpiry.getTime() - Date.now()) / 1000));
      setSecondsLeft(s);
      if (s === 0) clearInterval(tick);
    }, 1000);
    return () => clearInterval(tick);
  }, [holdExpiry]);

  async function handleCreateBooking() {
    if (!listingId || !from || !to) return;
    setFatalError(null);
    try {
      const booking = await createBooking.mutateAsync({
        listingId,
        startDate: from,
        endDate: to,
        quantity: qty,
        deliveryMethod: delivery,
        deliveryAddress: delivery === 'DELIVERY' ? address : undefined,
      });
      setBookingId(booking.id);
      if (booking.holdExpiresAt) setHoldExpiry(new Date(booking.holdExpiresAt));
      setCheckoutStep(2); // chuyển sang bước xem hợp đồng
    } catch (err) {
      setFatalError((err as Error).message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  }

  async function handleConfirmAndPay() {
    if (!bookingId || !contractAgreed) return;
    setStep('processing');
    setFatalError(null);
    try {
      await confirmPayment.mutateAsync({
        id: bookingId,
        data: { method: paymentMethod },
      });
      setStep('done');
      setTimeout(() => router.push(`/bookings/${bookingId}?created=1`), 1500);
    } catch (err) {
      setFatalError((err as Error).message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.');
      setStep('form');
    }
  }

  if (!listingId || !from || !to) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-screen" style={{ background: '#f6fbfe' }}>
        <span className="mb-4 text-5xl">🗓️</span>
        <p className="text-sm mb-4" style={{ color: '#8694ad' }}>Thông tin đặt thuê không hợp lệ.</p>
        <Link href="/search" className="rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: '#2a7bd9' }}>
          Tìm sản phẩm
        </Link>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-screen" style={{ background: '#f6fbfe' }}>
        <div className="flex h-20 w-20 items-center justify-center rounded-full text-4xl mb-4" style={{ background: '#f0fdf4' }}>
          ✓
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#0f1729' }}>Đặt thuê thành công!</h2>
        <p className="text-sm" style={{ color: '#8694ad' }}>Đang chuyển đến trang chi tiết…</p>
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
          {listing && (
            <Link href={`/listings/${listing.id}`} className="hover:underline" style={{ color: '#2a7bd9' }}>
              {listing.title}
            </Link>
          )}
          <span>/</span>
          <span style={{ color: '#0f1729' }}>Đặt thuê</span>
        </nav>

        <h1 className="mb-8 text-2xl font-bold" style={{ color: '#0f1729' }}>Xác nhận đặt thuê</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: details */}
          {/* Step indicator */}
          <div className="lg:col-span-3 mb-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: checkoutStep >= 1 ? '#2a7bd9' : '#e2e8f3', color: checkoutStep >= 1 ? '#fff' : '#8694ad' }}
                >1</div>
                <span style={{ color: checkoutStep === 1 ? '#0f1729' : '#8694ad', fontWeight: checkoutStep === 1 ? 600 : 400 }}>Thông tin & thanh toán</span>
              </div>
              <div className="h-px flex-1" style={{ background: '#DCEFFB' }} />
              <div className="flex items-center gap-2">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: checkoutStep >= 2 ? '#2a7bd9' : '#e2e8f3', color: checkoutStep >= 2 ? '#fff' : '#8694ad' }}
                >2</div>
                <span style={{ color: checkoutStep === 2 ? '#0f1729' : '#8694ad', fontWeight: checkoutStep === 2 ? 600 : 400 }}>Xem & ký hợp đồng</span>
              </div>
            </div>
          </div>

        <div className="lg:col-span-2 space-y-5">
            {/* Step 1: trip info + payment */}
            {checkoutStep === 1 && <><div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#DCEFFB' }}>
              <h2 className="mb-4 text-base font-semibold" style={{ color: '#0f1729' }}>Thông tin chuyến thuê</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: '#8694ad' }}>Ngày bắt đầu</p>
                  <p className="font-semibold" style={{ color: '#0f1729' }}>
                    {new Date(from).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: '#8694ad' }}>Ngày kết thúc</p>
                  <p className="font-semibold" style={{ color: '#0f1729' }}>
                    {new Date(to).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: '#8694ad' }}>Số lượng</p>
                  <p className="font-semibold" style={{ color: '#0f1729' }}>{qty} thiết bị</p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: '#8694ad' }}>Nhận hàng</p>
                  <p className="font-semibold" style={{ color: '#0f1729' }}>
                    {delivery === 'PICKUP' ? '🏪 Lấy tại nơi' : '🚚 Giao hàng'}
                  </p>
                </div>
                {delivery === 'DELIVERY' && address && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium mb-1" style={{ color: '#8694ad' }}>Địa chỉ giao</p>
                    <p className="font-semibold" style={{ color: '#0f1729' }}>{address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment method */}
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#DCEFFB' }}>
              <h2 className="mb-4 text-base font-semibold" style={{ color: '#0f1729' }}>Phương thức thanh toán</h2>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m.value}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all"
                    style={{
                      borderColor: paymentMethod === m.value ? '#2a7bd9' : '#DCEFFB',
                      background: paymentMethod === m.value ? 'rgba(42,123,217,0.04)' : '#fff',
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={m.value}
                      checked={paymentMethod === m.value}
                      onChange={() => setPaymentMethod(m.value)}
                      className="sr-only"
                    />
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-sm font-medium" style={{ color: '#0f1729' }}>{m.label}</span>
                    {paymentMethod === m.value && (
                      <span className="ml-auto text-[#2a7bd9]">✓</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Cancellation notice */}
            <div className="rounded-xl border p-4 text-sm" style={{ borderColor: '#DCEFFB', background: '#f6fbfe' }}>
              <p className="font-medium mb-1" style={{ color: '#0f1729' }}>Chính sách huỷ</p>
              <p style={{ color: '#5a6b85' }}>
                Huỷ trước 3 ngày: hoàn tiền đặt cọc. Huỷ sau 3 ngày hoặc khi đang thuê: mất cọc.
              </p>
            </div></>}

            {/* Step 2: Contract review */}
            {checkoutStep === 2 && (
              <div className="space-y-4">
                <h2 className="text-base font-semibold" style={{ color: '#0f1729' }}>Hợp đồng thuê thiết bị</h2>
                {contractPreview ? (
                  <ContractViewer
                    terms={contractPreview.terms}
                    penaltyRules={contractPreview.penaltyRules}
                    conditionNote={contractPreview.productConditionNote}
                    isHighValue={contractPreview.isHighValue}
                    collapsible
                  />
                ) : (
                  <div className="h-40 animate-pulse rounded-2xl bg-[#e2e8f3]" />
                )}
                <SignatureCheckbox
                  checked={contractAgreed}
                  onChange={setContractAgreed}
                />
              </div>
            )}

            {/* Error */}
            {fatalError && (
              <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}>
                {fatalError}
              </div>
            )}
          </div>

          {/* Right: order summary */}
          <div>
            <div className="sticky top-24 space-y-4">
              {/* Listing card */}
              {isLoading ? (
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
                    <span style={{ color: '#0f1729' }}>{rentalDays} ngày</span>
                  </div>
                  {qty > 1 && (
                    <div className="flex justify-between">
                      <span style={{ color: '#5a6b85' }}>Số lượng</span>
                      <span style={{ color: '#0f1729' }}>× {qty}</span>
                    </div>
                  )}
                  {depositRate > 0 && (
                    <div className="flex justify-between text-xs" style={{ color: '#8694ad' }}>
                      <span>Đặt cọc ({(depositRate * 100).toFixed(0)}%)</span>
                      <span>{deposit.toLocaleString('vi-VN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2.5 text-base font-bold" style={{ borderColor: '#DCEFFB' }}>
                    <span style={{ color: '#0f1729' }}>Tổng cộng</span>
                    <span style={{ color: '#2a7bd9' }}>{subtotal.toLocaleString('vi-VN')} {listing?.currency ?? 'VND'}</span>
                  </div>
                </div>

                {checkoutStep === 1 ? (
                  <button
                    onClick={handleCreateBooking}
                    disabled={createBooking.isPending || !listing}
                    className="mt-5 w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#2a7bd9', boxShadow: '0 8px 24px -6px rgba(42,123,217,0.4)' }}
                  >
                    {createBooking.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Đang xử lý…
                      </span>
                    ) : 'Tiếp tục xem hợp đồng →'}
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmAndPay}
                    disabled={step === 'processing' || !contractAgreed}
                    className="mt-5 w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: contractAgreed ? '#2a7bd9' : '#94a3b8', boxShadow: contractAgreed ? '0 8px 24px -6px rgba(42,123,217,0.4)' : 'none' }}
                  >
                    {step === 'processing' ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Đang xử lý…
                      </span>
                    ) : 'Xác nhận & Ký hợp đồng'}
                  </button>
                )}

                <p className="mt-2 text-center text-xs" style={{ color: '#8694ad' }}>
                  {checkoutStep === 1
                    ? 'Giữ chỗ 15 phút sau khi đặt. Provider xác nhận trong 24h.'
                    : 'Ký điện tử có giá trị pháp lý theo Luật Giao dịch điện tử Việt Nam.'}
                </p>
              </div>

              {/* Hold countdown (shown after booking created) */}
              {holdExpiry && secondsLeft > 0 && (
                <div
                  className="rounded-xl border p-4 text-center"
                  style={{ borderColor: '#fed7aa', background: '#fff7ed' }}
                >
                  <p className="text-xs font-medium mb-1" style={{ color: '#c2410c' }}>Thời gian giữ chỗ còn</p>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: '#c2410c' }}>
                    {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
                  </p>
                </div>
              )}
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
      <BookingCheckoutForm />
    </Suspense>
  );
}
