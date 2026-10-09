'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { availabilityApi } from '@/lib/api/client';
import { useAddToCart } from '@/hooks/useCart';
import type { Listing } from '@/types/listing';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';

interface Props {
  listing: Listing;
}

export function BookingWidget({ listing }: Props) {
  const router = useRouter();
  const addToCart = useAddToCart();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.roles?.includes('ADMIN') ?? false;
  const isOwner = Boolean(user && listing.providerId === user.id);

  const price = typeof listing.price === 'number' ? listing.price : Number(listing.price);
  const depositRate = listing.depositRate ? parseFloat(String(listing.depositRate)) : 0.2;
  const maxQty: number = (listing as { quantity?: number }).quantity ?? 1;

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [availCheck, setAvailCheck] = useState<'idle' | 'checking' | 'ok' | 'unavailable'>('idle');
  const [cartAdded, setCartAdded] = useState(false);

  const rentalDays = startDate && endDate
    ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1
    : 0;
  const subtotal = price * quantity * Math.max(rentalDays, 0);
  const deposit = subtotal * depositRate;

  // Check availability when dates/qty change
  useEffect(() => {
    if (!startDate || !endDate || rentalDays <= 0) return;
    availabilityApi
      .get(listing.id, startDate, endDate)
      .then((data) => {
        const isBlocked = data.manuallyBlocked.some((b) => b.date >= startDate && b.date <= endDate);
        const hasFullDays = data.fullyBooked.some((d) => d >= startDate && d <= endDate);
        setAvailCheck(isBlocked || hasFullDays ? 'unavailable' : 'ok');
      })
      .catch(() => setAvailCheck('idle'));
  }, [listing.id, startDate, endDate, quantity, rentalDays]);

  if (isAdmin || isOwner) {
    return (
      <div
        className="sticky top-24 rounded-2xl border bg-white p-6 shadow-lg"
        style={{ borderColor: '#DCEFFB', boxShadow: '0 20px 60px -15px rgba(42,123,217,0.15)' }}
      >
        <div className="mb-5">
          <span className="text-3xl font-bold" style={{ color: '#2a7bd9' }}>
            {price.toLocaleString('vi-VN')}
          </span>
          <span className="text-sm" style={{ color: '#8694ad' }}>
            {' '}{listing.currency ?? 'VND'}/ngày
          </span>
        </div>
        <div className="rounded-xl bg-[#f6fbfe] p-4 text-sm text-[#5a6b85]">
          {isAdmin
            ? 'Tài khoản Admin chỉ xem thông tin marketplace và không thể tạo giao dịch.'
            : 'Đây là sản phẩm của bạn. Bạn không thể tự đặt thuê sản phẩm này.'}
        </div>
        <Link
          href={isAdmin ? '/admin' : '/dashboard/listings'}
          className="mt-4 block w-full rounded-xl py-3 text-center text-sm font-semibold text-white"
          style={{ background: '#2a7bd9' }}
        >
          {isAdmin ? 'Quay về trang quản trị' : 'Quản lý sản phẩm'}
        </Link>
      </div>
    );
  }

  function canProceed() {
    if (!startDate || !endDate || rentalDays <= 0) return false;
    if (availCheck === 'unavailable') return false;
    if (deliveryMethod === 'DELIVERY' && !deliveryAddress.trim()) return false;
    return listing.status === 'ACTIVE';
  }

  function buildQuery() {
    const q = new URLSearchParams({
      listingId: listing.id,
      from: startDate,
      to: endDate,
      qty: String(quantity),
      delivery: deliveryMethod,
    });
    if (deliveryMethod === 'DELIVERY' && deliveryAddress) q.set('address', deliveryAddress);
    return q.toString();
  }

  function handleBookNow() {
    router.push(`/bookings/new?${buildQuery()}`);
  }

  async function handleAddToCart() {
    try {
      await addToCart.mutateAsync({
        listingId: listing.id,
        startDate,
        endDate,
        quantity,
        deliveryMethod,
        deliveryAddress: deliveryMethod === 'DELIVERY' ? deliveryAddress : undefined,
      });
      setCartAdded(true);
      setTimeout(() => setCartAdded(false), 3000);
    } catch {
      // error shown by mutation state
    }
  }

  return (
    <div
      className="sticky top-24 rounded-2xl border bg-white p-6 shadow-lg"
      style={{ borderColor: '#DCEFFB', boxShadow: '0 20px 60px -15px rgba(42,123,217,0.15)' }}
    >
      {/* Price */}
      <div className="mb-5">
        <span className="text-3xl font-bold" style={{ color: '#2a7bd9' }}>
          {price.toLocaleString('vi-VN')}
        </span>
        <span className="text-sm" style={{ color: '#8694ad' }}>
          {' '}{listing.currency ?? 'VND'}/ngày
        </span>
      </div>

      {/* Date pickers */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#8694ad' }}>
            Bắt đầu
          </label>
          <input
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setAvailCheck('idle'); }}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
            style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#8694ad' }}>
            Kết thúc
          </label>
          <input
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setAvailCheck('idle'); }}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
            style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
          />
        </div>
      </div>

      {/* Availability feedback */}
      {availCheck === 'checking' && (
        <p className="mb-3 text-xs" style={{ color: '#8694ad' }}>Đang kiểm tra lịch…</p>
      )}
      {availCheck === 'unavailable' && (
        <div className="mb-3 rounded-lg px-3 py-2 text-xs" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
          Ngày bạn chọn không còn trống. Vui lòng chọn ngày khác.
        </div>
      )}
      {availCheck === 'ok' && (
        <div className="mb-3 rounded-lg px-3 py-2 text-xs" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
          ✓ Còn trống
        </div>
      )}

      {/* Quantity (only if listing has >1 units) */}
      {maxQty > 1 && (
        <div className="mb-4">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#8694ad' }}>
            Số lượng
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border text-base"
              style={{ borderColor: '#DCEFFB' }}
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-semibold" style={{ color: '#0f1729' }}>{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border text-base"
              style={{ borderColor: '#DCEFFB' }}
            >
              +
            </button>
            <span className="text-xs" style={{ color: '#8694ad' }}>tối đa {maxQty}</span>
          </div>
        </div>
      )}

      {/* Delivery method */}
      <div className="mb-4">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#8694ad' }}>
          Nhận hàng
        </label>
        <div className="flex gap-2">
          {(['PICKUP', 'DELIVERY'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDeliveryMethod(m)}
              className="flex-1 rounded-lg border py-2 text-xs font-medium transition"
              style={{
                borderColor: deliveryMethod === m ? '#2a7bd9' : '#DCEFFB',
                background: deliveryMethod === m ? 'rgba(42,123,217,0.06)' : '#fff',
                color: deliveryMethod === m ? '#2a7bd9' : '#5a6b85',
              }}
            >
              {m === 'PICKUP' ? '🏪 Lấy tại nơi' : '🚚 Giao hàng'}
            </button>
          ))}
        </div>
        {deliveryMethod === 'DELIVERY' && (
          <input
            type="text"
            placeholder="Địa chỉ giao hàng"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
            style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
          />
        )}
      </div>

      {/* Price summary */}
      {rentalDays > 0 && (
        <div className="mb-5 rounded-xl p-3 space-y-2 text-sm" style={{ background: '#f6fbfe' }}>
          <div className="flex justify-between">
            <span style={{ color: '#5a6b85' }}>{price.toLocaleString('vi-VN')} × {rentalDays} ngày × {quantity}</span>
            <span style={{ color: '#0f1729' }}>{subtotal.toLocaleString('vi-VN')}</span>
          </div>
          {depositRate > 0 && (
            <div className="flex justify-between text-xs">
              <span style={{ color: '#8694ad' }}>Đặt cọc ({(depositRate * 100).toFixed(0)}%)</span>
              <span style={{ color: '#8694ad' }}>{deposit.toLocaleString('vi-VN')}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 font-bold" style={{ borderColor: '#DCEFFB' }}>
            <span style={{ color: '#0f1729' }}>Tổng cộng</span>
            <span style={{ color: '#2a7bd9' }}>{subtotal.toLocaleString('vi-VN')} {listing.currency ?? 'VND'}</span>
          </div>
        </div>
      )}

      {/* CTA buttons */}
      <div className="space-y-2">
        <button
          onClick={handleBookNow}
          disabled={!canProceed()}
          className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#2a7bd9', boxShadow: canProceed() ? '0 8px 24px -6px rgba(42,123,217,0.5)' : 'none' }}
        >
          {listing.status !== 'ACTIVE'
            ? 'Không khả dụng'
            : !startDate || !endDate
            ? 'Chọn ngày thuê'
            : availCheck === 'unavailable'
            ? 'Ngày đã hết'
            : 'Đặt ngay'}
        </button>

        <button
          onClick={handleAddToCart}
          disabled={!canProceed() || addToCart.isPending || cartAdded}
          className="w-full rounded-xl border py-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            borderColor: cartAdded ? '#bbf7d0' : '#DCEFFB',
            background: cartAdded ? '#f0fdf4' : '#fff',
            color: cartAdded ? '#15803d' : '#5a6b85',
          }}
        >
          {addToCart.isPending ? 'Đang thêm…'
            : cartAdded ? '✓ Đã thêm vào giỏ'
            : '+ Thêm vào giỏ hàng'}
        </button>

        {addToCart.isError && (
          <p className="text-xs text-red-500 text-center">
            {(addToCart.error as Error)?.message ?? 'Không thể thêm vào giỏ'}
          </p>
        )}
      </div>

      <p className="mt-3 text-center text-xs" style={{ color: '#8694ad' }}>
        Giữ chỗ 15 phút sau khi đặt
      </p>
    </div>
  );
}
