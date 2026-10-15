'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, Mail, ShieldCheck, HeartHandshake, PhoneCall } from 'lucide-react';
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
  const [email, setEmail] = React.useState('');
  const [subscribed, setSubscribed] = React.useState(false);
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

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <div className="w-full pt-10 sm:pt-12 lg:pt-14 pb-0 bg-transparent">
      {/* ── 1. Pre-Footer Final CTA Banner (Synchronized with HeroSection Frame) ── */}
      <section className="mb-8 sm:mb-12">
        <div
          ref={photoPanelRef}
          className="relative w-[calc(100%-16px)] sm:w-[calc(100%-20px)] mx-auto min-h-fit sm:min-h-[88svh] lg:min-h-[625px] rounded-[24px] sm:rounded-[32px] overflow-hidden flex flex-col items-center justify-center text-center p-6 sm:p-10 lg:p-14 xl:p-16 border border-black/10 shadow-2xl bg-[#0A1826]"
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
            <h2 className="text-3xl sm:text-4xl md:text-[44px] lg:text-[48px] xl:text-[50px] font-medium text-[#F5F5F0] leading-[1.1] tracking-[-0.03em] max-w-[980px] mx-auto text-center">
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
              className="mt-6 sm:mt-7 text-[15px] sm:text-base text-[#E2E8F0]/85 leading-[1.55] max-w-[560px] mx-auto text-center transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
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
              className="mt-7 sm:mt-[30px] flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-[12px] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
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
                href="/register-provider"
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

      {/* ── 2. Wayfare Deep Navy Footer (#0B1F2E Full-Width Canvas) ── */}
      <footer className="w-full bg-[#0B1F2E] text-[#A8B9C7] pt-16 sm:pt-20 lg:pt-24 pb-0 mb-0 relative overflow-hidden border-t border-white/[0.08] shadow-[0_1200px_0_1200px_#0B1F2E]">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#13C8EF]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1300px] mx-auto px-6 sm:px-10 lg:px-14 relative z-10">
          {/* ── Newsletter Header Row: 2-Column Balanced Layout ── */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 pb-12 sm:pb-16">
            <div className="max-w-xl">
              <h3 className="text-2xl sm:text-3xl lg:text-[38px] xl:text-[40px] font-medium text-[#F5F9FC] tracking-[-0.03em] leading-[1.1]">
                Nhận ưu đãi thuê đồ & cẩm nang dã ngoại mỗi tuần
              </h3>
              <p className="mt-5 text-[15px] sm:text-base text-[#A8B9C7] leading-relaxed max-w-[500px]">
                Một email tuyển chọn mỗi tháng với địa điểm camping mới, kinh nghiệm trekking và mã giảm giá độc quyền.
              </p>
            </div>

            {/* Newsletter Pill Input Form */}
            <form onSubmit={handleSubscribe} className="flex-1 max-w-md w-full">
              {subscribed ? (
                <div className="h-[54px] px-6 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center gap-2.5 text-emerald-300 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>Cảm ơn bạn! Đã đăng ký nhận bản tin thành công.</span>
                </div>
              ) : (
                <div className="flex items-center p-1.5 rounded-full bg-[#122B3D] border border-white/20 shadow-inner h-[54px] w-full">
                  <div className="flex items-center gap-2.5 px-4 flex-1 h-full min-w-0">
                    <Mail className="h-4 w-4 text-[#8295A5] shrink-0" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Nhập địa chỉ email của bạn..."
                      className="w-full bg-transparent text-sm text-[#F5F9FC] placeholder-[#8295A5] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="group h-[42px] px-5 sm:px-6 rounded-full bg-[#13C8EF] hover:brightness-110 active:scale-[0.98] text-[#0A1C2A] text-sm font-semibold inline-flex items-center gap-2 shrink-0 transition-all cursor-pointer select-none"
                  >
                    <span>Đăng ký</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* ── Divider: 100% Container, 1px, rgba(255,255,255,0.12) ── */}
          <div className="w-full h-px bg-white/[0.12] mb-12 sm:mb-16" />

          {/* ── 4-Column Navigation Links Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 pb-12 sm:pb-16">
            {/* Col 1: Brand Info (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <Link href="/" className="inline-flex items-center gap-2.5 group">
                <div className="h-9 w-9 rounded-full bg-[#13C8EF] text-[#0A1C2A] flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  <Compass className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <span className="text-2xl font-extrabold tracking-tight text-[#F5F9FC]">
                  Flex<span className="text-[#13C8EF]">Trip</span>
                </span>
              </Link>
              <p className="text-sm text-[#A8B9C7] leading-relaxed max-w-sm mt-1">
                Nền tảng chia sẻ thiết bị dã ngoại & thể thao ngoài trời uy tín hàng đầu Việt Nam. Kết nối người yêu thiên nhiên, tối ưu chi phí và lan tỏa lối sống bền vững.
              </p>
              <div className="flex items-center gap-4 mt-4 text-xs text-[#8295A5]">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#13C8EF]" /> Cọc giữ bảo đảm
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <HeartHandshake className="h-4 w-4 text-[#13C8EF]" /> Hợp đồng số
                </span>
              </div>
            </div>

            {/* Col 2: Categories (3 cols) */}
            <div className="lg:col-span-3 flex flex-col gap-3 text-sm">
              <p className="text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.05em] text-[#F5F9FC] mb-2">
                Danh mục thiết bị
              </p>
              <Link href="/search?category=CAMPING" className="text-sm text-[#A8B9C7] hover:text-[#F5F9FC] hover:translate-x-1 transition-all duration-200 inline-block">
                Lều trại & Camping
              </Link>
              <Link href="/search?category=TREKKING" className="text-sm text-[#A8B9C7] hover:text-[#F5F9FC] hover:translate-x-1 transition-all duration-200 inline-block">
                Trekking & Leo núi
              </Link>
              <Link href="/search?category=BEACH" className="text-sm text-[#A8B9C7] hover:text-[#F5F9FC] hover:translate-x-1 transition-all duration-200 inline-block">
                Thuyền SUP & Thể thao biển
              </Link>
              <Link href="/search?category=CAMERA_GEAR" className="text-sm text-[#A8B9C7] hover:text-[#F5F9FC] hover:translate-x-1 transition-all duration-200 inline-block">
                Thiết bị quay chụp (GoPro)
              </Link>
              <Link href="/search?category=TRAVEL_ESSENTIALS" className="text-sm text-[#A8B9C7] hover:text-[#F5F9FC] hover:translate-x-1 transition-all duration-200 inline-block">
                Tiện ích du lịch dã ngoại
              </Link>
              <Link href="/search?category=FAMILY" className="text-sm text-[#A8B9C7] hover:text-[#F5F9FC] hover:translate-x-1 transition-all duration-200 inline-block">
                Dụng cụ gia đình dã ngoại
              </Link>
            </div>

            {/* Col 3: Provider Hub (2.5 cols) */}
            <div className="lg:col-span-2 flex flex-col gap-3 text-sm">
              <p className="text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.05em] text-[#F5F9FC] mb-2">
                Dành cho chủ đồ
              </p>
              <Link href="/register-provider" className="text-sm text-[#A8B9C7] hover:text-[#F5F9FC] hover:translate-x-1 transition-all duration-200 inline-block">
                Trở thành Provider
              </Link>
              <Link href="/register-provider" className="text-sm text-[#A8B9C7] hover:text-[#F5F9FC] hover:translate-x-1 transition-all duration-200 inline-block">
                Quy trình cho thuê
              </Link>
              <a href="#trust" className="text-sm text-[#A8B9C7] hover:text-[#F5F9FC] hover:translate-x-1 transition-all duration-200 inline-block">
                Tiêu chuẩn kiểm định
              </a>
              <Link href="/dashboard" className="text-sm text-[#A8B9C7] hover:text-[#F5F9FC] hover:translate-x-1 transition-all duration-200 inline-block">
                Bảng quản trị Provider
              </Link>
            </div>

            {/* Col 4: Platform & Support (2.5 cols) */}
            <div className="lg:col-span-3 flex flex-col gap-3 text-sm">
              <p className="text-[12px] sm:text-[13px] font-semibold uppercase tracking-[0.05em] text-[#F5F9FC] mb-2">
                Hỗ trợ & Pháp lý
              </p>
              <a href="#how-it-works" className="text-sm text-[#A8B9C7] hover:text-[#F5F9FC] hover:translate-x-1 transition-all duration-200 inline-block">
                Cách thức hoạt động
              </a>
              <a href="#trust" className="text-sm text-[#A8B9C7] hover:text-[#F5F9FC] hover:translate-x-1 transition-all duration-200 inline-block">
                Cam kết an toàn & cọc
              </a>
              <Link href="/search" className="text-sm text-[#A8B9C7] hover:text-[#F5F9FC] hover:translate-x-1 transition-all duration-200 inline-block">
                Trung tâm trợ giúp
              </Link>
              <div className="pt-3 text-xs text-[#A8B9C7] flex items-center gap-2">
                <PhoneCall className="h-3.5 w-3.5 text-[#13C8EF]" />
                <span>Hỗ trợ kỹ thuật: <strong className="text-[#F5F9FC]">1900 6868</strong> (24/7)</span>
              </div>
            </div>
          </div>

          {/* ── Divider 2: Above Copyright Bar ── */}
          <div className="w-full h-px bg-white/[0.12] mb-8" />

          {/* ── Copyright Bar ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8295A5] pb-8 sm:pb-10">
            <p>© 2026 FlexTrip Platform. Mọi quyền được bảo lưu.</p>
            <div className="flex items-center gap-6">
              <Link href="#" className="hover:text-[#F5F9FC] transition-colors">
                Điều khoản sử dụng
              </Link>
              <Link href="#" className="hover:text-[#F5F9FC] transition-colors">
                Chính sách bảo mật
              </Link>
              <Link href="#" className="hover:text-[#F5F9FC] transition-colors">
                Quy chế bồi thường
              </Link>
            </div>
          </div>

          {/* ── Large FlexTrip Wordmark — Wayfare Style ── */}
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
