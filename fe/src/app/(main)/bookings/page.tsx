'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Check, ClipboardList, Clock, Info, Package, Plus, Truck } from 'lucide-react';
import { useMyBookings } from '@/hooks/useBookings';
import { useMyReviews } from '@/hooks/useReviews';
import { BookingStatusBadge } from '@/components/booking-status-badge';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import type { Booking, BookingStatus } from '@/types/booking';
import { CATEGORY_LABELS } from '@/types/listing';

const TABS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'IN_PROGRESS', label: 'Đang thuê' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
];

// Steps of the happy path, shown as a stepper on the featured order and a thin bar on the others
const STEPS: Array<{ status: BookingStatus; label: string }> = [
  { status: 'PENDING_PAYMENT', label: 'Thanh toán' },
  { status: 'PENDING_APPROVAL', label: 'Duyệt đơn' },
  { status: 'CONFIRMED', label: 'Xác nhận' },
  { status: 'IN_PROGRESS', label: 'Đang thuê' },
  { status: 'COMPLETED', label: 'Hoàn thành' },
];

const CLOSED: BookingStatus[] = ['CANCELLED', 'DISPUTED', 'REFUNDING', 'REFUNDED'];
const UPCOMING: BookingStatus[] = ['PENDING_PAYMENT', 'PENDING_APPROVAL', 'CONFIRMED'];

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');
const dayMonth = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
const dayMonthYear = (d: Date) => `${dayMonth(d)}/${d.getFullYear()}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
const byStart = (a: Booking, b: Booking) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime();

function countdown(booking: Booking, now: Date) {
  if (booking.status === 'IN_PROGRESS') {
    const left = daysBetween(now, new Date(booking.endDate));
    if (left > 0) return `Còn ${left} ngày để trả thiết bị`;
    if (left === 0) return 'Hôm nay là ngày trả thiết bị';
    return 'Đã quá ngày trả dự kiến';
  }
  const until = daysBetween(now, new Date(booking.startDate));
  if (until > 0) return `Bắt đầu sau ${until} ngày`;
  if (until === 0) return 'Bắt đầu hôm nay';
  return 'Đã đến ngày thuê';
}

function Stepper({ status }: { status: BookingStatus }) {
  const current = STEPS.findIndex((s) => s.status === status);
  if (current === -1) return null;

  return (
    <ol className="mt-2 flex items-start" aria-label="Tiến trình đơn thuê">
      {STEPS.map((step, i) => {
        const done = i < current || status === 'COMPLETED';
        const active = i === current && status !== 'COMPLETED';
        return (
          <li key={step.status} className="relative flex flex-1 flex-col items-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn('absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2', i <= current ? 'bg-brand' : 'bg-slate-200')}
              />
            )}
            <span
              className={cn(
                'relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold leading-none',
                done && 'bg-brand text-white',
                active && 'bg-white text-brand-blue ring-2 ring-brand',
                !done && !active && 'bg-slate-100 text-slate-400',
              )}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={3.5} /> : i + 1}
            </span>
            <span
              className={cn(
                'mt-1.5 text-center text-[11px] font-semibold leading-tight',
                active ? 'text-brand-blue' : done ? 'text-slate-600' : 'text-slate-400',
                !active && 'hidden sm:block',
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ThinProgress({ status }: { status: BookingStatus }) {
  const index = STEPS.findIndex((s) => s.status === status);
  if (index === -1) return null;
  const percent = ((index + 1) / STEPS.length) * 100;
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] font-medium text-slate-500">
        Bước {index + 1} / {STEPS.length} · {STEPS[index].label}
      </p>
    </div>
  );
}

function Cover({ booking, className, grayscale }: { booking: Booking; className: string; grayscale?: boolean }) {
  const image = booking.listing?.imageUrls?.[0];
  const category = booking.listing?.category;
  return (
    <div className={cn('relative overflow-hidden bg-slate-100', className)}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className={cn('h-full w-full object-cover', grayscale && 'grayscale-[60%]')} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-300">
          <Package className="h-9 w-9" />
        </div>
      )}
      {category && (
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700 shadow-sm">
          {CATEGORY_LABELS[category] ?? category}
        </span>
      )}
    </div>
  );
}

function actionFor(booking: Booking, reviewed: boolean) {
  const detail = `/bookings/${booking.id}`;
  if (booking.status === 'PENDING_PAYMENT') return { label: 'Thanh toán', href: detail };
  if (booking.status === 'COMPLETED') return reviewed ? { label: 'Xem đơn', href: detail } : { label: 'Đánh giá', href: detail };
  if (CLOSED.includes(booking.status)) return { label: 'Thuê lại', href: `/listings/${booking.listingId}` };
  return { label: 'Xem chi tiết', href: detail };
}

function Price({ booking, muted }: { booking: Booking; muted?: boolean }) {
  return (
    <p className={cn('font-display text-xl font-medium tracking-tight', muted ? 'text-slate-400' : 'text-brand-blue')}>
      {Number(booking.totalPrice).toLocaleString('vi-VN')}
      <span className="ml-1 text-xs font-semibold text-slate-400">{booking.listing?.currency ?? 'VND'}</span>
    </p>
  );
}

function ActionLink({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="relative z-10 inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-slate-500 transition-colors hover:text-brand-blue"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function HoldNote({ booking }: { booking: Booking }) {
  if (booking.status !== 'PENDING_PAYMENT' || !booking.holdExpiresAt) return null;
  const until = new Date(booking.holdExpiresAt);
  return (
    <p className="flex items-start gap-1.5 text-xs font-semibold text-amber-700">
      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      Giữ chỗ đến {pad(until.getHours())}:{pad(until.getMinutes())} ngày {dayMonth(until)}
    </p>
  );
}

function FeaturedCard({ booking, now, reviewed }: { booking: Booking; now: Date; reviewed: boolean }) {
  const start = new Date(booking.startDate);
  const end = new Date(booking.endDate);
  const days = daysBetween(start, end) + 1;
  const action = actionFor(booking, reviewed);

  return (
    <article className="relative grid overflow-hidden rounded-[28px] border border-sky-100 bg-white shadow-xl shadow-brand-blue/10 transition-shadow hover:shadow-2xl hover:shadow-brand-blue/15 md:grid-cols-[320px_minmax(0,1fr)]">
      <Cover booking={booking} className="h-56 md:h-full" />
      <div className="flex flex-col gap-3 p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-2xl bg-sky-50 px-3.5 py-2 text-[13px] font-bold text-sky-700">{countdown(booking, now)}</span>
          <BookingStatusBadge status={booking.status} />
        </div>
        <h2 className="font-display text-3xl font-medium leading-tight tracking-[-0.02em] text-ink">
          <Link href={`/bookings/${booking.id}`} className="after:absolute after:inset-0">
            {booking.listing?.title ?? `Đơn #${booking.id.slice(-8)}`}
          </Link>
        </h2>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {dayMonth(start)} – {dayMonthYear(end)} · {days} ngày
          </span>
          {booking.deliveryMethod === 'DELIVERY' && (
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-slate-400" /> Giao tận nơi
            </span>
          )}
          {(booking.quantity ?? 1) > 1 && <span>× {booking.quantity} thiết bị</span>}
        </p>
        <HoldNote booking={booking} />
        <Stepper status={booking.status} />
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <Price booking={booking} />
          <ActionLink {...action} />
        </div>
      </div>
    </article>
  );
}

function OrderCard({ booking, reviewed }: { booking: Booking; reviewed: boolean }) {
  const closed = CLOSED.includes(booking.status);
  const start = new Date(booking.startDate);
  const end = new Date(booking.endDate);
  const days = daysBetween(start, end) + 1;
  const action = actionFor(booking, reviewed);

  return (
    <article
      className={cn(
        'relative flex flex-col overflow-hidden rounded-3xl border bg-white shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lg',
        closed ? 'border-slate-200' : 'border-sky-100',
      )}
    >
      <div className="relative">
        <Cover booking={booking} className="h-36" grayscale={closed} />
        <div className="absolute -bottom-5 right-4 z-[1] rounded-2xl bg-white px-3 py-1.5 text-center shadow-md">
          <b className="block text-xl font-bold leading-none text-ink">{pad(start.getDate())}</b>
          <small className="text-[10px] font-bold uppercase text-slate-500">Thg {pad(start.getMonth() + 1)}</small>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 pt-6">
        <BookingStatusBadge status={booking.status} className="self-start" />
        <h3 className="truncate text-base font-bold tracking-tight text-ink">
          <Link href={`/bookings/${booking.id}`} className="after:absolute after:inset-0">
            {booking.listing?.title ?? `Đơn #${booking.id.slice(-8)}`}
          </Link>
        </h3>
        <p className="text-xs text-slate-500">
          {dayMonth(start)} – {dayMonth(end)} · {days} ngày
          {booking.deliveryMethod === 'DELIVERY' ? ' · Giao tận nơi' : ''}
          {(booking.quantity ?? 1) > 1 ? ` · × ${booking.quantity}` : ''}
        </p>

        <HoldNote booking={booking} />
        {!closed && booking.status !== 'PENDING_PAYMENT' && <ThinProgress status={booking.status} />}
        {closed && booking.cancellationReason && (
          <p className="flex items-start gap-1.5 text-xs text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="line-clamp-2">Lý do: {booking.cancellationReason}</span>
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <Price booking={booking} muted={closed} />
          <ActionLink {...action} />
        </div>
      </div>
    </article>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-3xl border border-sky-100 bg-white">
      <div className="h-36 bg-slate-200" />
      <div className="space-y-3 p-4 pt-6">
        <div className="h-5 w-24 rounded-full bg-slate-200" />
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-1/2 rounded bg-slate-200" />
        <div className="h-6 w-28 rounded bg-slate-200" />
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const [activeStatus, setActiveStatus] = useState('');
  // One request for every order (the API allows up to 100), so tabs, counts and groups never disagree.
  const { data, isLoading, error } = useMyBookings({ limit: 100 });
  const user = useAuthStore((s) => s.user);
  const { data: myReviews } = useMyReviews(user?.roles.includes('TRAVELER') ?? false);
  const reviewedIds = useMemo(() => new Set((myReviews ?? []).map((r) => r.bookingId)), [myReviews]);
  const now = useMemo(() => new Date(), []);

  const bookings = useMemo(() => data ?? [], [data]);
  const counts = useMemo(() => {
    const map: Record<string, number> = { '': bookings.length };
    for (const b of bookings) map[b.status] = (map[b.status] ?? 0) + 1;
    return map;
  }, [bookings]);

  const filtered = useMemo(
    () => (activeStatus ? bookings.filter((b) => b.status === activeStatus) : bookings),
    [bookings, activeStatus],
  );

  // On "Tất cả" orders are grouped by time; the order that needs attention first becomes the featured card.
  const groups = useMemo(() => {
    const running = bookings.filter((b) => b.status === 'IN_PROGRESS').sort(byStart);
    const upcoming = bookings.filter((b) => UPCOMING.includes(b.status)).sort(byStart);
    const finished = bookings.filter((b) => !['IN_PROGRESS', ...UPCOMING].includes(b.status));
    const featured = running[0] ?? upcoming[0];
    return {
      featured,
      active: [...running, ...upcoming].filter((b) => b !== featured),
      finished,
    };
  }, [bookings]);

  const activeLabel = TABS.find((t) => t.value === activeStatus)?.label ?? '';
  const empty = !isLoading && !error && filtered.length === 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Đơn thuê</p>
            <h1 className="font-display mt-2 text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl">
              Đơn thuê của tôi
            </h1>
            <p className="mt-3 text-sm text-slate-600">Theo dõi tiến trình và quản lý các đơn thuê của bạn.</p>
          </div>
          <Link
            href="/search"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white shadow-md shadow-brand/30 transition hover:bg-brand-blue active:scale-95"
          >
            <Plus className="h-4 w-4" /> Thuê thêm thiết bị
          </Link>
        </div>

        <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Lọc theo trạng thái">
          {TABS.map((tab) => {
            const active = activeStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveStatus(tab.value)}
                className={cn(
                  'inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors',
                  active
                    ? 'border-ink bg-ink text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-brand/50 hover:text-brand-blue',
                )}
              >
                {tab.label}
                {!isLoading && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-bold',
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {counts[tab.value] ?? 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error.message}
          </div>
        )}

        {empty && (
          <div className="flex flex-col items-center rounded-3xl border border-sky-100 bg-white px-6 py-16 text-center shadow-soft">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-brand-blue">
              <ClipboardList className="h-8 w-8" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-ink">
              {activeStatus ? `Không có đơn ở trạng thái "${activeLabel}"` : 'Bạn chưa có đơn thuê nào'}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-600">
              {activeStatus
                ? 'Thử chọn trạng thái khác hoặc xem tất cả đơn của bạn.'
                : 'Khám phá các thiết bị cho thuê và đặt đơn đầu tiên của bạn.'}
            </p>
            {activeStatus ? (
              <button
                type="button"
                onClick={() => setActiveStatus('')}
                className="mt-5 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand/50 hover:text-brand-blue"
              >
                Xem tất cả đơn
              </button>
            ) : (
              <Link
                href="/search"
                className="mt-5 rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-blue"
              >
                Khám phá thiết bị
              </Link>
            )}
          </div>
        )}

        {!isLoading && !error && filtered.length > 0 && !activeStatus && (
          <div className="space-y-10">
            {groups.featured && (
              <section>
                <SectionTitle
                  title={groups.featured.status === 'IN_PROGRESS' ? 'Đang diễn ra' : 'Đơn sắp tới'}
                  hint="Đơn cần bạn chú ý nhất"
                />
                <FeaturedCard booking={groups.featured} now={now} reviewed={reviewedIds.has(groups.featured.id)} />
              </section>
            )}

            {groups.active.length > 0 && (
              <section>
                <SectionTitle title="Sắp tới và chờ xử lý" hint={`${groups.active.length} đơn`} />
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {groups.active.map((b) => (
                    <OrderCard key={b.id} booking={b} reviewed={reviewedIds.has(b.id)} />
                  ))}
                </div>
              </section>
            )}

            {groups.finished.length > 0 && (
              <section>
                <SectionTitle title="Đã kết thúc" hint="Hoàn thành và đã huỷ" />
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {groups.finished.map((b) => (
                    <OrderCard key={b.id} booking={b} reviewed={reviewedIds.has(b.id)} />
                  ))}
                </div>
              </section>
            )}

            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-sky-200 bg-sky-50/50 px-6 py-8 text-center">
              <p className="text-base font-bold text-ink">Bạn đang cần thêm thiết bị?</p>
              <p className="text-sm text-slate-600">Khám phá các thiết bị cho chuyến đi tiếp theo.</p>
              <Link
                href="/search"
                className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-blue"
              >
                Khám phá thiết bị
              </Link>
            </div>
          </div>
        )}

        {!isLoading && !error && filtered.length > 0 && activeStatus && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((b) => (
              <OrderCard key={b.id} booking={b} reviewed={reviewedIds.has(b.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
