'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMyReviews, useReviewPolicy } from '@/hooks/useReviews';
import { useMyBookings } from '@/hooks/useBookings';
import type { ReviewStatus } from '@/types/review';
import type { Booking } from '@/types/booking';
import { ReputationBadge } from '@/components/reputation/reputation-badge';
import { ReviewActions } from '@/components/reviews/review-actions';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<ReviewStatus, string> = {
  PENDING: 'Đang kiểm tra',
  PUBLISHED: 'Đã công khai',
  FLAGGED: 'Chờ kiểm duyệt',
  REJECTED: 'Không được đăng',
};

const DAY = 86_400_000;
// Dùng khi chưa tải được cấu hình review_window_days; BE vẫn là nơi chốt hạn chính thức.
const FALLBACK_REVIEW_WINDOW_DAYS = 30;

type Tab = 'pending' | 'done';

function daysLeft(booking: Booking, windowDays: number) {
  const deadline = new Date(booking.endDate).getTime() + (windowDays + 1) * DAY;
  return Math.ceil((deadline - Date.now()) / DAY);
}

function PendingCard({ booking, windowDays }: { booking: Booking; windowDays: number }) {
  const image = booking.listing?.imageUrls?.[0];
  const left = daysLeft(booking, windowDays);
  const expired = left <= 0;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
      <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-32">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{booking.listing?.title ?? 'Sản phẩm đã thuê'}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Thuê {new Date(booking.startDate).toLocaleDateString('vi-VN')} – {new Date(booking.endDate).toLocaleDateString('vi-VN')}
        </p>
        <p className={cn('mt-2 text-xs font-semibold', expired ? 'text-red-600' : left <= 7 ? 'text-amber-600' : 'text-muted-foreground')}>
          {expired ? 'Đã quá hạn đánh giá' : `Còn ${left} ngày để đánh giá`}
        </p>
      </div>
      {!expired && (
        <Link
          href={`/bookings/${booking.id}`}
          className="shrink-0 rounded-full bg-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Đánh giá ngay
        </Link>
      )}
    </article>
  );
}

function EmptyState({ title, hint, href, cta }: { title: string; hint: string; href?: string; cta?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center">
      <p className="text-4xl">☆</p>
      <p className="mt-3 font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      {href && cta && (
        <Link href={href} className="mt-4 inline-block text-sm font-semibold text-blue-600">
          {cta}
        </Link>
      )}
    </div>
  );
}

export default function MyReviewsPage() {
  const { data: reviews = [], isLoading: loadingReviews, error } = useMyReviews();
  const { data: completed = [], isLoading: loadingBookings } = useMyBookings({ status: 'COMPLETED', limit: 100 });
  const { data: policy } = useReviewPolicy();
  const windowDays = policy?.reviewWindowDays ?? FALLBACK_REVIEW_WINDOW_DAYS;
  const [tab, setTab] = useState<Tab | null>(null);

  const pending = useMemo(() => {
    const reviewed = new Set(reviews.map((r) => r.bookingId).filter(Boolean));
    return completed
      .filter((b) => !reviewed.has(b.id))
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  }, [completed, reviews]);

  const isLoading = loadingReviews || loadingBookings;
  const active: Tab = tab ?? (pending.length > 0 ? 'pending' : 'done');

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: 'pending', label: 'Chờ đánh giá', count: pending.length },
    { key: 'done', label: 'Đã đánh giá', count: reviews.length },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-foreground">Đánh giá của tôi</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Đánh giá các chuyến thuê đã hoàn thành và theo dõi trạng thái những đánh giá đã gửi.
      </p>

      <div role="tablist" className="mt-6 inline-flex rounded-full bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              active === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            <span
              className={cn(
                'ml-2 rounded-full px-2 py-0.5 text-xs',
                active === t.key && t.key === 'pending' && t.count > 0 ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground',
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {isLoading && <div className="mt-6 h-40 animate-pulse rounded-2xl bg-muted" />}
      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error.message}</p>}

      {!isLoading && !error && active === 'pending' && (
        <div className="mt-6 space-y-4">
          {pending.length === 0 ? (
            <EmptyState
              title="Bạn đã đánh giá hết các chuyến thuê"
              hint="Chuyến thuê hoàn thành mới sẽ xuất hiện ở đây."
              href="/bookings?status=COMPLETED"
              cta="Xem các chuyến thuê đã hoàn thành"
            />
          ) : (
            pending.map((booking) => <PendingCard key={booking.id} booking={booking} windowDays={windowDays} />)
          )}
        </div>
      )}

      {!isLoading && !error && active === 'done' && (
        <div className="mt-6 space-y-4">
          {reviews.length === 0 && (
            <EmptyState title="Bạn chưa có đánh giá nào" hint="Hãy đánh giá chuyến thuê đầu tiên của bạn." />
          )}
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground">{review.listing?.title ?? 'Sản phẩm đã thuê'}</p>
                  <p className="mt-1 text-xl text-amber-500">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {STATUS_LABEL[review.status]}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{review.comment}</p>
              {review.status === 'REJECTED' && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-700">Đánh giá không được công khai</p>
                  <p className="mt-1 text-sm leading-6 text-red-600">
                    Lý do: {review.rejectionReason ?? 'Đánh giá không đáp ứng chính sách nội dung.'}
                  </p>
                  <p className="mt-1 text-xs text-red-500">Nội dung này chỉ bạn và quản trị viên nhìn thấy.</p>
                </div>
              )}
              <ReviewActions review={review} />
              {review.response && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Phản hồi từ Provider</p>
                    {review.targetBadges?.map((badge) => <ReputationBadge key={badge.code} badge={badge} />)}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{review.response}</p>
                </div>
              )}
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                {review.listingId && (
                  <Link href={`/listings/${review.listingId}`} className="font-semibold text-blue-600">Xem sản phẩm →</Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
