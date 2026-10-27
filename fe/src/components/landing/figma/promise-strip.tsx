'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function PromiseHeading({ className, size = 'default' }: { className?: string; size?: 'default' | 'display' }) {
  const containerRef = React.useRef<HTMLHeadingElement>(null);
  const [scrollProgress, setScrollProgress] = React.useState(0);

  React.useEffect(() => {
    const handleScroll = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isMobile = window.innerWidth < 768;
      if (prefersReducedMotion || isMobile) {
        setScrollProgress(1);
        return;
      }

      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Start revealing when top is at 80% of window, fully revealed at 35% of window
      const start = windowHeight * 0.8;
      const end = windowHeight * 0.35;

      const progress = Math.max(0, Math.min(1, (start - rect.top) / (start - end)));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const promiseWords = [
    { text: 'Không', highlight: false },
    { text: 'cần', highlight: false },
    { text: 'mua', highlight: false },
    { text: 'sắm', highlight: false },
    { text: 'tốn', highlight: false },
    { text: 'kém.', highlight: false, breakAfter: true },
    { text: 'Không', highlight: false },
    { text: 'lo', highlight: false },
    { text: 'cất', highlight: false },
    { text: 'giữ', highlight: false },
    { text: 'chật', highlight: false },
    { text: 'nhà.', highlight: false, breakAfter: true },
    { text: 'Luôn', highlight: false },
    { text: 'sẵn', highlight: false },
    { text: 'sàng', highlight: false },
    { text: 'thiết', highlight: true },
    { text: 'bị', highlight: true },
    { text: 'chuẩn', highlight: true },
    { text: 'kiểm', highlight: true },
    { text: 'định', highlight: true, breakAfter: true },
    { text: 'cho', highlight: false },
    { text: 'mọi', highlight: false },
    { text: 'chuyến', highlight: false },
    { text: 'đi.', highlight: false },
  ];

  return (
    <h2
      ref={containerRef}
      className={cn(
        'select-none text-ink',
        size === 'display'
          ? 'text-[clamp(1.75rem,2.6vw+0.75rem,3.25rem)] font-extrabold tracking-[-0.035em] leading-[1.12]'
          : 'text-xl sm:text-3xl lg:text-[clamp(1.75rem,1.8vw+1rem,2.5rem)] font-extrabold tracking-tight leading-[1.3]',
        className,
      )}
    >
      {promiseWords.map((item, idx) => {
        const wordThreshold = (idx + 1) / promiseWords.length;
        const isWordActive = scrollProgress >= wordThreshold * 0.9;

        return (
          <React.Fragment key={idx}>
            <span
              className="inline-block mr-1.5 sm:mr-2.5 transition-colors duration-200"
              style={{
                color: isWordActive
                  ? item.highlight
                    ? '#00B4EA'
                    : '#0A2533'
                  : item.highlight
                  ? 'rgba(0, 180, 234, 0.28)'
                  : 'rgba(10, 37, 51, 0.22)',
              }}
            >
              {item.text}
            </span>
            {item.breakAfter && <br className="hidden sm:inline" />}
          </React.Fragment>
        );
      })}
    </h2>
  );
}
