'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function HowSection() {
  const steps = [
    {
      number: '01',
      title: 'Chọn đồ & Thanh toán giữ cọc',
      description:
        'Tìm thiết bị ưng ý gần nơi bạn xuất phát. Toàn bộ tiền thuê và tiền cọc được giữ an toàn tại cơ chế Escrow của nền tảng — chủ đồ chỉ nhận thanh toán khi bạn đã nhận đủ đồ.',
    },
    {
      number: '02',
      title: 'Đồng kiểm & Ký hợp đồng số',
      description:
        'Gặp mặt bàn giao hoặc nhận qua đơn vị vận chuyển. Hai bên cùng chụp ảnh kiểm tra hiện trạng thiết bị và xác nhận hợp đồng điện tử có giá trị pháp lý minh bạch.',
    },
    {
      number: '03',
      title: 'Trải nghiệm & Hoàn trả cọc',
      description:
        'Tận hưởng trọn vẹn chuyến dã ngoại. Sau khi trả đồ và hai bên xác nhận tình trạng bình thường, tiền cọc được hoàn trả tự động theo đúng điều khoản cam kết.',
    },
  ];

  return (
    <section className="py-14 sm:py-18 lg:py-[84px] px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto" id="how-it-works">
      {/* ── Wayfare 2-Column Layout: Left Image (40%), Right Content (55%), Gap 64–72px ── */}
      <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-[68px]">
        {/* ── Left Column: Clean Vertical Image Frame (Aspect 4:5, Rounded 24px) ── */}
        <div className="w-full lg:w-[40%] shrink-0">
          <div className="w-full aspect-[4/5] rounded-[24px] overflow-hidden shadow-lg border border-[#DCEFFB]/70 bg-slate-100 relative">
            <img
              src="/assets/adventure.jpg"
              alt="Trải nghiệm cắm trại và thuê thiết bị FlexTrip"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        {/* ── Right Column: Eyebrow + Heading + 3 Flat Step Rows + Thin Pill CTA ── */}
        <div className="w-full lg:w-[55%] flex-1 flex flex-col">
          {/* Eyebrow */}
          <p className="text-[12px] sm:text-[13px] font-medium uppercase tracking-[0.08em] text-slate-500 mb-3 sm:mb-4">
            QUY TRÌNH THUÊ THIẾT BỊ
          </p>

          {/* Heading: 36–40px desktop, font-medium, leading 1.1, tracking -0.03em, navy #0A1C2A, 2 natural lines */}
          <h2 className="text-2xl sm:text-3xl lg:text-[38px] xl:text-[40px] font-medium text-[#0A1C2A] tracking-[-0.03em] leading-[1.1] max-w-[480px]">
            Đơn giản 3 bước, sẵn sàng lên đường.
          </h2>

          {/* 3 Step Flat Rows with Thin Dividers */}
          <div className="mt-8 sm:mt-10 lg:mt-12 border-t border-b border-slate-200/80 divide-y divide-slate-200/80">
            {steps.map((step) => (
              <div
                key={step.number}
                className="py-6 sm:py-[26px] flex items-start gap-6 sm:gap-8 lg:gap-[32px]"
              >
                {/* Step Number Column: 22–24px, font-normal, navy */}
                <span className="w-[36px] shrink-0 text-[22px] sm:text-[24px] font-normal text-[#0A1C2A] leading-tight">
                  {step.number}
                </span>

                {/* Content Column */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[17px] sm:text-[18px] font-semibold text-[#0A1C2A] leading-snug mb-1.5">
                    {step.title}
                  </h3>
                  <p className="text-sm sm:text-[15px] text-slate-600 leading-[1.5]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Actions: Thin Pill Bordered Button + Secondary Link */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-5 sm:gap-6">
            <Link
              href="/search"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white border border-[#0A1C2A]/25 hover:border-[#0A1C2A] text-[#0A1C2A] text-sm font-medium hover:bg-slate-50 shadow-xs hover:shadow-sm active:scale-[0.98] active:bg-[#EBF7FD] transition-all group"
            >
              <span>Bắt đầu tìm thiết bị</span>
              <ArrowRight className="h-4 w-4 text-[#0A1C2A] transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/register-provider"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0A1C2A] transition-colors"
            >
              <span>Cho thuê thiết bị nhàn rỗi</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
