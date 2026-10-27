'use client';

import Image from 'next/image';
import { Camera, ClipboardCheck, FileSignature, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Guide {
  icon: LucideIcon;
  title: string;
  body: string;
}

// Statements describe what the product does today; no refund, insurance or income promises.
const GUIDES: Guide[] = [
  {
    icon: Camera,
    title: 'Chụp ảnh đồng kiểm khi nhận đồ',
    body: 'Chụp ảnh tình trạng thiết bị và giấy tờ khi nhận đồ. Khi check-in, hệ thống yêu cầu tối thiểu 3 ảnh.',
  },
  {
    icon: ShieldCheck,
    title: 'Tiền cọc được giữ và hoàn lại thế nào?',
    body: 'Số tiền cọc của từng đơn được hiển thị trong chi tiết đơn thuê.',
  },
  {
    icon: ClipboardCheck,
    title: '5 điều cần kiểm tra trước khi thuê thiết bị',
    body: 'Đọc kỹ mô tả, hình ảnh, đánh giá, lịch trống và điều khoản trong tin đăng.',
  },
  {
    icon: FileSignature,
    title: 'Hợp đồng điện tử cho mỗi đơn',
    body: 'Mỗi đơn thuê có hợp đồng điện tử để hai bên cùng xem lại.',
  },
];

export function GuideSection() {
  return (
    <section
      aria-label="Cẩm nang thuê đồ"
      className="scroll-mt-28"
    >
      <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Cẩm nang thuê đồ</p>
      <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
        Những điều nên biết trước khi thuê
      </h2>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.1fr] lg:gap-5">
        <div className="relative min-h-[260px] overflow-hidden rounded-3xl bg-[#0A1826] lg:min-h-[420px]">
          <Image
            src="/assets/valley-camp.jpg"
            alt=""
            fill
            sizes="(min-width: 1024px) 480px, 100vw"
            className="object-cover"
          />
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:gap-5">
          {GUIDES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex min-h-[200px] flex-col justify-between rounded-3xl border border-sky-100 bg-white p-5 shadow-soft sm:p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-brand-blue">
                <Icon className="h-5 w-5" />
              </span>
              <div className="mt-6">
                <h3 className="text-lg font-bold leading-snug text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      </div>
    </section>
  );
}
