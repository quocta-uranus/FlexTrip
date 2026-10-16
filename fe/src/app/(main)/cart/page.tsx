'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart, useRemoveCartItem, useCartCheckout } from '@/hooks/useCart';
import type { CartItem } from '@/types/booking';

const PAYMENT_METHODS = [
  { value: 'PAYOS', label: 'PayOS', icon: '💳' },
  { value: 'WALLET', label: 'Ví FlexTrip', icon: '👜' },
];

function HoldCountdown({ expiresAt }: { expiresAt: string | null | undefined }) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, diff));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isExpired = secondsLeft === 0;
  const isUrgent = secondsLeft <= 120;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={
        isExpired
          ? { background: '#fef2f2', color: '#dc2626' }
          : isUrgent
          ? { background: '#fff7ed', color: '#c2410c' }
          : { background: '#f0fdf4', color: '#15803d' }
      }
    >
      {isExpired ? (
        '⏰ Hết giữ chỗ'
      ) : (
        <>
          ⏱ Còn {mins}:{String(secs).padStart(2, '0')}
        </>
      )}
    </span>
  );
}

function CartItemCard({
  item,
  onRemove,
}: {
  item: CartItem;
  onRemove: (id: string) => void;
}) {
  const isExpired = !item.isHoldValid;

  return (
    <div
      className="overflow-hidden rounded-2xl border bg-white transition-shadow hover:shadow-md"
      style={{
        borderColor: isExpired ? '#fca5a5' : '#DCEFFB',
        opacity: isExpired ? 0.7 : 1,
      }}
    >
      <div className="flex items-start gap-4 p-4">
        {/* Listing image */}
        <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[#f1f5fa]">
          {item.listing?.imageUrls?.[0] ? (
            <img
              src={item.listing.imageUrls[0]}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl">⛺</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-sm" style={{ color: '#0f1729' }}>
                {item.listing?.title ?? item.listingId}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#8694ad' }}>
                {item.listing?.provider?.name}
              </p>
            </div>
            <button
              onClick={() => onRemove(item.id)}
              className="shrink-0 rounded-lg p-1.5 text-xs transition-colors hover:bg-red-50"
              style={{ color: '#dc2626' }}
              title="Xoá khỏi giỏ"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: '#5a6b85' }}>
            <span>
              📅{' '}
              {new Date(item.startDate).toLocaleDateString('vi-VN', {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric',
              })}
              {' → '}
              {new Date(item.endDate).toLocaleDateString('vi-VN', {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric',
              })}
              <span className="ml-1">({item.rentalDays} ngày)</span>
            </span>
            {item.quantity > 1 && <span>× {item.quantity} thiết bị</span>}
            {item.deliveryMethod === 'DELIVERY' && <span>🚚 Giao hàng</span>}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <HoldCountdown expiresAt={item.holdExpiresAt} />
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: '#2a7bd9' }}>
                {item.subtotal.toLocaleString('vi-VN')} ₫
              </p>
              <p className="text-[11px]" style={{ color: '#8694ad' }}>
                Cọc: {item.depositAmount.toLocaleString('vi-VN')} ₫
              </p>
            </div>
          </div>
        </div>
      </div>

      {isExpired && (
        <div
          className="border-t px-4 py-2 text-xs font-medium"
          style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}
        >
          Giữ chỗ đã hết hạn — vui lòng xoá và đặt lại
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const { data: cart, isLoading, error } = useCart();
  const removeItem = useRemoveCartItem();
  const checkout = useCartCheckout();
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const hasExpired = cart?.items.some((i) => !i.isHoldValid) ?? false;
  const canCheckout = (cart?.items.length ?? 0) > 0 && !hasExpired;

  async function handleCheckout() {
    setCheckoutError(null);
    try {
      await checkout.mutateAsync({ paymentMethod });
      router.push('/bookings?checkout=1');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi thanh toán';
      setCheckoutError(message);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border bg-white"
                style={{ borderColor: '#DCEFFB' }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}
          >
            {error.message}
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#0f1729' }}>
            Giỏ hàng
          </h1>
          {!isEmpty && (
            <p className="mt-1 text-sm" style={{ color: '#8694ad' }}>
              {cart.items.length} sản phẩm · Giữ chỗ 15 phút mỗi mặt hàng
            </p>
          )}
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div
            className="flex flex-col items-center justify-center rounded-2xl border bg-white py-24"
            style={{ borderColor: '#DCEFFB' }}
          >
            <span className="mb-4 text-6xl">🛒</span>
            <h3 className="mb-2 text-lg font-semibold" style={{ color: '#0f1729' }}>
              Giỏ hàng trống
            </h3>
            <p className="mb-6 max-w-xs text-center text-sm" style={{ color: '#8694ad' }}>
              Thêm sản phẩm từ trang tìm kiếm để bắt đầu đặt thuê.
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

        {/* Cart items + summary */}
        {!isEmpty && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left: items */}
            <div className="lg:col-span-2 space-y-3">
              {cart.items.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  onRemove={(id) => removeItem.mutate(id)}
                />
              ))}

              {hasExpired && (
                <div
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}
                >
                  Một hoặc nhiều mặt hàng đã hết giữ chỗ. Vui lòng xoá chúng trước khi thanh toán.
                </div>
              )}
            </div>

            {/* Right: order summary + checkout */}
            <div className="space-y-4">
              {/* Summary */}
              <div
                className="rounded-2xl border bg-white p-5"
                style={{ borderColor: '#DCEFFB' }}
              >
                <h2 className="mb-4 font-semibold" style={{ color: '#0f1729' }}>
                  Tóm tắt đơn hàng
                </h2>

                <div className="space-y-2 text-sm" style={{ color: '#5a6b85' }}>
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-2">
                      <span className="truncate max-w-[140px] text-xs">
                        {item.listing?.title ?? item.listingId}
                      </span>
                      <span className="shrink-0 font-medium" style={{ color: '#0f1729' }}>
                        {item.subtotal.toLocaleString('vi-VN')} ₫
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  className="my-3 border-t pt-3 space-y-1.5 text-sm"
                  style={{ borderColor: '#DCEFFB' }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: '#5a6b85' }}>Tổng tiền thuê</span>
                    <span className="font-semibold" style={{ color: '#0f1729' }}>
                      {cart.total.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#5a6b85' }}>Tổng tiền cọc</span>
                    <span className="font-semibold" style={{ color: '#0f1729' }}>
                      {cart.depositTotal.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                </div>

                <div
                  className="flex justify-between border-t pt-3 text-sm font-bold"
                  style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
                >
                  <span>Cần thanh toán ngay</span>
                  <span style={{ color: '#2a7bd9' }}>
                    {cart.depositTotal.toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <p className="mt-1 text-[11px]" style={{ color: '#8694ad' }}>
                  * Tiền thuê còn lại thanh toán khi nhận đồ
                </p>
              </div>

              {/* Payment method */}
              <div
                className="rounded-2xl border bg-white p-5"
                style={{ borderColor: '#DCEFFB' }}
              >
                <h2 className="mb-3 font-semibold" style={{ color: '#0f1729' }}>
                  Phương thức thanh toán
                </h2>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((m) => (
                    <label
                      key={m.value}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all"
                      style={{
                        borderColor: paymentMethod === m.value ? '#2a7bd9' : '#e2e8f3',
                        background: paymentMethod === m.value ? 'rgba(42,123,217,0.04)' : '#fff',
                      }}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={m.value}
                        checked={paymentMethod === m.value}
                        onChange={() => setPaymentMethod(m.value)}
                        className="accent-[#2a7bd9]"
                      />
                      <span className="text-sm">{m.icon}</span>
                      <span className="text-sm font-medium" style={{ color: '#0f1729' }}>
                        {m.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error */}
              {checkoutError && (
                <div
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}
                >
                  {checkoutError}
                </div>
              )}

              {/* Checkout button */}
              <button
                onClick={handleCheckout}
                disabled={!canCheckout || checkout.isPending}
                className="w-full rounded-2xl py-4 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: canCheckout ? '#2a7bd9' : '#94a3b8' }}
              >
                {checkout.isPending
                  ? 'Đang xử lý…'
                  : `Thanh toán cọc · ${cart.depositTotal.toLocaleString('vi-VN')} ₫`}
              </button>

              <p className="text-center text-xs" style={{ color: '#8694ad' }}>
                Bằng cách thanh toán, bạn đồng ý với{' '}
                <Link href="/terms" className="underline">
                  điều khoản sử dụng
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
