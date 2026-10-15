'use client';

import * as React from 'react';
import { Calendar, Layers, Wallet } from 'lucide-react';
import { PillButton } from '@/components/ui/pill-button';
import { PillBadge } from '@/components/ui/pill-badge';

export function ProviderSection() {
  const providerFeatures = [
    {
      icon: <Layers className="h-5 w-5 text-[#00D8F6]" />,
      title: 'Đăng thiết bị trong 5 phút',
      desc: 'Điền thông tin đồ dùng, tải ảnh thực tế và cài đặt sẵn sàng nhận yêu cầu thuê.',
    },
    {
      icon: <Calendar className="h-5 w-5 text-[#00D8F6]" />,
      title: 'Toàn quyền đặt giá & lịch',
      desc: 'Bạn tự quyết định mức giá theo ngày, số lượng đồ sẵn sàng và duyệt từng đơn thuê.',
    },
    {
      icon: <Wallet className="h-5 w-5 text-[#00D8F6]" />,
      title: 'Giải ngân trực tiếp & minh bạch',
      desc: 'Tiền thuê được chuyển về tài khoản của bạn sau khi hoàn tất đơn bàn giao.',
    },
  ];

  return (
    <section className="w-full py-8 sm:py-10 lg:py-12" id="provider">
      {/* ── Wayfare Inset Dark Card Shell (Quote Window Inset 10px Margin) ── */}
      <div className="relative w-[calc(100%-16px)] sm:w-[calc(100%-20px)] mx-auto min-h-[460px] sm:min-h-[500px] lg:min-h-[540px] rounded-[28px] sm:rounded-[36px] overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-14 border border-slate-800 shadow-2xl bg-[#0A1826]">
        {/* Background Image */}
        <img
          src="/assets/gear.jpg"
          alt="Thiết bị cắm trại cho thuê FlexTrip"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-25"
          loading="lazy"
        />

        {/* Ambient Dark Cyan Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#07131F]/98 via-[#0A1C2A]/90 to-[#07131F]/70" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00A3FF]/15 rounded-full blur-3xl pointer-events-none" />

        {/* ── Top Header & Pitch ── */}
        <div className="relative z-10 max-w-2xl">
          <div className="mb-4 sm:mb-5">
            <PillBadge
              variant="dark"
              dot
              dotColor="bg-[#00D8F6]"
              className="bg-white/10 backdrop-blur-md text-sky-200 border-white/15 text-xs font-semibold px-3.5 py-1.5"
            >
              Dành cho chủ sở hữu thiết bị
            </PillBadge>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold text-white tracking-tight leading-[1.14]">
            Đừng để thiết bị nhàn rỗi.{' '}
            <span className="bg-gradient-to-r from-[#00D8F6] via-[#00A3FF] to-[#1877F2] bg-clip-text text-transparent">
              Hãy để nó lên đường.
            </span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            Biến những bộ lều trại, thuyền SUP, flycam đang cất giữ thành nguồn thu hữu ích. Quy trình đăng ký đơn giản, kiểm soát lịch dễ dàng.
          </p>

          {/* CTA Buttons */}
          <div className="mt-7 flex flex-wrap items-center gap-3 sm:gap-4">
            <PillButton href="/register-provider" variant="brand" size="lg">
              Đăng ký trở thành chủ đồ
            </PillButton>
            <PillButton
              href="#how-it-works"
              variant="ghost"
              size="lg"
              className="text-white border-white/20 hover:bg-white/10"
            >
              Xem quy trình thuê
            </PillButton>
          </div>
        </div>

        {/* ── Bottom 3 Pillars (Condensed & Focused on Host Operations) ── */}
        <div className="relative z-10 mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {providerFeatures.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl p-4 sm:p-5 bg-white/5 backdrop-blur-md border border-white/10 flex items-start gap-3.5 hover:bg-white/10 transition-colors"
            >
              <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 mt-0.5">
                {item.icon}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
