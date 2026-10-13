'use client';

import * as React from 'react';
import { ShieldCheck, FileCheck2, Camera, Scale, CheckCircle2 } from 'lucide-react';
import { PillBadge } from '@/components/ui/pill-badge';

export function TrustSection() {
  const trustFeatures = [
    {
      icon: <ShieldCheck className="h-5 w-5 text-[#00A3FF]" />,
      title: 'Bảo vệ tiền cọc qua Escrow',
      description:
        'Khoản cọc và tiền thuê được giữ an toàn trên nền tảng trung gian. Chủ đồ chỉ nhận tiền khi bạn xác nhận đã nhận đủ thiết bị đúng hiện trạng.',
    },
    {
      icon: <Camera className="h-5 w-5 text-[#00A3FF]" />,
      title: 'Biên bản & Ảnh đồng kiểm',
      description:
        'Hai bên cùng chụp ảnh đối soát hiện trạng thiết bị lúc giao và lúc nhận. Mọi vết xước cũ đều được ghi nhận minh bạch để tránh tranh chấp.',
    },
    {
      icon: <FileCheck2 className="h-5 w-5 text-[#00A3FF]" />,
      title: 'Hợp đồng điện tử ký số',
      description:
        'Tự động khởi tạo hợp đồng cho thuê điện tử với đầy đủ điều khoản bảo quản, giá thuê niêm yết và trách nhiệm bồi hoàn rõ ràng.',
    },
    {
      icon: <Scale className="h-5 w-5 text-[#00A3FF]" />,
      title: 'Trung tâm xử lý khiếu nại',
      description:
        'Đội ngũ quản trị viên đối soát bằng chứng giao nhận độc lập và xử lý giải ngân hoàn cọc khách quan nếu phát sinh tranh chấp.',
    },
  ];

  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="trust">
      {/* ── Wayfare "Always Included" 2-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        {/* ── Left Column: Large Hero Visual Card (5 cols) ── */}
        <div className="lg:col-span-5 relative min-h-[460px] sm:min-h-[540px] rounded-[36px] overflow-hidden shadow-xl border border-[#DCEFFB] bg-[#EBF7FD]">
          <img
            src="/assets/valley-camp.jpg"
            alt="Cắm trại an tâm cùng FlexTrip"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />

          {/* Subtle Ambient Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1C2A]/85 via-black/20 to-transparent" />

          {/* Top Pill Chip */}
          <div className="absolute top-6 left-6 z-10">
            <PillBadge
              variant="dark"
              dot
              dotColor="bg-[#00D8F6]"
              className="bg-black/50 backdrop-blur-md text-white border-white/20 text-xs font-semibold px-3 py-1.5"
            >
              Tiêu chuẩn an toàn nền tảng
            </PillBadge>
          </div>

          {/* Bottom Trust Floating Card */}
          <div className="absolute bottom-6 left-6 right-6 z-10 p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-white/40 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#075D82]">
              <CheckCircle2 className="h-4 w-4 text-[#00A3FF]" />
              <span>An tâm từng dặm đường</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed font-medium">
              “Thiết bị đúng ảnh mô tả, hợp đồng ký điện tử minh bạch và nhận lại tiền cọc nhanh chóng sau khi hoàn trả đồ đúng hiện trạng.”
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-bold text-[#0A1C2A]">Trải nghiệm Traveler</span>
              <span>Đà Lạt, Lâm Đồng</span>
            </div>
          </div>
        </div>

        {/* ── Right Column: Section Header & 2x2 Feature Grid (7 cols) ── */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] text-[#00A3FF] mb-3">
              AN TOÀN & MINH BẠCH
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#0A1C2A] tracking-tight leading-[1.14]">
              Biết rõ bạn thuê gì,{' '}
              <span className="bg-gradient-to-r from-[#1877F2] via-[#00A3FF] to-[#00D8F6] bg-clip-text text-transparent">
                và thuê từ ai.
              </span>
            </h2>
            <p className="mt-3.5 text-sm sm:text-base text-[#475569] leading-relaxed max-w-xl">
              FlexTrip xây dựng cơ chế bảo vệ song phương để bạn hoàn toàn yên tâm trải nghiệm thiên nhiên mà không bận tâm rủi ro tài chính hay hư hỏng ngoài ý muốn.
            </p>
          </div>

          {/* 2x2 Grid of Verified Features */}
          <div className="mt-10 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {trustFeatures.map((feat) => (
              <div
                key={feat.title}
                className="p-5 sm:p-6 rounded-2xl bg-white border border-[#DCEFFB] shadow-xs hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-10 w-10 rounded-xl bg-[#EBF7FD] flex items-center justify-center mb-3.5 shrink-0 border border-sky-100">
                    {feat.icon}
                  </div>
                  <h3 className="text-base font-bold text-[#0A1C2A] tracking-tight">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
