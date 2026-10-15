'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

interface ActivityItem {
  id: string;
  number: string;
  title: string;
  category: string;
  description: string;
  image: string;
  ctaText: string;
}

const ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-camping',
    number: '01',
    title: 'Cắm trại rừng sâu & Glamping',
    category: 'CAMPING',
    description:
      'Lều trại chống mưa gió, đệm cách nhiệt, bếp dã ngoại và đèn bão chuyên dụng — đủ đầy tiện nghi cho những đêm thư thái giữa rừng.',
    image: '/assets/camping.jpg',
    ctaText: 'Xem thiết bị cắm trại',
  },
  {
    id: 'act-trekking',
    number: '02',
    title: 'Trekking & Chinh phục đỉnh cao',
    category: 'TREKKING',
    description:
      'Balo trợ lực phân bổ tải trọng thông minh, gậy leo núi carbon siêu nhẹ và phụ kiện bảo hộ đôi chân qua từng cung đường hiểm trở.',
    image: '/assets/vietnam-hike.jpg',
    ctaText: 'Xem thiết bị leo núi',
  },
  {
    id: 'act-beach',
    number: '03',
    title: 'Chèo SUP & Thể thao mặt nước',
    category: 'BEACH',
    description:
      'Thuyền SUP bơm hơi dẻo dai, kayak đôi, mái chèo trợ lực và áo phao đạt chuẩn an toàn cho những hành trình lướt sóng, vượt hồ.',
    image: '/assets/kayak.jpg',
    ctaText: 'Xem đồ thể thao nước',
  },
  {
    id: 'act-camera',
    number: '04',
    title: 'Flycam & Nhiếp ảnh ngoại cảnh',
    category: 'CAMERA_GEAR',
    description:
      'Flycam quay 4K, GoPro chống rung siêu mượt, ống kính góc rộng và pin dự phòng sẵn sàng lưu giữ những góc nhìn hùng vĩ nhất.',
    image: '/assets/camera.jpg',
    ctaText: 'Xem máy ảnh & flycam',
  },
];

export function DarkAccordionSection() {
  const router = useRouter();
  const [activeId, setActiveId] = React.useState<string>('act-camping');
  const [previousImage, setPreviousImage] = React.useState<string>(ACTIVITIES[0].image);
  const [hasInteracted, setHasInteracted] = React.useState<boolean>(false);

  const activeActivity =
    ACTIVITIES.find((a) => a.id === activeId) || ACTIVITIES[0];

  const handleActivate = React.useCallback(
    (id: string) => {
      if (id === activeId) return;
      const current = ACTIVITIES.find((a) => a.id === activeId);
      if (current) {
        setPreviousImage(current.image);
      }
      setHasInteracted(true);
      setActiveId(id);
    },
    [activeId]
  );

  const handleClick = (act: ActivityItem) => {
    if (activeId === act.id) {
      router.push(`/search?category=${act.category}`);
    } else {
      handleActivate(act.id);
    }
  };

  return (
    <section className="w-full py-8 sm:py-10 lg:py-12" id="experiences">
      {/* ── Keyframe styles for Wayfare Hover Slider reveal animations ── */}
      <style>{`
        @keyframes wayfareClipReveal {
          0% {
            clip-path: inset(100% 0% 0% 0%);
          }
          100% {
            clip-path: inset(0% 0% 0% 0%);
          }
        }
        @keyframes wayfareScaleReveal {
          0% {
            transform: scale(1.12);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes wayfareCaptionIn {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .wayfare-reveal-slide {
          animation: wayfareClipReveal 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: clip-path;
        }
        .wayfare-reveal-img {
          animation: wayfareScaleReveal 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          will-change: transform;
        }
        .wayfare-caption-anim {
          animation: wayfareCaptionIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      {/* Preload images to guarantee instant hover transitions */}
      <div className="hidden" aria-hidden="true">
        {ACTIVITIES.map((act) => (
          <img key={act.id} src={act.image} alt="" />
        ))}
      </div>

      {/* ── Wayfare Rounded Container Shell (Max-width 1300px) ── */}
      <div className="w-[calc(100%-16px)] sm:w-[calc(100%-20px)] mx-auto max-w-[1300px] rounded-[28px] sm:rounded-[36px] bg-[#0A1826] border border-slate-800 p-6 sm:p-10 lg:p-12 xl:p-14 shadow-2xl relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#00A3FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#00D8F6]/10 rounded-full blur-3xl pointer-events-none" />

        {/* ── Section Header (Wayfare WAYS TO TRAVEL: Left Title 68%, Right Desc 32%, Gap 56px) ── */}
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 lg:gap-[56px] mb-10 sm:mb-12 lg:mb-[56px] relative z-10">
          {/* Left Column: Eyebrow + Single-line Title (65–70%) */}
          <div className="w-full lg:w-[68%] flex flex-col">
            {/* Eyebrow: 12–13px, uppercase, 20–24px gap to heading */}
            <p className="text-[12px] sm:text-[13px] font-medium uppercase tracking-[0.08em] text-slate-400 mb-5 sm:mb-6">
              Hành trình outdoor tuyển chọn
            </p>
            {/* Heading: 36–40px desktop, font-medium, leading 1.05–1.1, tracking -0.03em, uniform white, single line on desktop */}
            <h2 className="text-2xl sm:text-3xl lg:text-[38px] xl:text-[40px] font-medium text-white tracking-[-0.03em] leading-[1.08]">
              Trang bị cho mọi hành trình
            </h2>
          </div>

          {/* Right Column: Description (30–35%), near-level with heading */}
          <div className="w-full lg:w-[32%] lg:max-w-[380px] shrink-0 lg:pb-1">
            <p className="text-[15px] sm:text-base text-slate-300/80 leading-[1.5] font-normal">
              Chọn thể loại dã ngoại bạn yêu thích để khám phá những món đồ được chuẩn bị chuyên biệt cho địa hình tương ứng.
            </p>
          </div>
        </div>

        {/* ── 2-Column Wayfare Hover Slider Layout (72px gap on desktop) ── */}
        <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-8 lg:gap-[72px] relative z-10">
          {/* ── Left Column: Large Image Frame (42% width, aspect 4/5, rounded 24px) ── */}
          <div className="w-full lg:w-[42%] aspect-[4/5] rounded-[24px] overflow-hidden relative shadow-2xl shrink-0 border border-white/10 bg-slate-900">
            {/* Base Image Layer (holds previous image so there is never a blank flash) */}
            <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
              <img
                src={previousImage}
                alt="Previous experience"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Active Reveal Image Layer (clip-path reveal 0.9s + scale 1.12 to 1 1.4s) */}
            <div
              key={activeId}
              className={`absolute inset-0 w-full h-full z-10 pointer-events-none ${
                hasInteracted ? 'wayfare-reveal-slide' : ''
              }`}
              style={
                !hasInteracted
                  ? {
                      clipPath: 'inset(0% 0% 0% 0%)',
                      transform: 'scale(1)',
                    }
                  : undefined
              }
            >
              <img
                src={activeActivity.image}
                alt={activeActivity.title}
                className={`w-full h-full object-cover ${
                  hasInteracted ? 'wayfare-reveal-img' : ''
                }`}
                style={!hasInteracted ? { transform: 'scale(1)' } : undefined}
              />
            </div>

            {/* Bottom Dark Gradient for Caption Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent pointer-events-none z-20" />

            {/* Bottom Caption (Fade-in + translateY(8px) to 0 in 0.6s) */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-30 pointer-events-auto">
              <div key={activeId} className="wayfare-caption-anim">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] sm:text-xs font-bold text-[#00D8F6] tracking-wider uppercase">
                    {activeActivity.number} · {activeActivity.category}
                  </span>
                </div>
                <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal line-clamp-3 mb-4">
                  {activeActivity.description}
                </p>
                <Link
                  href={`/search?category=${activeActivity.category}`}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#00D8F6] hover:text-white transition-colors group/cta"
                >
                  <span>{activeActivity.ctaText}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Right Column: Categories Typography List (58% width, no card accordion) ── */}
          <div className="w-full lg:w-[58%] flex flex-col justify-center">
            <div className="border-t border-b border-white/10 divide-y divide-white/10">
              {ACTIVITIES.map((act) => {
                const isActive = act.id === activeId;

                return (
                  <div
                    key={act.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleClick(act)}
                    onMouseEnter={() => handleActivate(act.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClick(act);
                      }
                    }}
                    className="group py-5 sm:py-6 lg:py-[26px] flex items-center cursor-pointer select-none transition-colors"
                  >
                    {/* Index Number Column (36px wide) */}
                    <span
                      className={`w-[36px] shrink-0 text-sm sm:text-base font-semibold transition-colors duration-500 ${
                        isActive ? 'text-[#00D8F6]' : 'text-white/30'
                      }`}
                    >
                      {act.number}
                    </span>

                    {/* Gap between Number and Title: 28px on desktop (lg:ml-[28px]) */}
                    <div className="flex-1 min-w-0 ml-5 sm:ml-6 lg:ml-[28px] flex items-center justify-between gap-4">
                      {/* Category Name: 46px on desktop, 500 weight, 1.05 leading, -0.03em letter-spacing */}
                      <h3
                        className={`text-2xl sm:text-3xl md:text-4xl lg:text-[40px] xl:text-[46px] font-medium leading-[1.05] tracking-[-0.03em] ${
                          isActive
                            ? 'text-white translate-x-[14px]'
                            : 'text-white/35 translate-x-0 group-hover:text-white/60'
                        }`}
                        style={{
                          transition:
                            'color 0.5s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                      >
                        {act.title}
                      </h3>

                      {/* Subtle Arrow Indicator */}
                      <ArrowRight
                        className={`h-5 w-5 shrink-0 transition-all duration-500 hidden sm:block ${
                          isActive
                            ? 'text-[#00D8F6] opacity-100 translate-x-0'
                            : 'text-white/20 opacity-0 -translate-x-2 group-hover:opacity-40'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
