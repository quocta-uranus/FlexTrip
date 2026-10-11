'use client';

import * as React from 'react';

export function PromiseStrip() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = React.useState(0);

  React.useEffect(() => {
    // If user prefers reduced motion, reveal all text immediately without scroll animation
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setScrollProgress(1);
      return;
    }

    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Start revealing when top is at 85% of window, fully revealed when top is at 25% of window
      const start = windowHeight * 0.85;
      const end = windowHeight * 0.25;

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
    { text: 'định', highlight: true },
    { text: 'cho', highlight: false },
    { text: 'mọi', highlight: false },
    { text: 'chuyến', highlight: false },
    { text: 'đi.', highlight: false },
  ];

  return (
    <section
      ref={containerRef}
      className="w-full bg-[#F1FAFF] pt-12 sm:pt-16 lg:pt-[84px] pb-4 sm:pb-6 lg:pb-8 transition-colors duration-300"
      aria-label="Cam kết dịch vụ"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="p-2 sm:p-4 max-w-4xl xl:max-w-5xl text-left">
          {/* ── 1. Top-Left Label (Aligned precisely with StorySection) ── */}
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] text-[#00A3FF] mb-4 sm:mb-6 flex items-center gap-2">
            <span className="h-px w-6 bg-[#00A3FF]" />
            CAM KẾT DỊCH VỤ
          </p>

          {/* ── 2. Wayfare Editorial Text Reveal Headline ── */}
          <h2 className="text-2xl sm:text-4xl lg:text-[44px] xl:text-[48px] font-extrabold tracking-tight leading-[1.3] select-none text-left text-[#0A1C2A]">
            {promiseWords.map((item, idx) => {
              const wordThreshold = (idx + 1) / promiseWords.length;
              const isWordActive = scrollProgress >= wordThreshold * 0.9;

              return (
                <React.Fragment key={idx}>
                  <span
                    className="inline-block mr-2 sm:mr-3 transition-colors duration-200"
                    style={{
                      color: isWordActive
                        ? item.highlight
                          ? '#00A3FF'
                          : '#0A1C2A'
                        : item.highlight
                        ? 'rgba(0, 163, 255, 0.28)'
                        : 'rgba(10, 28, 42, 0.22)',
                    }}
                  >
                    {item.text}
                  </span>
                  {item.breakAfter && <br className="hidden sm:inline" />}
                </React.Fragment>
              );
            })}
          </h2>
        </div>
      </div>
    </section>
  );
}
