'use client';

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
  images: string[];
  index: number;
  title: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const SWIPE_DISTANCE = 50;

export function ImageLightbox({ images, index, title, onIndexChange, onClose }: ImageLightboxProps) {
  const touchStartX = useRef<number | null>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const total = images.length;

  const go = useCallback(
    (step: number) => onIndexChange((index + step + total) % total),
    [index, total, onIndexChange],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  // The page behind must not scroll while the viewer is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    thumbRefs.current[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [index]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ảnh của ${title}`}
      className="fixed inset-0 z-[100] flex flex-col bg-[#14171d]/95 text-white"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
        <p className="min-w-0 truncate text-sm">
          <span className="font-semibold">{index + 1} / {total}</span>
          <span className="ml-3 text-white/60">{title}</span>
        </p>
        <button
          type="button"
          aria-label="Đóng"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(dx) > SWIPE_DISTANCE) go(dx < 0 ? 1 : -1);
        }}
      >
        {total > 1 && (
          <button
            type="button"
            aria-label="Ảnh trước"
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/25 sm:left-5"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <img
          src={images[index]}
          alt={`${title} — ảnh ${index + 1}`}
          className="max-h-full max-w-full select-none object-contain"
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
        {total > 1 && (
          <button
            type="button"
            aria-label="Ảnh sau"
            onClick={(e) => { e.stopPropagation(); go(1); }}
            className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/25 sm:right-5"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {total > 1 && (
        <div className="px-4 pb-4 pt-3" onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto flex max-w-full justify-start gap-2 overflow-x-auto pb-1 sm:justify-center">
            {images.map((url, i) => (
              <button
                type="button"
                key={url}
                ref={(el) => { thumbRefs.current[i] = el; }}
                aria-label={`Xem ảnh ${i + 1}`}
                onClick={() => onIndexChange(i)}
                className={cn(
                  'h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-lg transition',
                  i === index ? 'opacity-100 ring-2 ring-white ring-offset-2 ring-offset-[#14171d]' : 'opacity-50 hover:opacity-80',
                )}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <p className="mt-2 hidden text-center text-xs text-white/50 sm:block">Phím ← → để chuyển ảnh, Esc để đóng</p>
        </div>
      )}
    </div>
  );
}
