'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LISTING_CATEGORIES } from '@/constants/categories';
import { PillBadge } from '@/components/ui/pill-badge';
import { PillButton } from '@/components/ui/pill-button';

const CATEGORY_IMAGES: Record<string, { image: string; tag: string }> = {
  CAMPING: {
    image: '/assets/camping.jpg',
    tag: 'Lều trại, bàn ghế, bếp dã ngoại',
  },
  TREKKING: {
    image: '/assets/backpack.jpg',
    tag: 'Balo trợ lực, gậy leo núi, đèn pin',
  },
  BEACH: {
    image: '/assets/kayak.jpg',
    tag: 'Thuyền SUP, kayak, áo phao an toàn',
  },
  CAMERA_GEAR: {
    image: '/assets/camera.jpg',
    tag: 'GoPro, flycam, máy ảnh hành trình',
  },
  TRAVEL_ESSENTIALS: {
    image: '/assets/gear.jpg',
    tag: 'Vali du lịch, túi chống sốc, adapter',
  },
  FAMILY: {
    image: '/assets/travel-kit.jpg',
    tag: 'Bộ dã ngoại gia đình, lều che mát',
  },
};

export function CategorySection() {
  const [isDesktop, setIsDesktop] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);

  // Desktop Ticker Refs
  const trackRef = React.useRef<HTMLUListElement>(null);
  const singleSetRef = React.useRef<HTMLLIElement>(null);
  const animFrameIdRef = React.useRef<number | null>(null);
  const offsetRef = React.useRef(0);
  const targetOffsetRef = React.useRef(0);

  // Mobile/Tablet Carousel Ref
  const mobileScrollRef = React.useRef<HTMLDivElement>(null);

  // Responsive Breakpoint Listener (>= 1024px)
  React.useEffect(() => {
    const checkBreakpoint = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  // Desktop Wayfare Infinite Ticker Animation Loop
  React.useEffect(() => {
    if (!isDesktop) {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const baseSpeed = 0.7; // Luxurious, steady glide speed (pixels per frame)

    const loop = () => {
      const setEl = singleSetRef.current;
      const trackEl = trackRef.current;

      if (setEl && trackEl) {
        const setWidth = setEl.offsetWidth; // Width of one complete set of 6 cards + gap

        if (setWidth > 0) {
          // If not hovered, smoothly advance the auto-scroll target
          if (!isPaused) {
            targetOffsetRef.current += baseSpeed;
          }

          // Smooth interpolation towards target offset
          const diff = targetOffsetRef.current - offsetRef.current;
          offsetRef.current += diff * 0.12;

          // Seamless loop wrapping: once offset exceeds single set width, wrap without jump
          if (offsetRef.current >= setWidth) {
            offsetRef.current -= setWidth;
            targetOffsetRef.current -= setWidth;
          } else if (offsetRef.current < 0) {
            offsetRef.current += setWidth;
            targetOffsetRef.current += setWidth;
          }

          trackEl.style.transform = `translate3d(-${offsetRef.current.toFixed(2)}px, 0, 0)`;
        }
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isDesktop, isPaused]);

  // Render individual card
  const renderCard = (cat: (typeof LISTING_CATEGORIES)[number], isClone = false, idx = 0) => {
    const meta = CATEGORY_IMAGES[cat.value] || {
      image: '/assets/camping.jpg',
      tag: cat.description,
    };

    return (
      <Link
        key={`${cat.value}-${isClone ? `clone-${idx}` : 'orig'}`}
        href={`/search?category=${cat.value}`}
        draggable={false}
        className="group relative w-[280px] sm:w-[320px] lg:w-[340px] h-[400px] sm:h-[430px] lg:h-[460px] shrink-0 rounded-[32px] overflow-hidden shadow-md hover:shadow-2xl border border-[#DCEFFB] transition-all duration-300 block select-none cursor-pointer"
      >
        {/* Background Image with Zoom on Hover */}
        <img
          src={meta.image}
          alt={cat.label}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Wayfare Dark Gradient Shade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1C2A]/90 via-[#0A1C2A]/35 to-transparent pointer-events-none" />

        {/* Top Category Badge */}
        <div className="absolute top-5 left-5 z-10 flex items-center gap-2">
          <PillBadge
            variant="dark"
            className="bg-black/40 backdrop-blur-md text-white border-white/20 text-xs font-semibold py-1 px-3 shadow-xs"
          >
            <span className="mr-1">{cat.emoji}</span>
            <span>{cat.label}</span>
          </PillBadge>
        </div>

        {/* Bottom Card Content */}
        <div className="absolute bottom-6 left-6 right-6 z-10 text-white flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs text-white/80 line-clamp-1 mb-1 font-medium">
              {meta.tag}
            </p>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
              {cat.label}
            </h3>
          </div>

          {/* Circular Pill Arrow Icon */}
          <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 group-hover:bg-[#00A3FF] group-hover:border-[#00A3FF] group-hover:scale-105 transition-all shadow-sm">
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    );
  };

  return (
    <section
      className="py-12 sm:py-16 lg:py-[72px] w-full overflow-hidden"
      id="categories"
      aria-label="Danh mục thiết bị"
    >
      {/* ── Section Header (Wayfare Editorial Style) ── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 sm:gap-6 mb-12 sm:mb-14">
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] text-[#00A3FF] mb-2 sm:mb-2.5">
              DANH MỤC THIẾT BỊ
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#0A1C2A] tracking-tight leading-[1.14]">
              Thiết bị cho mọi hành trình
            </h2>
          </div>

          {/* Right Pill CTA (Wayfare Style) */}
          <div className="shrink-0">
            <PillButton
              href="/search"
              variant="outline"
              size="md"
              className="bg-white hover:bg-slate-50 border-slate-300/90 text-[#0A1C2A] shadow-xs hover:border-[#00A3FF] hover:text-[#00A3FF] hover:shadow-sm transition-all"
            >
              Khám phá tất cả thiết bị
            </PillButton>
          </div>
        </div>
      </div>

      {/* ── Desktop: Full-Bleed 100vw Wayfare Infinite Ticker (>= 1024px) ── */}
      <div
        className="hidden lg:block w-full overflow-hidden select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <ul
          ref={trackRef}
          style={{
            display: 'flex',
            position: 'relative',
            listStyleType: 'none',
            padding: 0,
            margin: 0,
            justifyContent: 'flex-start',
            flexDirection: 'row',
            gap: '20px',
            alignItems: 'flex-start',
            width: '100%',
            willChange: 'transform',
          }}
        >
          {/* 1. Primary Ticker Item */}
          <li
            ref={singleSetRef}
            className="ticker-item"
            aria-hidden="false"
            aria-posinset={1}
            aria-setsize={1}
            style={{
              flexGrow: 0,
              flexShrink: 0,
              position: 'relative',
              height: 'fit-content',
              width: 'fit-content',
            }}
          >
            <div className="flex gap-5">
              {LISTING_CATEGORIES.map((cat) => renderCard(cat, false))}
            </div>
          </li>

          {/* 2. Clone Item 1 (for seamless wrap) */}
          <li
            className="clone-item"
            aria-hidden="true"
            style={{
              flexGrow: 0,
              flexShrink: 0,
              position: 'relative',
              height: 'fit-content',
              width: 'fit-content',
            }}
          >
            <div className="flex gap-5">
              {LISTING_CATEGORIES.map((cat, idx) => renderCard(cat, true, idx))}
            </div>
          </li>

          {/* 3. Clone Item 2 (ensures ultra-wide viewports like 2560px remain seamless) */}
          <li
            className="clone-item"
            aria-hidden="true"
            style={{
              flexGrow: 0,
              flexShrink: 0,
              position: 'relative',
              height: 'fit-content',
              width: 'fit-content',
            }}
          >
            <div className="flex gap-5">
              {LISTING_CATEGORIES.map((cat, idx) => renderCard(cat, true, idx + 10))}
            </div>
          </li>
        </ul>
      </div>

      {/* ── Tablet & Mobile: Standard Swipe Carousel (< 1024px) ── */}
      <div className="lg:hidden max-w-[1400px] mx-auto px-4 sm:px-6">
        <div
          ref={mobileScrollRef}
          className="flex gap-5 sm:gap-6 overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:-mx-6 sm:px-6 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {LISTING_CATEGORIES.map((cat) => (
            <div key={cat.value} className="snap-start shrink-0">
              {renderCard(cat, false)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
