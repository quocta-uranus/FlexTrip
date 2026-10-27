'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';
import { ImageTrail } from './image-trail';

const TITLE_WORDS = [
  'Chuyến',
  'đi',
  'tiếp',
  'theo',
  'không',
  'cần',
  'bắt',
  'đầu',
  'bằng',
  'một',
  'danh',
  'sách',
  'mua',
  'sắm.',
];

export function FinalCtaFooter() {
  const photoPanelRef = React.useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = React.useState(false);

  React.useEffect(() => {
    const el = photoPanelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full pt-10 sm:pt-12 lg:pt-14 pb-0 bg-transparent">
      {/* ── 1. Pre-Footer Final CTA Banner (Synchronized with HeroSection Frame) ── */}
      <section className="mb-6 sm:mb-8">
        <div
          ref={photoPanelRef}
          className="relative w-[calc(100%-16px)] sm:w-[calc(100%-20px)] mx-auto min-h-fit sm:min-h-[46svh] lg:min-h-[min(380px,60svh)] rounded-[24px] sm:rounded-[32px] overflow-hidden flex flex-col items-center justify-center text-center p-6 sm:p-8 lg:p-10 border border-black/10 shadow-2xl bg-[#0A1826]"
        >
          {/* Background Image (Outdoor adventure.jpg, cover center, matching HeroSection styling) */}
          <img
            src="/assets/adventure.jpg"
            alt="Dã ngoại thiên nhiên FlexTrip"
            className="absolute inset-0 h-full w-full object-cover object-[center_55%] brightness-[0.93] contrast-[1.02] saturate-[1.04] z-0 pointer-events-none"
          />

          {/* Veil & Ambient Glow: Filmic dark overlay for crisp text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1826]/90 via-[#0A1826]/65 to-[#0A1826]/40 z-[1] pointer-events-none" />
          <div className="absolute inset-0 bg-[#0A1826]/20 mix-blend-multiply z-[1] pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#00A3FF]/15 rounded-full blur-3xl pointer-events-none z-[1]" />

          {/* Image Trail: Interactive cursor trail with outdoor assets */}
          <ImageTrail containerRef={photoPanelRef} />

          {/* CTA Content (Always positioned above Image Trail) */}
          <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center pointer-events-auto">
            {/* Title: Staggered word reveal animation, uniform ivory white */}
            <h2 className="text-2xl sm:text-3xl lg:text-[clamp(1.75rem,1.6vw+1rem,2.5rem)] font-medium text-[#F5F5F0] leading-[1.1] tracking-[-0.03em] max-w-[980px] mx-auto text-center">
              {TITLE_WORDS.map((word, index) => (
                <span
                  key={index}
                  className="inline-block transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    opacity: isInView ? 1 : 0,
                    transform: isInView ? 'translateY(0)' : 'translateY(18px)',
                    transitionDelay: `${index * 55}ms`,
                    willChange: 'transform, opacity',
                  }}
                >
                  {word}&nbsp;
                </span>
              ))}
            </h2>

            {/* Description: Centered ivory text with subtle opacity */}
            <p
              className="mt-4 text-sm sm:text-[15px] text-[#E2E8F0]/85 leading-[1.55] max-w-[560px] mx-auto text-center transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? 'translateY(0)' : 'translateY(14px)',
                transitionDelay: '550ms',
              }}
            >
              Thiết bị cắm trại, leo núi, chèo SUP chính hãng từ cộng đồng outdoor uy tín sẵn sàng cùng bạn lên đường.
            </p>

            {/* Buttons: Primary FlexTrip Cyan & Secondary Glass Button with Wayfare Arrow Clip Hover */}
            <div
              className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-[12px] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                opacity: isInView ? 1 : 0,
                transform: isInView ? 'translateY(0)' : 'translateY(14px)',
                transitionDelay: '700ms',
              }}
            >
              {/* Primary Button */}
              <Link
                href="/search"
                className="group h-[50px] px-6 rounded-full inline-flex items-center gap-3.5 bg-[#00D8F6] hover:bg-[#1fe2fe] text-[#0A1826] font-semibold text-[14px] sm:text-[15px] shadow-[0_4px_20px_rgba(0,216,246,0.25)] hover:shadow-[0_6px_24px_rgba(0,216,246,0.4)] transition-all duration-300 active:scale-[0.98] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D8F6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1826]"
              >
                <span>Khám phá thiết bị ngay</span>
                <span className="h-7 w-7 rounded-full bg-[#0A1826]/12 flex items-center justify-center overflow-hidden relative shrink-0">
                  <ArrowRight
                    className="h-3.5 w-3.5 text-[#0A1826] absolute transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-5"
                    strokeWidth={2.2}
                  />
                  <ArrowRight
                    className="h-3.5 w-3.5 text-[#0A1826] absolute -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0"
                    strokeWidth={2.2}
                  />
                </span>
              </Link>

              {/* Secondary Button - Glass Style */}
              <Link
                href="/become-provider"
                className="group h-[50px] px-6 rounded-full inline-flex items-center gap-3.5 bg-white/[0.16] hover:bg-white/[0.24] border border-white/35 hover:border-white/50 backdrop-blur-md text-[#F5F5F0] font-medium text-[14px] sm:text-[15px] shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all duration-300 active:scale-[0.98] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1826]"
              >
                <span>Đăng tin cho thuê</span>
                <span className="h-7 w-7 rounded-full bg-white/15 flex items-center justify-center overflow-hidden relative shrink-0">
                  <ArrowRight
                    className="h-3.5 w-3.5 text-white absolute transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-5"
                    strokeWidth={2.2}
                  />
                  <ArrowRight
                    className="h-3.5 w-3.5 text-white absolute -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0"
                    strokeWidth={2.2}
                  />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Footer ── */}
      <footer className="w-full bg-[#0B1F2E] text-[#A8B9C7] pt-12 sm:pt-14 lg:pt-16 pb-0 mb-0 relative overflow-hidden border-t border-white/[0.08] shadow-[0_1200px_0_1200px_#0B1F2E]">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#13C8EF]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1300px] mx-auto px-6 sm:px-10 lg:px-14 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 pb-10 sm:pb-12">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-5 flex flex-col gap-4">
              <Link href="/" className="inline-flex items-center gap-2.5 group">
                <div className="h-9 w-9 rounded-full bg-[#13C8EF] text-[#0A1C2A] flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  <Compass className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <span className="text-2xl font-extrabold tracking-tight text-[#F5F9FC]">
                  Flex<span className="text-[#13C8EF]">Trip</span>
                </span>
              </Link>
              <p className="text-sm text-[#A8B9C7] leading-relaxed max-w-sm">
                Nền tảng chia sẻ thiết bị dã ngoại tại Việt Nam. Thuê đồ an toàn với cọc escrow và hợp đồng số.
              </p>
            </div>

            {/* Explore */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <p className="text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.05em] text-[#F5F9FC] mb-1">
                Khám phá
              </p>
              <Link href="/search?category=CAMPING" className="inline-block text-sm text-[#A8B9C7] transition-all duration-200 hover:translate-x-1 hover:text-[#F5F9FC]">Camping</Link>
              <Link href="/search?category=TREKKING" className="inline-block text-sm text-[#A8B9C7] transition-all duration-200 hover:translate-x-1 hover:text-[#F5F9FC]">Trekking</Link>
              <Link href="/search?category=BEACH" className="inline-block text-sm text-[#A8B9C7] transition-all duration-200 hover:translate-x-1 hover:text-[#F5F9FC]">Du lịch biển</Link>
              <Link href="/search" className="inline-block text-sm text-[#A8B9C7] transition-all duration-200 hover:translate-x-1 hover:text-[#F5F9FC]">Tất cả thiết bị</Link>
            </div>

            {/* Providers */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <p className="text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.05em] text-[#F5F9FC] mb-1">
                Cho chủ đồ
              </p>
              <Link href="/become-provider" className="inline-block text-sm text-[#A8B9C7] transition-all duration-200 hover:translate-x-1 hover:text-[#F5F9FC]">Trở thành Provider</Link>
              <Link href="/dashboard" className="inline-block text-sm text-[#A8B9C7] transition-all duration-200 hover:translate-x-1 hover:text-[#F5F9FC]">Bảng quản trị</Link>
            </div>

            {/* Support */}
            <div className="lg:col-span-3 flex flex-col gap-3">
              <p className="text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.05em] text-[#F5F9FC] mb-1">
                Hỗ trợ
              </p>
              <Link href="/#how-it-works" className="inline-block text-sm text-[#A8B9C7] transition-all duration-200 hover:translate-x-1 hover:text-[#F5F9FC]">Cách hoạt động</Link>
              <Link href="/#why-flextrip" className="inline-block text-sm text-[#A8B9C7] transition-all duration-200 hover:translate-x-1 hover:text-[#F5F9FC]">Cam kết an toàn và cọc</Link>
              <Link href="/#faq" className="inline-block text-sm text-[#A8B9C7] transition-all duration-200 hover:translate-x-1 hover:text-[#F5F9FC]">Câu hỏi thường gặp</Link>
            </div>
          </div>

          <div className="w-full h-px bg-white/[0.12] mb-6" />

          <div className="flex items-center justify-between text-xs text-[#8295A5] pb-6 sm:pb-8">
            <p>© 2026 FlexTrip. Mọi quyền được bảo lưu.</p>
          </div>

          {/* Large wordmark */}
          <div
            className="w-full h-[11vw] max-h-[160px] overflow-hidden select-none pointer-events-none text-center flex items-start justify-center pt-2 sm:pt-4"
            aria-hidden="true"
          >
            <span className="block text-[15.5vw] font-bold tracking-[-0.04em] text-white/[0.06] leading-[0.75] whitespace-nowrap">
              FlexTrip
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
