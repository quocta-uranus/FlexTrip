/* Review filter by star bars, adapted from Lucian UX/UI Prompt #261 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#261 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { ReputationBadge } from '@/components/reputation/reputation-badge';
import type { ListingReview } from '@/types/listing';
import { cn } from '@/lib/utils';
import { Avatar, StarRating } from './rating-parts';

const PREVIEW_COUNT = 4;
const STARS = [5, 4, 3, 2, 1];

export function ReviewsSection({ reviews }: { reviews: ListingReview[] }) {
  // 0 means every review; pressing the active bar again goes back to 0.
  const [filter, setFilter] = useState(0);
  const [showAll, setShowAll] = useState(false);
  // The star fill and the bars grow once the summary scrolls into view.
  const [grown, setGrown] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = summaryRef.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) {
      setTimeout(() => setGrown(true), 60);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        observer.disconnect();
        setTimeout(() => setGrown(true), 60);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const total = reviews.length;
  const average = total ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
  const counts = useMemo(() => STARS.map((star) => reviews.filter((r) => r.rating === star).length), [reviews]);
  const maxCount = Math.max(...counts, 1);

  const filtered = filter ? reviews.filter((r) => r.rating === filter) : reviews;
  const visible = showAll ? filtered : filtered.slice(0, PREVIEW_COUNT);

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Đánh giá</p>
      <h2 className="font-display mt-2 text-2xl font-medium tracking-[-0.02em] text-ink">Đánh giá từ khách thuê</h2>

      <div
        ref={summaryRef}
        className="mt-5 flex flex-col gap-6 rounded-3xl border border-sky-100 bg-white p-6 shadow-soft sm:flex-row sm:items-center sm:gap-10"
      >
        <div className="shrink-0 text-center sm:w-28">
          <b className="font-display block text-5xl font-extrabold leading-none tracking-[-0.04em] tabular-nums text-ink">
            {average.toFixed(1)}
          </b>
          <span aria-hidden="true" className="relative mt-2 inline-block text-base leading-none tracking-[1px] text-slate-200">
            ★★★★★
            <i
              className="absolute left-0 top-0 overflow-hidden whitespace-nowrap not-italic text-amber-500 transition-[width] delay-200 duration-1000 ease-[cubic-bezier(.3,.8,.3,1)] motion-reduce:transition-none"
              style={{ width: grown ? `${(average / 5) * 100}%` : 0 }}
            >
              ★★★★★
            </i>
          </span>
          <small className="mt-2 block text-[11px] font-bold text-slate-400">{total} đánh giá</small>
        </div>

        <div className="flex flex-1 flex-col gap-1" role="group" aria-label="Lọc đánh giá theo số sao">
          {STARS.map((star, i) => {
            const on = filter === star;
            return (
              <button
                key={star}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setFilter(on ? 0 : star);
                  setShowAll(false);
                }}
                className={cn(
                  '-mx-1.5 flex h-6 items-center gap-2 rounded-lg px-1.5 text-[11px] font-extrabold text-slate-600 transition-[opacity,background-color] duration-[250ms] hover:bg-slate-50 motion-reduce:transition-none',
                  filter !== 0 && !on && 'opacity-40',
                  on && 'bg-slate-50',
                )}
              >
                <span className="w-6 text-left tabular-nums">{star}★</span>
                <em className="h-[7px] flex-1 overflow-hidden rounded bg-slate-100">
                  <i
                    className="block h-full origin-left rounded bg-amber-500 transition-transform duration-[800ms] ease-[cubic-bezier(.3,1.1,.4,1)] motion-reduce:transition-none"
                    style={{
                      transform: `scaleX(${grown ? counts[i] / maxCount : 0})`,
                      transitionDelay: `${0.15 + i * 0.07}s`,
                    }}
                  />
                </em>
                <span className="w-9 text-right tabular-nums text-slate-400">{total ? Math.round((counts[i] / total) * 100) : 0}%</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-baseline gap-2">
        <h3 className="text-sm font-extrabold text-ink">{filter ? `Đánh giá ${filter} sao` : 'Tất cả đánh giá'}</h3>
        <span className="text-xs font-bold text-slate-400">{filtered.length}</span>
      </div>

      <div className="mt-3 space-y-4" aria-live="polite">
        {visible.length === 0 && (
          <p className="rounded-3xl bg-slate-50 px-5 py-6 text-center text-sm text-slate-500">Chưa có đánh giá {filter} sao.</p>
        )}
        {visible.map((r, i) => (
          <article
            key={r.id}
            style={{ transitionDelay: `${i * 0.06}s` }}
            className="rounded-3xl border border-sky-100 bg-white p-5 shadow-soft transition-[opacity,transform] duration-[400ms] ease-[cubic-bezier(.3,1.2,.5,1)] starting:translate-y-2.5 starting:opacity-0 motion-reduce:transition-none"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <Avatar src={r.author.avatarUrl} name={r.author.name} className="h-10 w-10 rounded-full text-sm" />
                <div>
                  <p className="text-sm font-semibold text-ink">{r.author.name}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <StarRating rating={r.rating} size="sm" />
            </div>

            {r.authorBadges && r.authorBadges.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {r.authorBadges.map((badge) => <ReputationBadge key={badge.code} badge={badge} />)}
              </div>
            )}

            {r.comment && <p className="text-[15px] leading-relaxed text-slate-600">{r.comment}</p>}

            {r.response && (
              <div className="mt-3 rounded-2xl border border-brand/15 bg-brand/5 p-3.5">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-brand-blue" />
                  <p className="text-xs font-bold text-brand-blue">Phản hồi từ người cho thuê</p>
                  {r.targetBadges?.map((badge) => <ReputationBadge key={badge.code} badge={badge} />)}
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{r.response}</p>
              </div>
            )}
          </article>
        ))}
      </div>

      {filtered.length > PREVIEW_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 transition hover:border-brand/50 hover:text-brand-blue"
        >
          {showAll ? (
            <>Thu gọn <ChevronUp className="h-4 w-4" /></>
          ) : (
            <>Xem tất cả {filtered.length} đánh giá <ChevronDown className="h-4 w-4" /></>
          )}
        </button>
      )}
    </section>
  );
}
