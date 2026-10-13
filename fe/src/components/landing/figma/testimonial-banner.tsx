'use client';

import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { PillBadge } from '@/components/ui/pill-badge';

export function TestimonialBanner() {
  const trustPillars = [
    {
      title: 'Đánh giá 2 chiều sau mỗi chuyến đi',
      desc: 'Người thuê và chủ đồ đều có quyền gửi nhận xét khách quan sau khi hoàn trả thiết bị.',
    },
    {
      title: 'Kiểm duyệt nội dung minh bạch bằng AI',
      desc: 'Hệ thống tự động phát hiện và loại bỏ các đánh giá spam hoặc ngôn từ không chuẩn mực.',
    },
    {
      title: 'Gắn liền với mã đơn thuê thực tế',
      desc: 'Chỉ những tài khoản đã đặt và nhận bàn giao đồ thành công mới đủ điều kiện để lại đánh giá.',
    },
  ];

  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="reviews">
      {/* ── Wayfare Panoramic Inset Banner Shell ── */}
      <div className="relative min-h-[480px] sm:min-h-[540px] rounded-[36px] sm:rounded-[44px] overflow-hidden flex flex-col justify-between p-6 sm:p-12 lg:p-16 border border-[#DCEFFB] shadow-xl bg-[#0B253A]">
        {/* Panoramic Background Image */}
        <img
          src="/assets/vietnam-hike.jpg"
          alt="Cộng đồng du lịch dã ngoại FlexTrip"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-35 scale-102"
          loading="lazy"
        />

        {/* Ambient Gradient Overlays for High Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#071725]/95 via-[#0A2235]/80 to-[#071725]/60" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00A3FF]/15 rounded-full blur-3xl pointer-events-none" />

        {/* ── Top Header & Headline ── */}
        <div className="relative z-10 max-w-3xl">
          <div className="mb-5 sm:mb-6">
            <PillBadge
              variant="dark"
              dot
              dotColor="bg-[#00D8F6]"
              className="bg-white/10 backdrop-blur-md text-sky-200 border-white/20 text-xs font-semibold px-3.5 py-1.5"
            >
              Niềm tin từ cộng đồng
            </PillBadge>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-[48px] font-extrabold text-white tracking-tight leading-[1.12]">
            “Hành trình tuyệt vời bắt đầu từ{' '}
            <span className="bg-gradient-to-r from-[#00D8F6] via-[#00A3FF] to-[#1877F2] bg-clip-text text-transparent">
              sự tin tưởng lẫn nhau.”
            </span>
          </h2>

          <p className="mt-5 text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed max-w-2xl font-normal">
            FlexTrip xây dựng hệ thống đánh giá thực chất — nơi uy tín của từng chủ đồ và trách nhiệm của người thuê được ghi nhận minh bạch qua mỗi chuyến đi.
          </p>
        </div>

        {/* ── Bottom 3 Trust Pillars ── */}
        <div className="relative z-10 mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 border-t border-white/15 pt-8 sm:pt-10">
          {trustPillars.map((item, idx) => (
            <div key={idx} className="flex flex-col justify-start">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-[#00D8F6] shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed pl-6">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
