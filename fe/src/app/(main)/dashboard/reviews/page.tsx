'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useReceivedReviews, useRespondToReview } from '@/hooks/useReviews';
import type { Review } from '@/types/review';
import { ReputationBadge } from '@/components/reputation/reputation-badge';

function ResponseEditor({ review }: { review: Review }) {
  const [response, setResponse] = useState(review.response ?? '');
  const [editing, setEditing] = useState(!review.response);
  const [message, setMessage] = useState<string | null>(null);
  const respond = useRespondToReview();
  const trimmed = response.trim();

  async function submit() {
    if (!trimmed || trimmed.length > 2000) return;
    setMessage(null);
    try {
      await respond.mutateAsync({ reviewId: review.id, response: trimmed });
      setResponse(trimmed);
      setEditing(false);
      setMessage(review.response ? 'Đã cập nhật phản hồi.' : 'Đã gửi phản hồi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể gửi phản hồi.');
    }
  }

  if (!editing && response) {
    return (
      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Phản hồi của bạn</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{response}</p>
          </div>
          <button
            type="button"
            onClick={() => { setEditing(true); setMessage(null); }}
            className="shrink-0 text-sm font-semibold text-blue-700 hover:underline"
          >
            Chỉnh sửa
          </button>
        </div>
        {message && <p className="mt-2 text-xs font-medium text-emerald-700">{message}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <label htmlFor={`response-${review.id}`} className="text-sm font-semibold text-slate-900">
        {review.response ? 'Chỉnh sửa phản hồi' : 'Phản hồi đánh giá'}
      </label>
      <textarea
        id={`response-${review.id}`}
        value={response}
        onChange={(event) => setResponse(event.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Cảm ơn khách hàng và phản hồi một cách chuyên nghiệp…"
        className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <span className={`text-xs ${trimmed.length > 2000 ? 'text-red-600' : 'text-slate-500'}`}>
          {response.length}/2000 ký tự
        </span>
        <div className="flex gap-2">
          {review.response && (
            <button
              type="button"
              onClick={() => { setResponse(review.response ?? ''); setEditing(false); setMessage(null); }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!trimmed || trimmed.length > 2000 || respond.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {respond.isPending ? 'Đang gửi…' : review.response ? 'Lưu thay đổi' : 'Gửi phản hồi'}
          </button>
        </div>
      </div>
      {message && <p className="mt-2 text-xs font-medium text-red-600">{message}</p>}
    </div>
  );
}

export default function ProviderReviewsPage() {
  const { data: reviews = [], isLoading, error } = useReceivedReviews();
  const [listingId, setListingId] = useState('ALL');
  const [rating, setRating] = useState('ALL');

  const listings = useMemo(() => {
    const map = new Map<string, string>();
    for (const review of reviews) {
      if (review.listing) map.set(review.listing.id, review.listing.title);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'vi'));
  }, [reviews]);

  const filtered = useMemo(
    () => reviews.filter((review) =>
      (listingId === 'ALL' || review.listingId === listingId) &&
      (rating === 'ALL' || review.rating === Number(rating))),
    [listingId, rating, reviews],
  );
  const unanswered = reviews.filter((review) => !review.response).length;

  return (
    <div className="min-h-screen bg-[#f6fbfe]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-blue-700">← Dashboard</Link>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-950">Đánh giá khách hàng</h1>
              <p className="mt-1 text-sm text-slate-600">Theo dõi và phản hồi các đánh giá công khai về dịch vụ của bạn.</p>
            </div>
            <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
              {unanswered} đánh giá chưa phản hồi
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 rounded-2xl border border-[#DCEFFB] bg-white p-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Sản phẩm
            <select value={listingId} onChange={(event) => setListingId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
              <option value="ALL">Tất cả sản phẩm</option>
              {listings.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Số sao
            <select value={rating} onChange={(event) => setRating(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
              <option value="ALL">Tất cả mức đánh giá</option>
              {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} sao</option>)}
            </select>
          </label>
        </div>

        {isLoading && <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />}
        {error && <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-700">{error.message}</div>}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-[#DCEFFB] bg-white p-12 text-center">
            <div className="text-4xl">☆</div>
            <p className="mt-3 font-semibold text-slate-900">Chưa có đánh giá phù hợp</p>
            <p className="mt-1 text-sm text-slate-500">Đánh giá đã công khai của khách hàng sẽ xuất hiện tại đây.</p>
          </div>
        )}

        <div className="space-y-4">
          {filtered.map((review) => (
            <article key={review.id} className="rounded-2xl border border-[#DCEFFB] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                    {review.author.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{review.author.name}</p>
                    {review.authorBadges && review.authorBadges.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {review.authorBadges.map((badge) => <ReputationBadge key={badge.code} badge={badge} />)}
                      </div>
                    )}
                    <p className="truncate text-sm text-slate-500">{review.listing?.title ?? 'Sản phẩm đã thuê'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg text-amber-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
                  <p className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{review.comment}</p>
              <ResponseEditor review={review} />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
