'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Tent } from 'lucide-react';
import { LISTING_CATEGORIES, CATEGORY_ICON_MAP } from '@/constants/categories';
import { PillBadge } from '@/components/ui/pill-badge';
import { PillButton } from '@/components/ui/pill-button';

const CATEGORY_IMAGES: Record<string, { image: string; tag: string; defaultCount: number }> = {
  CAMPING: {
    image: '/assets/camping.jpg',
    tag: 'Lều trại, bàn ghế, bếp dã ngoại',
    defaultCount: 42,
  },
  TREKKING: {
    image: '/assets/backpack.jpg',
    tag: 'Balo trợ lực, gậy leo núi, đèn pin',
    defaultCount: 28,
  },
  BEACH: {
    image: '/assets/kayak.jpg',
    tag: 'Thuyền SUP, kayak, áo phao an toàn',
    defaultCount: 19,
  },
  CAMERA_GEAR: {
    image: '/assets/camera.jpg',
    tag: 'GoPro, flycam, máy ảnh hành trình',
    defaultCount: 35,
  },
  TRAVEL_ESSENTIALS: {
    image: '/assets/gear.jpg',
    tag: 'Vali du lịch, túi chống sốc, adapter',
    defaultCount: 50,
  },
  FAMILY: {
    image: '/assets/travel-kit.jpg',
    tag: 'Bộ dã ngoại gia đình, lều che mát',
    defaultCount: 16,
  },
};

export function CategorySection() {
  const [isDesktop, setIsDesktop] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);

  const trackRef = React.useRef<HTMLUListElement>(null);
  const singleSetRef = React.useRef<HTMLLIElement>(null);
  const animFrameIdRef = React.useRef<number | null>(null);
  const offsetRef = React.useRef(0);
  const targetOffsetRef = React.useRef(0);

  React.useEffect(() => {
    const checkBreakpoint = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  React.useEffect(() => {
    if (!isDesktop) {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const baseSpeed = 0.7;

    const loop = () => {
      const setEl = singleSetRef.current;
      const trackEl = trackRef.current;

      if (setEl && trackEl) {
        const setWidth = setEl.offsetWidth;
        if (setWidth > 0) {
          if (!isPaused) {
            targetOffsetRef.current += baseSpeed;
          }
          const diff = targetOffsetRef.current - offsetRef.current;
          offsetRef.current += diff * 0.12;

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

  const renderCard = (cat: (typeof LISTING_CATEGORIES)[number], isClone = false, idx = 0) => {
    const meta = CATEGORY_IMAGES[cat.value] || {
      image: '/assets/camping.jpg',
      tag: cat.description,
      defaultCount: 15,
    };
    const IconComponent = CATEGORY_ICON_MAP[cat.value] || Tent;

    return (
      <Link
        key={`${cat.value}-${isClone ? `clone-${idx}` : 'orig'}`}
        href={`/search?category=${cat.value}`}
        draggable={false}
        className="group relative w-[270px] sm:w-[310px] lg:w-[330px] h-[390px] sm:h-[420px] lg:h-[450px] shrink-0 rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-md hover:shadow-2xl border border-sky-100 transition-all duration-300 block select-none cursor-pointer"
      >
        <img
          src={meta.image}
          alt={cat.label}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-transparent pointer-events-none" />

        {/* Top Badges: Icon + Count */}
        <div className="absolute top-5 left-5 right-5 z-10 flex items-center justify-between gap-2">
          <PillBadge
            variant="dark"
            className="bg-black/45 backdrop-blur-md text-white border-white/20 text-xs font-semibold py-1 px-3 shadow-xs flex items-center gap-1.5"
          >
            <IconComponent className="h-3.5 w-3.5 text-brand-mint" />
            <span>{cat.label}</span>
          </PillBadge>
          <span className="text-[11px] font-bold text-white bg-brand/80 backdrop-blur-md px-2.5 py-1 rounded-full shadow-xs">
            {meta.defaultCount}+ đồ
          </span>
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

          <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 group-hover:bg-brand group-hover:border-brand group-hover:scale-105 transition-all shadow-sm">
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    );
  };

  return (
    <section className="py-10 sm:py-14 lg:py-16 w-full overflow-hidden scroll-mt-24" id="categories" aria-label="Danh mục thiết bị">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.14em] text-slate-500 mb-3">
            Danh mục thiết bị
          </p>
          <h2 className="text-[clamp(1.75rem,2.2vw+1rem,2.75rem)] font-semibold text-ink tracking-[-0.03em] leading-[1.1]">
            Thiết bị cho mọi hành trình
          </h2>
        </div>
        <PillButton
          href="/search"
          variant="outline"
          size="md"
          className="bg-white border-brand hover:bg-sky-50 text-[13px] font-semibold px-5 h-10 shadow-none"
        >
          Tất cả thiết bị
        </PillButton>
      </div>

      {/* Desktop Ticker / Mobile Horizontal Scroll */}
      {isDesktop ? (
        <div
          className="w-full relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <ul
            ref={trackRef}
            className="flex items-center gap-6 will-change-transform list-none p-0 m-0"
            style={{ width: 'max-content' }}
          >
            <li ref={singleSetRef} className="flex items-center gap-6 list-none">
              {LISTING_CATEGORIES.map((cat) => renderCard(cat, false))}
            </li>
            <li className="flex items-center gap-6 list-none" aria-hidden="true">
              {LISTING_CATEGORIES.map((cat, idx) => renderCard(cat, true, idx))}
            </li>
          </ul>
        </div>
      ) : (
        <div className="w-full overflow-x-auto no-scrollbar px-4 pb-4">
          <div className="flex items-center gap-4 w-max">
            {LISTING_CATEGORIES.map((cat) => renderCard(cat, false))}
          </div>
        </div>
      )}
    </section>
  );
}
