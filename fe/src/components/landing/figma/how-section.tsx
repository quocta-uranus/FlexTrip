'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PillButton } from '@/components/ui/pill-button';

export function HowSection() {
  const steps = [
    {
      number: '01',
      title: 'Chọn đồ và thanh toán giữ cọc',
      description:
        'Tìm thiết bị gần nơi bạn xuất phát. Tiền thuê và tiền cọc được giữ an toàn bằng escrow, chủ đồ chỉ nhận tiền khi bạn đã nhận đủ đồ.',
    },
    {
      number: '02',
      title: 'Đồng kiểm và ký hợp đồng số',
      description:
        'Nhận đồ trực tiếp hoặc qua đơn vị vận chuyển. Hai bên cùng chụp ảnh hiện trạng và ký hợp đồng điện tử có giá trị pháp lý.',
    },
    {
      number: '03',
      title: 'Trải nghiệm và hoàn trả cọc',
      description:
        'Tận hưởng chuyến đi. Sau khi trả đồ và hai bên xác nhận tình trạng bình thường, tiền cọc được hoàn tự động theo điều khoản.',
    },
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto scroll-mt-24" id="how-it-works">
      <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-14">
        {/* Left Column: Image Frame */}
        <div className="w-full lg:w-[40%] shrink-0">
          <div className="w-full aspect-[4/5] rounded-[24px] overflow-hidden border border-sky-100 bg-slate-100 relative">
            <img
              src="/assets/adventure.jpg"
              alt="Trải nghiệm cắm trại và thuê thiết bị FlexTrip"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        {/* Right Column: Steps */}
        <div className="w-full lg:w-[60%] flex-1 flex flex-col">
          <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.14em] text-slate-500 mb-3">
            Quy trình thuê thiết bị
          </p>

          <h2 className="text-[clamp(1.75rem,2.2vw+1rem,2.75rem)] font-semibold text-ink tracking-[-0.03em] leading-[1.1] max-w-xl">
            Từ ý tưởng đến balo sẵn sàng chỉ trong ba bước
          </h2>

          <div className="mt-8 sm:mt-10 border-t border-sky-100 divide-y divide-sky-100">
            {steps.map((step) => (
              <div key={step.number} className="py-5 sm:py-6 flex items-start gap-5 sm:gap-8">
                <span className="w-9 shrink-0 text-lg sm:text-xl font-medium text-slate-400 tabular-nums">
                  {step.number}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-[17px] font-semibold text-ink tracking-tight leading-snug mb-1.5">
                    {step.title}
                  </h3>
                  <p className="text-[13px] sm:text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4 sm:gap-6">
            <PillButton href="/search" size="md">
              Bắt đầu tìm thiết bị
            </PillButton>

            <Link
              href="/become-provider"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-brand transition-colors"
            >
              <span>Cho thuê thiết bị nhàn rỗi</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
