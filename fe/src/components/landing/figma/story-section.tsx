'use client';

import * as React from 'react';
import { Star, ShieldCheck, CheckCircle2, Camera, FileCheck2, Scale } from 'lucide-react';
import { PillButton } from '@/components/ui/pill-button';
import { PillBadge } from '@/components/ui/pill-badge';

export function StorySection() {
  const trustStandards = [
    {
      icon: <ShieldCheck className="h-4 w-4 text-[#00A3FF]" />,
      title: 'Bảo vệ cọc qua Escrow',
      desc: 'Tiền cọc giữ trung gian an toàn, chỉ giải ngân khi bạn nhận đủ đồ.',
    },
    {
      icon: <Camera className="h-4 w-4 text-[#00A3FF]" />,
      title: 'Biên bản & Ảnh đồng kiểm',
      desc: 'Chụp ảnh đối soát hiện trạng hai bên để tránh mọi tranh chấp phát sinh.',
    },
    {
      icon: <FileCheck2 className="h-4 w-4 text-[#00A3FF]" />,
      title: 'Hợp đồng điện tử ký số',
      desc: 'Hợp đồng thuê số tự động có giá trị pháp lý và điều khoản bồi thường rõ ràng.',
    },
    {
      icon: <Scale className="h-4 w-4 text-[#00A3FF]" />,
      title: 'Xử lý khiếu nại khách quan',
      desc: 'Admin đối soát bằng chứng giao nhận độc lập và hoàn cọc minh bạch.',
    },
  ];

  return (
    <section className="pt-2 sm:pt-4 lg:pt-6 pb-10 sm:pb-12 lg:pb-[44px] px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto" id="why-flextrip">
      {/* ── Wayfare Asymmetric 3-Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* ── Column 1: Story Content & Social Proof (4 cols) ── */}
        <div className="lg:col-span-4 flex flex-col justify-between p-2 sm:p-4">
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] text-[#00A3FF] mb-3">
              VÌ SAO CHỌN FLEXTRIP
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#0A1C2A] tracking-tight leading-[1.12]">
              Gọn ghẽ hành trang. <br />
              <span className="bg-gradient-to-r from-[#1877F2] via-[#00A3FF] to-[#00D8F6] bg-clip-text text-transparent">
                Bền vững trải nghiệm.
              </span>
            </h2>
            <p className="mt-5 text-sm sm:text-base text-[#475569] leading-relaxed">
              Thiết bị chỉ là phương tiện, hành trình mới là điều ở lại. FlexTrip giúp bạn tiếp cận mọi món đồ dã ngoại chất lượng cao cho từng chuyến đi mà không cần mua sắm tốn kém hay lo lắng cất giữ chật chội.
            </p>

            <div className="mt-7">
              <PillButton href="#how-it-works" variant="brand" size="md">
                Tìm hiểu cách hoạt động
              </PillButton>
            </div>
          </div>

          {/* Social proof verified review standard */}
          <div className="mt-8 pt-6 border-t border-slate-200/80 flex items-center gap-3.5">
            <div className="flex -space-x-2 overflow-hidden">
              <div className="inline-block h-9 w-9 rounded-full ring-2 ring-white bg-[#00A3FF] text-white text-xs font-bold flex items-center justify-center">
                HN
              </div>
              <div className="inline-block h-9 w-9 rounded-full ring-2 ring-white bg-[#1877F2] text-white text-xs font-bold flex items-center justify-center">
                QT
              </div>
              <div className="inline-block h-9 w-9 rounded-full ring-2 ring-white bg-[#075D82] text-white text-xs font-bold flex items-center justify-center">
                LH
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[#F4B942]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
                <span className="text-xs font-bold text-[#0A1C2A] ml-0.5">Đánh giá thực tế</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">100% từ người thuê sau khi hoàn tất đơn</p>
            </div>
          </div>
        </div>

        {/* ── Column 2: Portrait Vertical Image Card (4 cols) ── */}
        <div className="lg:col-span-4 relative min-h-[440px] sm:min-h-[500px] rounded-[32px] overflow-hidden shadow-lg border border-[#DCEFFB] group">
          <img
            src="/assets/vietnam-hike.jpg"
            alt="Những người bạn leo núi cùng FlexTrip"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

          {/* Floating Pill on bottom of photo */}
          <div className="absolute bottom-6 left-6 right-6 z-10">
            <PillBadge variant="dark" dot className="bg-black/60 backdrop-blur-md text-white border-white/20">
              🌲 Chinh phục thiên nhiên Việt Nam
            </PillBadge>
            <p className="text-white text-xs mt-2 font-medium leading-relaxed drop-shadow-sm">
              Đồng hành cùng các chuyến trekking, camping và chèo SUP của cộng đồng outdoor.
            </p>
          </div>
        </div>

        {/* ── Column 3: Trust & Safety Standards Card (Merged from TrustSection) (4 cols) ── */}
        <div className="lg:col-span-4 rounded-[32px] bg-white border border-[#DCEFFB] p-6 sm:p-7 flex flex-col shadow-xs">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
            <span className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-[#075D82]">
              Tiêu chuẩn an toàn FlexTrip
            </span>
            <ShieldCheck className="h-4.5 w-4.5 text-[#00A3FF]" />
          </div>

          {/* 4 Evenly-Distributed Standards Rows (Wayfare style, balanced vertical rhythm) */}
          <div className="flex-1 flex flex-col divide-y divide-slate-100 py-1 sm:py-2">
            {trustStandards.map((item) => (
              <div key={item.title} className="flex-1 flex items-center gap-3.5 py-3.5 sm:py-4">
                <div className="h-9 w-9 rounded-xl bg-[#EBF7FD] flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-[#0A1C2A] tracking-tight">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Card Guarantee Notice */}
          <div className="mt-2 pt-3.5 border-t border-slate-100 shrink-0 flex items-start gap-3 text-xs text-slate-600 bg-[#F1FAFF] p-3.5 sm:p-4 rounded-2xl">
            <CheckCircle2 className="h-4 w-4 text-[#00A3FF] shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Mọi thiết bị đều được đối soát hiện trạng và ký kết hợp đồng số trước khi giao nhận.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
