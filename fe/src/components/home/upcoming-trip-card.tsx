'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Check,
  FileText,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useMyBookings } from '@/hooks/useBookings';
import { formatShortDate as shortDate } from '@/lib/format-date';
import { BOOKING_STATUS_LABEL } from '@/types/booking';
import type { Booking, BookingStatus } from '@/types/booking';

// Ordered by how urgently the traveler has to act; the first match wins.
const ATTENTION_ORDER: BookingStatus[] = [
  'PENDING_PAYMENT',
  'DISPUTED',
  'IN_PROGRESS',
  'CONFIRMED',
  'PENDING_APPROVAL',
  'REFUNDING',
];

// Shown only when nothing needs attention, so a just-finished trip does not leave the card empty.
const RECENT_STATUSES: BookingStatus[] = ['COMPLETED', 'REFUNDED'];

const STEP_TITLES = ['Đặt đồ & ký quỹ', 'Bàn giao & đồng kiểm', 'Trải nghiệm dã ngoại', 'Trả đồ & hoàn cọc'] as const;

// Index of the step the booking is on; 4 means every step is done.
const CURRENT_STEP: Partial<Record<BookingStatus, number>> = {
  PENDING_PAYMENT: 0,
  PENDING_APPROVAL: 0,
  CONFIRMED: 1,
  IN_PROGRESS: 2,
  DISPUTED: 2,
  REFUNDING: 3,
  COMPLETED: 4,
  REFUNDED: 4,
};

const dateFmt = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
const moneyFmt = new Intl.NumberFormat('vi-VN');

export function pickUpcomingBooking(bookings: Booking[] | undefined): Booking | undefined {
  const rank = (b: Booking) => ATTENTION_ORDER.indexOf(b.status);
  return (bookings ?? [])
    .filter((b) => rank(b) !== -1)
    .sort((a, b) => rank(a) - rank(b) || new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
}

function pickTripBooking(bookings: Booking[] | undefined): Booking | undefined {
  return (
    pickUpcomingBooking(bookings) ??
    (bookings ?? [])
      .filter((b) => RECENT_STATUSES.includes(b.status))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
  );
}

function daysUntil(iso: string) {
  const start = new Date(iso);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((start.getTime() - today.getTime()) / 86_400_000);
}

function pickupNote(booking: Booking) {
  if (booking.status === 'IN_PROGRESS') return `trả đồ trước ${shortDate(booking.endDate)}`;
  if (!['PENDING_PAYMENT', 'PENDING_APPROVAL', 'CONFIRMED'].includes(booking.status)) {
    return BOOKING_STATUS_LABEL[booking.status].toLowerCase();
  }
  const days = daysUntil(booking.startDate);
  if (days > 0) return `còn ${days} ngày nữa`;
  if (days === 0) return 'hôm nay';
  return 'đã đến ngày nhận đồ';
}

// Every note comes from the booking itself; nothing is a placeholder.
function stepNotes(booking: Booking, current: number) {
  return [
    current > 0
      ? booking.payment?.rentalPaidAt
        ? `Đã thanh toán ${shortDate(booking.payment.rentalPaidAt)}`
        : 'Hoàn thành'
      : BOOKING_STATUS_LABEL[booking.status],
    current > 1
      ? booking.checkedInAt
        ? `Bàn giao ${shortDate(booking.checkedInAt)}`
        : 'Hoàn thành'
      : `Nhận ${shortDate(booking.startDate)}`,
    `${shortDate(booking.startDate)} - ${shortDate(booking.endDate)}`,
    current > 3
      ? booking.checkedOutAt
        ? `Trả đồ ${shortDate(booking.checkedOutAt)}`
        : 'Hoàn thành'
      : `Trả trước ${shortDate(booking.endDate)}`,
  ];
}

export function UpcomingTripCard() {
  const { data: bookings, isLoading } = useMyBookings({ limit: 20 });
  const booking = pickTripBooking(bookings);

  if (isLoading) {
    return <div className="h-60 animate-pulse rounded-3xl bg-white/70" aria-busy="true" />;
  }

  if (!booking) {
    return (
      <section className="rounded-3xl border border-sky-100 bg-white p-6 text-center shadow-soft sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-brand-blue">
          <CalendarDays className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-ink">Bạn chưa có chuyến đi nào sắp tới</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Chọn thiết bị, đặt thuê và ký quỹ an toàn. Đơn của bạn sẽ xuất hiện ở đây cùng tiến trình bàn giao.
        </p>
        <Link
          href="/search"
          className="mt-5 inline-flex h-10 items-center rounded-full bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-blue"
        >
          Tìm thiết bị cho chuyến đi
        </Link>
      </section>
    );
  }

  const listing = booking.listing;
  const current = CURRENT_STEP[booking.status] ?? 0;
  const notes = stepNotes(booking, current);
  const deposit = booking.depositAmount ?? booking.payment?.depositAmount;
  const isDelivery = booking.deliveryMethod === 'DELIVERY';
  const isRecent = RECENT_STATUSES.includes(booking.status);
  const contractNeedsSign = booking.contract && !booking.contract.travelerSignedAt;
  const secondary =
    'inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-ink transition-colors hover:bg-slate-50';

  return (
    <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
          {isRecent ? 'Chuyến gần nhất' : 'Cần chú ý'} · {BOOKING_STATUS_LABEL[booking.status]}
        </span>
        <span className="text-xs text-slate-500">Mã đơn: #{booking.id.slice(0, 8).toUpperCase()}</span>
        <Link
          href="/bookings"
          className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:underline"
        >
          Xem tất cả đơn thuê <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {listing?.imageUrls?.[0] && (
            // eslint-disable-next-line @next/next/no-img-element -- remote provider uploads, same as ListingCard
            <img src={listing.imageUrls[0]} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
          )}
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
              {listing?.title?.trim() || 'Đơn thuê của bạn'}
              {booking.quantity > 1 ? ` × ${booking.quantity}` : ''}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                Nhận <b className="text-ink">{dateFmt.format(new Date(booking.startDate))}</b> ({pickupNote(booking)})
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                {isDelivery ? (
                  <Truck className="h-4 w-4 shrink-0 text-slate-400" />
                ) : (
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                )}
                <span className="truncate">
                  {isDelivery
                    ? `Giao tận nơi: ${booking.deliveryAddress ?? 'theo địa chỉ đã đặt'}`
                    : `Nhận tại: ${listing?.location ?? 'cửa hàng của chủ đồ'}`}
                </span>
              </span>
              {deposit ? (
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" />
                  Tiền cọc <b className="text-ink">{moneyFmt.format(Number(deposit))} ₫</b>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:shrink-0">
          <Link
            href={`/bookings/${booking.id}`}
            className="inline-flex h-10 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue"
          >
            {booking.status === 'PENDING_PAYMENT' ? 'Thanh toán ngay' : 'Xem chi tiết đơn'}
          </Link>
          {listing?.providerId && (
            <Link href={`/messages?to=${listing.providerId}`} className={secondary}>
              <MessageCircle className="h-4 w-4" />
              Nhắn chủ đồ
            </Link>
          )}
          {booking.contract && (
            <Link href={`/bookings/${booking.id}/contract`} className={secondary}>
              <FileText className="h-4 w-4" />
              {contractNeedsSign ? 'Ký hợp đồng' : 'Hợp đồng'}
            </Link>
          )}
        </div>
      </div>

      <ol className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 border-t border-sky-100 pt-5 sm:grid-cols-4">
        {STEP_TITLES.map((title, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={title} className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-brand text-white ring-4 ring-brand/20'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={`block text-xs font-bold leading-tight ${active ? 'text-brand-blue' : 'text-ink'}`}>
                  {title}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">{notes[i]}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
