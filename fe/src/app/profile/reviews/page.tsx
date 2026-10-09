'use client';

import Link from 'next/link';
import { useMyReviews } from '@/hooks/useReviews';
import type { ReviewStatus } from '@/types/review';
import { ReputationBadge } from '@/components/reputation/reputation-badge';

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
            {review.status === 'REJECTED' && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700">Đánh giá không được công khai</p>
                <p className="mt-1 text-sm leading-6 text-red-600">
                  Lý do: {review.rejectionReason ?? 'Đánh giá không đáp ứng chính sách nội dung.'}
                </p>
                <p className="mt-1 text-xs text-red-500">Nội dung này chỉ bạn và quản trị viên nhìn thấy.</p>
              </div>
            )}
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
    </div>
  );
}
