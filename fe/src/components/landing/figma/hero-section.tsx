'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, X, Loader2 } from 'lucide-react';
import { aiSearchApi } from '@/lib/api/ai-search';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useExclusiveOpen } from '@/components/ui/search-popup';
import { CategorySelect } from '@/components/search/category-select';
import { LocationAutocomplete } from '@/components/search/location-autocomplete';

const HERO_IMAGES = [
  { src: '/assets/hero.jpg', alt: 'Chinh phục thiên nhiên Việt Nam' },
  { src: '/assets/camping.jpg', alt: 'Cắm trại dã ngoại FlexTrip' },
  { src: '/assets/valley-camp.jpg', alt: 'Cắm trại thung lũng' },
  { src: '/assets/kayak.jpg', alt: 'Chèo SUP và du lịch biển' },
];

const SUGGESTIONS = [
  'Lều cắm trại Đà Lạt',
  'GoPro lặn biển',
  'Thuyền SUP Trị An',
  'Balo leo núi Fansipan',
];

const DEFAULT_HEADLINE = (
  <>
    Thuê trọn thiết bị,<br />
    <span className="lg:whitespace-nowrap bg-gradient-to-r from-brand-mint via-brand to-brand-blue bg-clip-text text-transparent">
      chạm đỉnh thiên nhiên.
    </span>
  </>
);

const DEFAULT_SUBTITLE =
  'Bộ sưu tập lều trại, thuyền SUP, flycam và đồ leo núi chính hãng từ cộng đồng uy tín gần bạn. Tiết kiệm chi phí, không lo cất giữ chật nhà.';

interface HeroSectionProps {
  eyebrow?: string;
  headline?: React.ReactNode;
  subtitle?: string;
  // Shorter frame for logged-in pages that put content right under the hero.
  compact?: boolean;
  aiLabel?: string;
}

export function HeroSection({
  eyebrow = 'Nền tảng chia sẻ thiết bị dã ngoại',
  headline = DEFAULT_HEADLINE,
  subtitle = DEFAULT_SUBTITLE,
  compact = false,
  aiLabel = 'Hỏi trợ lý AI',
}: HeroSectionProps) {
  const router = useRouter();
  // Keep the outgoing slide fully opaque under the incoming one so the dark frame never shows through mid-fade.
  const [slide, setSlide] = useState({ current: 0, previous: -1 });
  const fields = useExclusiveOpen<'location' | 'category' | 'date'>();
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [scrollY, setScrollY] = useState(0);

  // AI Search state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Background rotating timer
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;
    if (prefersReduced || isMobile) return;

    const interval = setInterval(() => {
      setSlide((s) => ({ current: (s.current + 1) % HERO_IMAGES.length, previous: s.current }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Parallax subtle scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 800) {
        setScrollY(window.scrollY);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set('location', location.trim());
    if (category) params.set('category', category);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    router.push(`/search?${params.toString()}`);
  };

  const handleAiSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = aiQuery.trim();
    if (!q || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const parsed = await aiSearchApi.parse(q);
      const params = new URLSearchParams();
      if (parsed.filters.keyword) params.set('keyword', parsed.filters.keyword);
      if (parsed.filters.category) params.set('category', parsed.filters.category);
      if (parsed.filters.location) params.set('location', parsed.filters.location);
      if (parsed.filters.dateFrom) params.set('dateFrom', parsed.filters.dateFrom);
      if (parsed.filters.dateTo) params.set('dateTo', parsed.filters.dateTo);
      if (parsed.filters.maxPrice) params.set('maxPrice', String(parsed.filters.maxPrice));
      setShowAiModal(false);
      router.push(`/search?${params.toString()}`);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI tìm kiếm đang bận, chuyển sang tìm kiếm từ khoá.');
      setTimeout(() => {
        setShowAiModal(false);
        router.push(`/search?keyword=${encodeURIComponent(q)}`);
      }, 1200);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <section className="w-full pt-2 sm:pt-3 pb-4 sm:pb-6" id="top">
      <div className={`relative w-[calc(100%-16px)] sm:w-[calc(100%-24px)] mx-auto min-h-fit ${compact ? 'sm:min-h-[60svh] lg:min-h-[min(560px,calc(100svh-24px))]' : 'sm:min-h-[80svh] lg:min-h-[min(720px,calc(100svh-24px))]'} rounded-[24px] sm:rounded-[36px] overflow-hidden flex flex-col justify-end p-5 sm:p-10 lg:p-12 xl:p-14 border border-black/10 shadow-2xl bg-ink`}>
        {/* Rotating Nature Background Images */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {HERO_IMAGES.map((img, idx) => (
            <img
              key={img.src}
              src={img.src}
              alt={img.alt}
              className={`absolute inset-0 h-full w-full object-cover object-[center_55%] transition-opacity duration-1000 ease-in-out brightness-[0.88] contrast-[1.02] ${
                idx === slide.current ? 'z-[2] opacity-100' : idx === slide.previous ? 'z-[1] opacity-100' : 'z-0 opacity-0'
              }`}
              style={{
                transform: `scale(${1 + scrollY * 0.00012}) translateY(${scrollY * 0.03}px)`,
              }}
            />
          ))}
        </div>

        {/* Cinematic Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 sm:bg-gradient-to-r sm:from-black/90 sm:via-black/45 sm:to-transparent pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

        {/* Carousel Indicator Dots */}
        <div className="hidden sm:flex absolute bottom-7 right-7 z-20 items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlide((s) => (s.current === i ? s : { current: i, previous: s.current }))}
              aria-label={`Xem ảnh ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === slide.current ? 'w-6 bg-brand' : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl pt-24 sm:pt-28 lg:pt-24 pb-2 sm:pb-4 flex flex-col gap-5 sm:gap-6 items-start">
          {/* Eyebrow & AI Question Trigger */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-white/25 bg-white/12 px-4 text-[13px] font-semibold tracking-wide text-white shadow-[0_4px_16px_rgba(0,0,0,0.18)] backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-brand-mint/60 blur-[3px]" />
                <span className="relative h-2 w-2 rounded-full bg-brand-mint" />
              </span>
              {eyebrow}
            </span>
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="group inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-brand to-brand-blue px-4 text-[13px] font-semibold text-white shadow-[0_6px_20px_rgba(0,180,234,0.4)] ring-1 ring-white/30 transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_26px_rgba(0,180,234,0.55)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Sparkles className="h-4 w-4 text-brand-mint transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
              <span>{aiLabel}</span>
            </button>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-[clamp(2.75rem,3.2vw+0.9rem,4rem)] font-extrabold tracking-tight text-white leading-[1.08] max-w-[920px] text-left">
            {headline}
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base lg:text-[17px] text-slate-200/90 leading-relaxed max-w-2xl font-normal text-left">
            {subtitle}
          </p>

          {/* Precision Capsule Search Bar */}
          <div className="w-full max-w-[780px] mt-1">
            <form
              onSubmit={handleSearch}
              className="bg-white/95 backdrop-blur-xl rounded-2xl md:rounded-full p-1.5 border border-sky-100 shadow-[0_12px_32px_rgba(10,37,51,0.22)] grid grid-cols-1 md:grid-cols-[1fr_1fr_1.15fr_auto] items-center gap-1 transition-all"
            >
              {/* One dropdown open at a time; each field is a popover on desktop and a bottom sheet on phones. */}
              <LocationAutocomplete value={location} onChange={setLocation} {...fields.bind('location')} />

              <CategorySelect
                value={category}
                onChange={setCategory}
                className="md:border-l md:border-sky-100"
                {...fields.bind('category')}
              />

              <DateRangePicker
                from={dateFrom}
                to={dateTo}
                onChange={({ from, to }) => {
                  setDateFrom(from);
                  setDateTo(to);
                }}
                className="md:border-l md:border-sky-100"
                {...fields.bind('date')}
              />

              {/* Submit Button */}
              <button
                type="submit"
                className="h-10 px-5 rounded-xl md:rounded-full bg-brand hover:bg-sky-700 text-white font-semibold text-sm shadow-md shadow-brand/30 transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer md:ml-1"
              >
                <Search className="h-4 w-4 shrink-0" strokeWidth={2.4} />
                <span>Tìm kiếm</span>
              </button>
            </form>

            {/* Suggestion Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-300 font-medium">Gợi ý nhanh:</span>
              {SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => router.push(`/search?keyword=${encodeURIComponent(sug)}`)}
                  className="rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1 text-slate-200 transition-colors cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Search Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-sky-100">
            <button
              type="button"
              onClick={() => setShowAiModal(false)}
              className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Tìm thiết bị bằng AI</h3>
                <p className="text-xs text-slate-500">Mô tả nhu cầu tự nhiên, AI sẽ phân tích và lọc chuẩn xác</p>
              </div>
            </div>

            <form onSubmit={handleAiSearch} className="mt-4">
              <div className="relative">
                <textarea
                  rows={3}
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Ví dụ: 'Cần lều 4 người và bếp dã ngoại đi cắm trại ở Đà Lạt cuối tuần này, giá hợp lý...'"
                  className="w-full p-3.5 text-sm rounded-2xl border border-sky-200 bg-sky-50/40 text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none font-medium"
                />
              </div>

              {aiError && (
                <p className="mt-2 text-xs text-danger">{aiError}</p>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.slice(0, 2).map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setAiQuery(ex)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={aiLoading || !aiQuery.trim()}
                  className="px-5 py-2.5 rounded-full bg-brand hover:bg-brand-blue text-white text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span>Phân tích & Tìm</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
