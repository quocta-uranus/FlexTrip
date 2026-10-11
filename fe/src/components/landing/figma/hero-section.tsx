'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Search, Calendar, Tent } from 'lucide-react';
import { LISTING_CATEGORIES } from '@/constants/categories';
import { PillButton } from '@/components/ui/pill-button';
import { PillBadge } from '@/components/ui/pill-badge';

export function HeroSection() {
  const router = useRouter();
  const [location, setLocation] = useState('Đà Lạt');
  const [category, setCategory] = useState('CAMPING');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 900) {
        setScrollY(window.scrollY);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDateFromChange = (val: string) => {
    setDateFrom(val);
    if (dateTo && val > dateTo) {
      setDateTo(val);
    }
  };

  const handleDateToChange = (val: string) => {
    if (dateFrom && val < dateFrom) {
      setDateTo(dateFrom);
    } else {
      setDateTo(val);
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set('location', location.trim());
    if (category) params.set('category', category);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <section className="w-full pt-2.5 sm:pt-3 pb-4 sm:pb-6 lg:pb-0" id="top">
      {/* ── Wayfare Full-Viewport Inset Hero Canvas ── */}
      <div className="relative w-[calc(100%-16px)] sm:w-[calc(100%-20px)] mx-auto min-h-fit sm:min-h-[88svh] lg:min-h-[625px] rounded-[24px] sm:rounded-[32px] overflow-hidden flex flex-col justify-end p-5 sm:p-10 lg:p-14 xl:p-16 border border-black/10 shadow-2xl bg-[#0A1826]">
        {/* Nature Background Image with subtle zoom & softened tone */}
        <img
          src="/assets/camping.jpg"
          alt="Cắm trại dã ngoại FlexTrip"
          className="absolute inset-0 h-full w-full object-cover object-[center_55%] transition-transform duration-300 ease-out will-change-transform brightness-[0.93] contrast-[1.02] saturate-[1.04]"
          style={{
            transform: `scale(${1 + scrollY * 0.00015}) translateY(${scrollY * 0.04}px)`,
          }}
        />

        {/* Wayfare Filmic Dark Vignette & Readability Gradient (No washed-out white overlay) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25 sm:bg-gradient-to-r sm:from-black/85 sm:via-black/40 sm:to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[#0A1826]/20 mix-blend-multiply pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#00A3FF]/15 rounded-full blur-3xl pointer-events-none" />

        {/* ── Wayfare Lower-Left Hero Content ── */}
        <div className="relative z-10 max-w-5xl pt-28 sm:pt-36 pb-2 sm:pb-4">
          {/* Hero Copy (Wayfare Specs: max-w-[928px], flex col, row-gap 28px, items-start) */}
          <div className="max-w-[928px] flex flex-col gap-5 sm:gap-7 items-start justify-start">
            {/* Eyebrow Pill Chip */}
            <div>
              <PillBadge
                variant="dark"
                dot
                dotColor="bg-[#00D8F6]"
                className="bg-black/50 backdrop-blur-md text-sky-200 border-white/20 text-xs font-semibold px-3.5 py-1.5 shadow-sm"
              >
                🏕️ Nền tảng chia sẻ thiết bị dã ngoại hàng đầu
              </PillBadge>
            </div>

            {/* Headline Display (Wayfare Specs: 66px, weight 400, leading 1.0, tracking -0.03em, max-w 820px) */}
            <h1 className="text-3xl sm:text-5xl lg:text-[66px] font-normal tracking-[-0.03em] text-white leading-[1.0] max-w-[820px] text-left">
              Thuê trọn thiết bị,<br />
              <span className="text-[#00D8F6]">
                chạm đỉnh thiên nhiên.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg lg:text-xl text-slate-200/90 leading-relaxed max-w-2xl font-normal text-left">
              Bộ sưu tập lều trại, thuyền SUP, bếp dã ngoại và đồ leo núi chính hãng từ cộng đồng outdoor uy tín gần bạn. Tiết kiệm chi phí, không lo cất giữ.
            </p>

            {/* Dual Pill CTA Buttons (Aligned height & Ivory white CTA 2) */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <PillButton href="/search" variant="brand" size="lg">
                Thuê thiết bị ngay
              </PillButton>
              <PillButton
                href="/register-provider"
                size="lg"
                className="bg-[#FFFFFF] hover:bg-[#F7F7F5] text-[#161513] border border-black/10 transition-all shadow-sm font-semibold hover:border-black/20 hover:scale-[1.02]"
              >
                Đăng tin cho thuê
              </PillButton>
            </div>
          </div>

          {/* ── Bottom: Precision-Aligned Quick Search Bar ── */}
          <div className="mt-8 sm:mt-10 w-full max-w-[940px]">
            <form
              onSubmit={handleSearch}
              className="bg-white/95 backdrop-blur-xl rounded-3xl lg:rounded-full p-2 sm:p-2 pl-3 sm:pl-3.5 pr-2 sm:pr-2.5 border border-slate-200/90 shadow-[0_16px_40px_rgba(10,24,38,0.22)] flex flex-col md:grid md:grid-cols-2 lg:flex lg:flex-row items-stretch lg:items-center gap-2 lg:gap-1 transition-all"
            >
              {/* 1. Location */}
              <div className="flex-1 flex items-center gap-3 px-3.5 py-2 hover:bg-sky-50/50 rounded-2xl lg:rounded-full transition-colors min-w-0">
                <div className="h-9 w-9 rounded-full bg-[#EBF7FD] flex items-center justify-center text-[#00A3FF] shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#075D82]">
                    Địa điểm
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Đà Lạt, Hà Nội..."
                    className="w-full bg-transparent text-sm font-semibold text-[#0A1C2A] focus:outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Vertical divider 1 */}
              <div className="hidden lg:block w-px h-8 bg-slate-200/90 shrink-0 mx-0.5" />

              {/* 2. Category Select */}
              <div className="flex-1 flex items-center gap-3 px-3.5 py-2 hover:bg-sky-50/50 rounded-2xl lg:rounded-full transition-colors min-w-0">
                <div className="h-9 w-9 rounded-full bg-[#EBF7FD] flex items-center justify-center text-[#00A3FF] shrink-0">
                  <Tent className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#075D82]">
                    Loại thiết bị
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold text-[#0A1C2A] focus:outline-none cursor-pointer truncate"
                  >
                    <option value="">Tất cả danh mục</option>
                    {LISTING_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vertical divider 2 */}
              <div className="hidden lg:block w-px h-8 bg-slate-200/90 shrink-0 mx-0.5" />

              {/* 3. Dates (Snug fitted to prevent dead space) */}
              <div className="shrink-0 flex items-center gap-3 px-3.5 py-2 hover:bg-sky-50/50 rounded-2xl lg:rounded-full transition-colors min-w-0">
                <div className="h-9 w-9 rounded-full bg-[#EBF7FD] flex items-center justify-center text-[#00A3FF] shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#075D82]">
                    Thời gian thuê
                  </label>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0A1C2A] whitespace-nowrap">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => handleDateFromChange(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      title="Ngày bắt đầu"
                      aria-label="Ngày bắt đầu"
                      className="bg-transparent focus:outline-none w-[114px] cursor-pointer text-xs sm:text-sm"
                    />
                    <span className="text-slate-400 font-normal shrink-0">→</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => handleDateToChange(e.target.value)}
                      min={dateFrom || new Date().toISOString().split('T')[0]}
                      title="Ngày kết thúc"
                      aria-label="Ngày kết thúc"
                      className="bg-transparent focus:outline-none w-[114px] cursor-pointer text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Search Submit Button */}
              <div className="shrink-0 flex items-center justify-center pl-1">
                <button
                  type="submit"
                  className="w-full lg:w-auto h-[46px] px-6 sm:px-7 rounded-full bg-gradient-to-r from-[#1877F2] via-[#00A3FF] to-[#00D8F6] text-white font-semibold text-sm shadow-md shadow-[#00A3FF]/25 hover:shadow-lg hover:shadow-[#00A3FF]/40 hover:opacity-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <Search className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  <span>Tìm kiếm</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
