'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Check, Clock, Info, Loader2, Minus, Plus, ShoppingBag, Store, Truck } from 'lucide-react';
import { availabilityApi } from '@/lib/api/client';
import { useAddToCart } from '@/hooks/useCart';
import type { Listing } from '@/types/listing';
import { useAuthStore } from '@/store/auth.store';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { cn } from '@/lib/utils';

interface Props {
  listing: Listing;
}

const FIELD_LABEL = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500';
const CARD = 'rounded-3xl border border-sky-100 bg-white p-6 shadow-xl shadow-brand-blue/10 lg:sticky lg:top-24';

const UNAVAILABLE_MESSAGE: Record<string, string> = {
  BLOCKED_DATE: 'Chủ thiết bị không nhận đặt trong khoảng ngày này. Hãy chọn ngày khác.',
  INSUFFICIENT_STOCK: 'Không đủ số lượng trong khoảng ngày này. Hãy giảm số lượng hoặc đổi ngày.',
};

const formatMoney = (n: number) => n.toLocaleString('vi-VN');

function Price({ price, currency }: { price: number; currency?: string }) {
  return (
    <div>
      <span className="font-display text-4xl font-medium tracking-tight text-brand-blue">{formatMoney(price)}</span>
      <span className="ml-1 text-sm text-slate-500">{currency ?? 'VND'} / ngày</span>
    </div>
  );
}

export function BookingWidget({ listing }: Props) {
  const router = useRouter();
  const addToCart = useAddToCart();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.roles?.includes('ADMIN') ?? false;
  const isOwner = Boolean(user && listing.providerId === user.id);

  const price = Number(listing.price);
  const depositRate = listing.depositRate != null ? Number(listing.depositRate) : 0;
  const maxQty = listing.quantity ?? 1;
  const minDays = listing.minRentalDays ?? 1;
  const maxDays = listing.maxRentalDays ?? null;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [cartAdded, setCartAdded] = useState(false);

  const rentalDays =
    startDate && endDate ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1 : 0;
  const daysTooFew = rentalDays > 0 && rentalDays < minDays;
  const daysTooMany = rentalDays > 0 && maxDays != null && rentalDays > maxDays;
  const daysOk = rentalDays > 0 && !daysTooFew && !daysTooMany;

  const subtotal = price * quantity * Math.max(rentalDays, 0);
  const deposit = subtotal * depositRate;

  // Same check the server runs when the order is created, so what is promised here is what the order will accept.
  const check = useQuery({
    queryKey: ['availability-check', listing.id, startDate, endDate, quantity],
    queryFn: () => availabilityApi.check(listing.id, { startDate, endDate, quantity }),
    enabled: daysOk,
    staleTime: 30_000,
  });
  const checking = daysOk && check.isFetching;
  const unavailable = daysOk && check.data?.available === false;
  const available = daysOk && check.data?.available === true && !check.isFetching;

  if (isAdmin || isOwner) {
    return (
      <div className={CARD}>
        <Price price={price} currency={listing.currency} />
        <div className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm leading-relaxed text-slate-600">
          {isAdmin
            ? 'Tài khoản Admin chỉ xem thông tin marketplace và không thể tạo giao dịch.'
            : 'Đây là thiết bị của bạn. Bạn không thể tự thuê thiết bị này.'}
        </div>
        <Link
          href={isAdmin ? '/admin' : `/dashboard/listings/${listing.id}/edit`}
          className="mt-4 block w-full rounded-full bg-brand py-3 text-center text-sm font-bold text-white transition hover:bg-brand-blue"
        >
          {isAdmin ? 'Quay về trang quản trị' : 'Quản lý thiết bị'}
        </Link>
      </div>
    );
  }

  const canProceed =
    daysOk && available && !(deliveryMethod === 'DELIVERY' && !deliveryAddress.trim()) && listing.status === 'ACTIVE';

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

  const primaryLabel = !user
    ? 'Đăng nhập để đặt thuê'
    : listing.status !== 'ACTIVE'
      ? 'Không khả dụng'
      : !startDate || !endDate
        ? 'Chọn ngày thuê'
        : daysTooFew || daysTooMany
          ? 'Số ngày chưa hợp lệ'
          : unavailable
            ? 'Không đặt được ngày này'
            : checking
              ? 'Đang kiểm tra…'
              : deliveryMethod === 'DELIVERY' && !deliveryAddress.trim()
                ? 'Nhập địa chỉ giao hàng'
                : 'Đặt thuê ngay';

  return (
    <div className={CARD}>
      <Price price={price} currency={listing.currency} />

      <div className="mt-5">
        <span className={FIELD_LABEL}>Ngày thuê</span>
        <DateRangePicker
          appearance="field"
          from={startDate}
          to={endDate}
          onChange={({ from, to }) => {
            setStartDate(from);
            setEndDate(to);
          }}
        />
        {(minDays > 1 || maxDays != null) && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            {maxDays != null ? `Thuê từ ${minDays} đến ${maxDays} ngày` : `Thuê tối thiểu ${minDays} ngày`}
          </p>
        )}
      </div>

      {daysTooFew && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Thiết bị này thuê tối thiểu {minDays} ngày. Bạn đang chọn {rentalDays} ngày.
        </p>
      )}
      {daysTooMany && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Thiết bị này thuê tối đa {maxDays} ngày. Bạn đang chọn {rentalDays} ngày.
        </p>
      )}
      {checking && (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang kiểm tra lịch…
        </p>
      )}
      {unavailable && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {UNAVAILABLE_MESSAGE[check.data?.reason ?? ''] ?? 'Khoảng ngày này không còn khả dụng.'}
        </p>
      )}
      {available && (
        <p className="mt-3 flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-xs font-medium text-green-700">
          <Check className="h-4 w-4" /> Còn trống trong ngày bạn chọn
        </p>
      )}

      {maxQty > 1 && (
        <div className="mt-5">
          <span className={FIELD_LABEL}>Số lượng</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Giảm số lượng"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-brand/50 disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-base font-bold text-ink">{quantity}</span>
            <button
              type="button"
              aria-label="Tăng số lượng"
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              disabled={quantity >= maxQty}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-brand/50 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
            <span className="text-xs text-slate-500">Tối đa {maxQty}</span>
          </div>
        </div>
      )}

      <div className="mt-5">
        <span className={FIELD_LABEL}>Nhận hàng</span>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['PICKUP', 'Lấy tại nơi', Store],
              ['DELIVERY', 'Giao tận nơi', Truck],
            ] as const
          ).map(([m, label, Icon]) => (
            <button
              key={m}
              type="button"
              aria-pressed={deliveryMethod === m}
              onClick={() => setDeliveryMethod(m)}
              className={cn(
                'flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-semibold transition-colors',
                deliveryMethod === m
                  ? 'border-brand bg-brand/10 text-brand-blue'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand/50',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        {deliveryMethod === 'DELIVERY' && (
          <input
            type="text"
            placeholder="Địa chỉ giao hàng"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        )}
      </div>

      {rentalDays > 0 && (
        <div className="mt-5 space-y-2 rounded-2xl bg-sky-50 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-slate-600">
              {formatMoney(price)} × {rentalDays} ngày{quantity > 1 ? ` × ${quantity}` : ''}
            </span>
            <span className="font-medium text-ink">{formatMoney(subtotal)}</span>
          </div>
          {depositRate > 0 && (
            <div className="flex justify-between gap-3 text-xs text-slate-500">
              <span>Đặt cọc ({Math.round(depositRate * 100)}%)</span>
              <span>{formatMoney(deposit)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3 border-t border-sky-100 pt-2 text-base font-bold">
            <span className="text-ink">Tổng cộng</span>
            <span className="text-brand-blue">
              {formatMoney(subtotal)} {listing.currency ?? 'VND'}
            </span>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-2">
        {user ? (
          <button
            type="button"
            onClick={() => router.push(`/bookings/new?${buildQuery()}`)}
            disabled={!canProceed}
            className="h-12 w-full rounded-full bg-brand text-sm font-bold text-white shadow-md shadow-brand/30 transition hover:bg-brand-blue disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {primaryLabel}
          </button>
        ) : (
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow-md shadow-brand/30 transition hover:bg-brand-blue"
          >
            {primaryLabel}
          </Link>
        )}

        {user && (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canProceed || addToCart.isPending || cartAdded}
            className={cn(
              'flex h-12 w-full items-center justify-center gap-2 rounded-full border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              cartAdded
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-slate-200 bg-white text-slate-700 hover:border-brand/50 hover:text-brand-blue',
            )}
          >
            {addToCart.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Đang thêm…</>
            ) : cartAdded ? (
              <><Check className="h-4 w-4" /> Đã thêm vào giỏ</>
            ) : (
              <><ShoppingBag className="h-4 w-4" /> Thêm vào giỏ hàng</>
            )}
          </button>
        )}

        {addToCart.isError && (
          <p className="text-center text-xs text-red-500">{(addToCart.error as Error)?.message ?? 'Không thể thêm vào giỏ'}</p>
        )}
      </div>

      <p className="mt-4 flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Giữ chỗ 15 phút sau khi đặt. Đơn cần chủ thiết bị xác nhận sau khi thanh toán.
      </p>
    </div>
  );
}
