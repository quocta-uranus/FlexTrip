'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
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
const CARD_GAP = 20;

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

  function step(direction: 1 | -1) {
    const track = trackRef.current;
    const card = track?.children[0] as HTMLElement | undefined;
    if (!track || !card) return;
    const distance = card.offsetWidth + CARD_GAP;
    if (autoScroll) {
      targetRef.current += direction * distance;
    } else {
      track.scrollBy({ left: direction * distance, behavior: 'smooth' });
    }
  }

  const arrow =
    'flex h-10 w-10 items-center justify-center rounded-full border border-sky-100 bg-white text-ink shadow-xs transition-colors hover:border-brand hover:text-brand-blue';
  const copies = autoScroll ? COPIES : 1;

  return (
    <section aria-label="Khám phá theo danh mục" className="scroll-mt-28">
      <div className="mx-auto mb-5 flex max-w-6xl items-end justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Khám phá theo danh mục</h2>
          <p className="mt-1 text-sm text-slate-600">Tìm trang bị chuyên biệt cho từng trải nghiệm dã ngoại.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" aria-label="Danh mục trước" onClick={() => step(-1)} className={arrow}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Danh mục sau" onClick={() => step(1)} className={arrow}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
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
          // The first card starts on the same left edge as the section title above it.
          className={`flex gap-5 py-2 ${
            autoScroll
              ? 'ml-6 w-max will-change-transform lg:ml-[max(2rem,calc((100%-72rem)/2+2rem))]'
              : 'snap-x snap-mandatory overflow-x-auto pl-4 pr-4 scroll-pl-4 sm:pl-6 sm:pr-6 sm:scroll-pl-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          }`}
        >
          {Array.from({ length: copies }, (_, copy) =>
            LISTING_CATEGORIES.map(({ value, label, description, Icon }) => (
              <li
                key={`${copy}-${value}`}
                aria-hidden={copy > 0 || undefined}
                className="w-[260px] shrink-0 snap-start sm:w-[280px]"
              >
                <Link
                  href={`/search?category=${value}`}
                  tabIndex={copy > 0 ? -1 : undefined}
                  draggable={false}
                  className="group relative flex h-[340px] select-none flex-col justify-between overflow-hidden rounded-3xl bg-ink p-5 text-white"
                >
                  <Image
                    src={CATEGORY_PHOTOS[value]}
                    alt=""
                    fill
                    sizes="280px"
                    draggable={false}
                    className="z-0 object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />

                  <span className="relative z-20 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                    <Icon className="h-3.5 w-3.5 text-brand-mint" />
                    {label}
                  </span>

                  <div className="relative z-20 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold leading-tight text-white">{label}</h3>
                      <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-white/80">{description}</p>
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
