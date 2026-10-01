'use client';

import Link from 'next/link';
import { useMyReviews } from '@/hooks/useReviews';
import type { ReviewStatus } from '@/types/review';

const STATUS_LABEL: Record<ReviewStatus, string> = {
  PENDING: 'Đang kiểm tra',
  PUBLISHED: 'Đã công khai',
  FLAGGED: 'Chờ kiểm duyệt',
  REJECTED: 'Không được đăng',
};

export default function MyReviewsPage() {
  const { data: reviews = [], isLoading, error } = useMyReviews();

  return (
    <div className="mx-auto w-full max-w-4xl p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-foreground">Đánh giá của tôi</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Các đánh giá bạn đã gửi sau khi hoàn thành chuyến thuê.
      </p>

      {isLoading && <div className="mt-8 h-40 animate-pulse rounded-2xl bg-muted" />}
      {error && <p className="mt-8 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error.message}</p>}
      {!isLoading && !error && reviews.length === 0 && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-4xl">☆</p>
          <p className="mt-3 font-semibold text-foreground">Bạn chưa có đánh giá nào</p>
          <Link href="/bookings?status=COMPLETED" className="mt-4 inline-block text-sm font-semibold text-blue-600">
            Xem các chuyến thuê đã hoàn thành
          </Link>
        </div>
      )}

      <div className="mt-8 space-y-4">
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
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
              {review.listingId && (
                <Link href={`/listings/${review.listingId}`} className="font-semibold text-blue-600">Xem sản phẩm →</Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
