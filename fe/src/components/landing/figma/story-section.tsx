'use client';

import { ShieldCheck, Camera, FileCheck2, Scale, Check } from 'lucide-react';
import { PillButton } from '@/components/ui/pill-button';
import { jumpToSection } from '@/lib/scroll-to-section';
import { PromiseHeading } from './promise-strip';

const COMMITMENTS = [
  {
    icon: ShieldCheck,
    title: 'Bảo vệ cọc qua Escrow',
    desc: 'Tiền cọc được phong tỏa trung gian, chỉ giải ngân khi hai bên bàn giao thành công.',
    tag: 'Bảo vệ 100%',
  },
  {
    icon: FileCheck2,
    title: 'Hợp đồng điện tử ký số',
    desc: 'Hợp đồng thuê tự động, minh bạch điều khoản và trách nhiệm đôi bên.',
    tag: 'Pháp lý rõ ràng',
  },
  {
    icon: Camera,
    title: 'Ảnh và biên bản đồng kiểm',
    desc: 'Hai bên cùng chụp ảnh hiện trạng lúc nhận và trả, hạn chế tranh chấp.',
    tag: 'Đối soát minh bạch',
  },
  {
    icon: Scale,
    title: 'Xử lý khiếu nại khách quan',
    desc: 'Quản trị viên phân xử dựa trên bằng chứng giao nhận và hoàn cọc công bằng.',
    tag: 'Hỗ trợ 24/7',
  },
];

export function StorySection() {
  const jumpToHow = (e: React.MouseEvent) => {
    if (jumpToSection('how-it-works')) e.preventDefault();
  };

  return (
    <section className="py-10 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto" id="why-flextrip">
      <div className="mb-10 sm:mb-12 flex flex-col items-start text-left">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-100 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Tiêu chuẩn an tâm FlexTrip
        </p>
        <PromiseHeading size="display" className="text-left" />
        <p className="mt-6 max-w-xl text-sm sm:text-base text-slate-600 leading-relaxed">
          Bốn cam kết cốt lõi giúp mọi giao dịch an toàn và quyền lợi của bạn luôn được ưu tiên.
        </p>
        <PillButton href="#how-it-works" onClick={jumpToHow} size="md" className="mt-5">
          Xem cách hoạt động
        </PillButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-sky-100 rounded-3xl overflow-hidden border border-sky-100 shadow-soft">
        {COMMITMENTS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="bg-white p-6 flex flex-col gap-4 transition-colors hover:bg-sky-50/50"
            >
              <span className="h-10 w-10 rounded-full bg-sky-100 text-brand-blue flex items-center justify-center shrink-0">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold text-ink tracking-tight mb-1.5">{item.title}</h3>
                <p className="text-[13px] text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-700">
                <Check className="h-3.5 w-3.5 text-brand" strokeWidth={2.6} />
                {item.tag}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
