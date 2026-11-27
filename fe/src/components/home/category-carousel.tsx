'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PillButton } from '@/components/ui/pill-button';
import { LISTING_CATEGORIES } from '@/constants/categories';
import type { ListingCategory } from '@/constants/categories';

const CATEGORY_PHOTOS: Record<ListingCategory, string> = {
  CAMERA_GEAR: '/assets/camera.jpg',
  CAMPING: '/assets/camping.jpg',
  TREKKING: '/assets/backpack.jpg',
  BEACH: '/assets/kayak.jpg',
  TRAVEL_ESSENTIALS: '/assets/gear.jpg',
  FAMILY: '/assets/travel-kit.jpg',
};

// Three copies of the six cards always cover even a very wide screen, so the loop never shows a gap.
const COPIES = 3;
const BASE_SPEED = 0.7;

const WIDE_QUERY = '(min-width: 768px)';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeMotion(onChange: () => void) {
  const queries = [window.matchMedia(WIDE_QUERY), window.matchMedia(REDUCED_QUERY)];
  queries.forEach((q) => q.addEventListener('change', onChange));
  return () => queries.forEach((q) => q.removeEventListener('change', onChange));
}
const canAutoScroll = () => window.matchMedia(WIDE_QUERY).matches && !window.matchMedia(REDUCED_QUERY).matches;
const noAutoScrollOnServer = () => false;

export function CategoryCarousel() {
  const autoScroll = useSyncExternalStore(subscribeMotion, canAutoScroll, noAutoScrollOnServer);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLUListElement>(null);
  const offsetRef = useRef(0);
  const targetRef = useRef(0);

  // Distance between two identical cards, read from layout so the gap is always included.
  const loopWidth = useCallback(() => {
    const items = trackRef.current?.children;
    if (!items || items.length <= LISTING_CATEGORIES.length) return 0;
    return (items[LISTING_CATEGORIES.length] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft;
  }, []);

  useEffect(() => {
    if (!autoScroll) return;
    let frame = 0;
    const tick = () => {
      const track = trackRef.current;
      const width = loopWidth();
      if (track && width > 0) {
        if (!paused) targetRef.current += BASE_SPEED;
        offsetRef.current += (targetRef.current - offsetRef.current) * 0.12;
        if (offsetRef.current >= width) {
          offsetRef.current -= width;
          targetRef.current -= width;
        } else if (offsetRef.current < 0) {
          offsetRef.current += width;
          targetRef.current += width;
        }
        track.style.transform = `translate3d(${-offsetRef.current.toFixed(2)}px, 0, 0)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [autoScroll, paused, loopWidth]);

  const copies = autoScroll ? COPIES : 1;

  return (
    <section aria-label="Danh mục thiết bị" className="w-full scroll-mt-24 overflow-hidden py-10 sm:py-14 lg:py-16">
      <div className="mx-auto mb-8 flex max-w-6xl flex-col justify-between gap-4 px-4 sm:mb-10 sm:flex-row sm:items-end sm:px-6 lg:px-8">
        <div>
          <h2 className="text-[clamp(1.75rem,2.2vw+1rem,2.75rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-ink">
            Khám phá theo danh mục
          </h2>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Tìm trang bị chuyên biệt cho từng trải nghiệm dã ngoại.
          </p>
        </div>
        <PillButton
          href="/search"
          variant="outline"
          size="md"
          className="h-10 border-brand bg-white px-5 text-[13px] font-semibold shadow-none hover:bg-sky-50"
        >
          Tất cả thiết bị
        </PillButton>
      </div>

      <div
        className="w-full overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <ul
          ref={trackRef}
          // No left margin: the track fills the full width and wraps seamlessly, like the landing ticker.
          className={`m-0 flex list-none items-center gap-6 p-0 ${
            autoScroll
              ? 'w-max will-change-transform'
              : 'snap-x snap-mandatory overflow-x-auto pl-4 pr-4 scroll-pl-4 sm:pl-6 sm:pr-6 sm:scroll-pl-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          }`}
        >
          {Array.from({ length: copies }, (_, copy) =>
            LISTING_CATEGORIES.map(({ value, label, description, Icon }) => (
              <li
                key={`${copy}-${value}`}
                aria-hidden={copy > 0 || undefined}
                className="w-[270px] shrink-0 snap-start sm:w-[310px] lg:w-[330px]"
              >
                <Link
                  href={`/search?category=${value}`}
                  tabIndex={copy > 0 ? -1 : undefined}
                  draggable={false}
                  className="group relative flex h-[390px] select-none flex-col justify-between overflow-hidden rounded-[28px] bg-ink p-5 pb-6 text-white sm:h-[420px] sm:rounded-[32px] lg:h-[450px]"
                >
                  <Image
                    src={CATEGORY_PHOTOS[value]}
                    alt=""
                    fill
                    sizes="330px"
                    draggable={false}
                    className="z-0 object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />

                  <span className="relative z-20 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                    <Icon className="h-3.5 w-3.5 text-brand-mint" />
                    {label}
                  </span>

                  <div className="relative z-20 flex items-end justify-between gap-3 px-1">
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 line-clamp-1 text-[11px] font-medium text-white/80 sm:text-xs">{description}</p>
                      <h3 className="text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">{label}</h3>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-md transition-colors group-hover:border-brand group-hover:bg-brand">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </li>
            )),
          )}
        </ul>
      </div>
    </section>
  );
}
