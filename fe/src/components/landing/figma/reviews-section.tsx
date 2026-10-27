'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, CheckCircle } from 'lucide-react';
import { publicStatsApi, type FeaturedReview } from '@/lib/api/client';
import { cn } from '@/lib/utils';

const MIN_REVIEWS = 3;
const CARDS_PER_HALF = 8;

// Lặp đủ thẻ để mỗi nửa track rộng hơn màn hình, nếu không vòng lặp sẽ bị hở.
function fill(items: FeaturedReview[]) {
  if (items.length === 0) return [];
  return Array.from({ length: Math.max(CARDS_PER_HALF, items.length) }, (_, i) => items[i % items.length]);
}

function ReviewCard({ review }: { review: FeaturedReview }) {
  return (
    <figure className="w-[300px] sm:w-[340px] shrink-0 rounded-2xl border border-sky-100 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-0.5 text-amber-400" aria-label={`${review.rating} trên 5 sao`}>
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={cn('h-3.5 w-3.5', i < review.rating ? 'fill-current' : 'text-slate-200')} />
        ))}
      </div>
      <blockquote className="mt-3 text-[13px] sm:text-sm leading-relaxed text-slate-700 line-clamp-3 min-h-[3.9em]">
        {review.comment}
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-2.5 text-xs">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-brand-blue">
          {review.authorName.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1 font-semibold text-ink">
            <span className="truncate">{review.authorName}</span>
            <CheckCircle className="h-3 w-3 shrink-0 text-emerald-500" />
          </span>
          {review.listingTitle && <span className="block truncate text-[11px] text-slate-400">{review.listingTitle}</span>}
        </span>
      </figcaption>
    </figure>
  );
}

function MarqueeRow({
  items,
  direction,
  duration,
}: {
  items: FeaturedReview[];
  direction: 'left' | 'right';
  duration: string;
}) {
  const half = fill(items);
  return (
    <div className="group/row overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className={cn(
          'flex w-max gap-4 will-change-transform group-hover/row:[animation-play-state:paused] motion-reduce:animate-none',
          direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right',
        )}
        style={{ '--marquee-duration': duration } as React.CSSProperties}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex gap-4" aria-hidden={copy === 1}>
            {half.map((rev, i) => (
              <ReviewCard key={`${copy}-${i}-${rev.id}`} review={rev} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReviewsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['public', 'reviews', 'featured'],
    queryFn: publicStatsApi.getFeaturedReviews,
    staleTime: 5 * 60 * 1000,
  });

  const reviews = useMemo(() => (data ?? []).filter((r) => r.comment && r.comment.trim()), [data]);
  const rows = useMemo(
    () => [reviews.filter((_, i) => i % 2 === 0), reviews.filter((_, i) => i % 2 === 1)],
    [reviews],
  );

  if (isLoading || reviews.length < MIN_REVIEWS) return null;

  return (
    <section className="py-12 sm:py-16 lg:py-20 scroll-mt-24 overflow-hidden" id="reviews" aria-label="Đánh giá từ cộng đồng">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-10">
        <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.14em] text-slate-500 mb-3">
          Đánh giá từ cộng đồng
        </p>
        <h2 className="text-[clamp(1.75rem,2.2vw+1rem,2.75rem)] font-semibold text-ink tracking-[-0.03em] leading-[1.1] max-w-xl">
          Người thuê nói gì sau chuyến đi
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        <MarqueeRow items={rows[0]} direction="left" duration="80s" />
        {rows[1].length > 0 && <MarqueeRow items={rows[1]} direction="right" duration="95s" />}
      </div>
    </section>
  );
}
