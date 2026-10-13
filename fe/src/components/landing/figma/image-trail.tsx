'use client';

import * as React from 'react';

const TRAIL_IMAGES = [
  '/assets/adventure.jpg',
  '/assets/camping.jpg',
  '/assets/vietnam-hike.jpg',
  '/assets/kayak.jpg',
  '/assets/camera.jpg',
  '/assets/backpack.jpg',
  '/assets/gear.jpg',
  '/assets/travel-kit.jpg',
  '/assets/valley-camp.jpg',
  '/assets/hero.jpg',
];

interface TrailItem {
  id: number;
  x: number;
  y: number;
  image: string;
  rotation: number;
}

interface ImageTrailProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ImageTrail({ containerRef }: ImageTrailProps) {
  const [trails, setTrails] = React.useState<TrailItem[]>([]);
  const lastPos = React.useRef<{ x: number; y: number } | null>(null);
  const nextId = React.useRef<number>(0);
  const imageIndex = React.useRef<number>(0);
  const timeoutsRef = React.useRef<number[]>([]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if fine pointer (mouse) and no reduced motion
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isFinePointer || prefersReducedMotion) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Distance threshold: ~65px between successive images
      if (lastPos.current) {
        const dx = x - lastPos.current.x;
        const dy = y - lastPos.current.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 65) return;
      }

      lastPos.current = { x, y };

      const id = ++nextId.current;
      const image = TRAIL_IMAGES[imageIndex.current % TRAIL_IMAGES.length];
      imageIndex.current += 1;

      // Subtle random rotation between -7° and +7°
      const rotation = (Math.random() - 0.5) * 14;

      const newItem: TrailItem = { id, x, y, image, rotation };

      setTrails((prev) => {
        // Keep max 7 active images to preserve buttery performance
        const updated = prev.length >= 7 ? prev.slice(prev.length - 6) : prev;
        return [...updated, newItem];
      });

      // Remove after 1.1s lifetime
      const timer = window.setTimeout(() => {
        setTrails((prev) => prev.filter((item) => item.id !== id));
      }, 1100);

      timeoutsRef.current.push(timer);
    };

    container.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, [containerRef]);

  if (trails.length === 0) return null;

  return (
    <div
      data-framer-name="Image Trail"
      className="absolute inset-0 pointer-events-none overflow-hidden z-[2]"
      aria-hidden="true"
    >
      <style>{`
        @keyframes trailFadeScale {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--rot)) scale(0.78);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(var(--rot)) scale(1);
          }
          70% {
            opacity: 0.95;
            transform: translate(-50%, -50%) rotate(var(--rot)) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--rot)) scale(0.92);
          }
        }
        .trail-card {
          animation: trailFadeScale 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: transform, opacity;
        }
      `}</style>

      {trails.map((item) => (
        <div
          key={item.id}
          className="absolute rounded-2xl overflow-hidden shadow-2xl border border-white/30 bg-slate-900 trail-card"
          style={
            {
              left: `${item.x}px`,
              top: `${item.y}px`,
              width: '150px',
              aspectRatio: '3 / 4',
              '--rot': `${item.rotation}deg`,
            } as React.CSSProperties
          }
        >
          <img
            src={item.image}
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>
      ))}
    </div>
  );
}
