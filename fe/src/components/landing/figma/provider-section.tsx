'use client';

import * as React from 'react';
import { Calendar, Layers, Wallet } from 'lucide-react';
import { PillButton } from '@/components/ui/pill-button';
import { PillBadge } from '@/components/ui/pill-badge';

export function ProviderSection() {
  const providerFeatures = [
    {
      icon: Layers,
      title: 'Đăng đồ trong 5 phút',
      desc: 'Tải ảnh thực tế, điền thông số và mức giá mong muốn.',
    },
    {
      icon: Calendar,
      title: 'Chủ động lịch & giá thuê',
      desc: 'Toàn quyền duyệt từng đơn và kiểm soát lịch cho thuê.',
    },
    {
      icon: Wallet,
      title: 'Nhận 90% doanh thu',
      desc: 'Phí nền tảng chỉ 10%, tiền về tài khoản định kỳ sau mỗi đơn hoàn tất.',
    },
  ];

  return (
    <section className="w-full py-8 sm:py-12 scroll-mt-24" id="provider">
      <div className="relative w-[calc(100%-16px)] sm:w-[calc(100%-24px)] mx-auto rounded-[28px] sm:rounded-[36px] overflow-hidden grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-12 p-6 sm:p-10 lg:p-12 border border-sky-600 shadow-2xl bg-[#097DAE] text-white">
        {/* Background gear image overlay */}
        <img
          src="/assets/gear.jpg"
          alt="Thiết bị cắm trại cho thuê FlexTrip"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-15 mix-blend-overlay pointer-events-none"
          loading="lazy"
        />

        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-mint/20 rounded-full blur-3xl pointer-events-none" />

        {/* Content Pitch */}
        <div className="relative z-10">
          <div className="mb-4 sm:mb-5">
            <PillBadge
              variant="dark"
              dot
              dotColor="bg-brand-mint"
              className="bg-white/15 backdrop-blur-md text-white border-white/20 text-xs font-semibold px-3.5 py-1.5"
            >
              Dành cho chủ sở hữu thiết bị
            </PillBadge>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-[clamp(2rem,2.6vw+0.5rem,2.75rem)] font-extrabold text-white tracking-tight leading-[1.12]">
            Đừng để thiết bị nhàn rỗi.{' '}
            <span className="text-brand-mint">
              Nhận đến 90% doanh thu.
            </span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-sky-100 leading-relaxed font-normal">
            Biến những bộ lều trại, thuyền SUP, flycam đang cất giữ thành nguồn thu nhập thụ động bền vững. Nền tảng chỉ giữ 10% phí vận hành, bảo vệ thiết bị bằng hợp đồng số và tiền cọc an toàn.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3 sm:gap-4">
            <PillButton href="/become-provider" variant="on-dark" size="lg">
              Đăng ký trở thành chủ đồ
            </PillButton>
            <PillButton href="#how-it-works" variant="glass" size="lg">
              Xem quy trình vận hành
            </PillButton>
          </div>
        </div>

        {/* Feature pills */}
        <div className="relative z-10 grid grid-cols-1 gap-4 lg:self-center">
          {providerFeatures.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl p-4 sm:p-5 bg-white/10 backdrop-blur-md border border-white/15 flex items-start gap-3.5 hover:bg-white/15 transition-colors"
              >
                <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20 mt-0.5 text-brand-mint">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs text-sky-100 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
