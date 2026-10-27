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
      'Lều trại chống mưa bão, đệm cách nhiệt, bếp dã ngoại và đèn bão chuyên dụng — đủ đầy tiện nghi cho những đêm thư thái giữa rừng.',
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
      <style>{`
        @keyframes wayfareClipReveal {
          0% {
            clip-path: inset(100% 0% 0% 0%);
          }
          100% {
            clip-path: inset(0% 0% 0% 0%);
          }
        }
        @keyframes wayfareScaleDown {
          0% {
            transform: scale(1.08);
          }
          100% {
            transform: scale(1.0);
          }
        }
        .wayfare-reveal-slide {
          animation: wayfareClipReveal 0.65s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          will-change: clip-path;
        }
        .wayfare-reveal-img {
          animation: wayfareScaleDown 0.75s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          will-change: transform;
        }
      `}</style>

      <div className="relative w-[calc(100%-16px)] sm:w-[calc(100%-24px)] mx-auto rounded-[28px] sm:rounded-[36px] overflow-hidden bg-ink text-white p-6 sm:p-10 lg:p-12 xl:p-14 border border-slate-800 shadow-2xl">
        <div className="mb-8 sm:mb-12">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] text-brand-mint mb-2">
            HOẠT ĐỘNG NGOẠI CẢNH
          </p>
          <h2 className="text-2xl sm:text-4xl lg:text-[clamp(1.75rem,1.6vw+1rem,2.5rem)] font-extrabold tracking-tight text-white leading-tight">
            Chọn địa hình, khớp ngay thiết bị
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col divide-y divide-slate-800">
            {ACTIVITIES.map((act) => {
              const isActive = act.id === activeId;
              return (
                <div
                  key={act.id}
                  onClick={() => handleClick(act)}
                  onMouseEnter={() => handleActivate(act.id)}
                  className={`py-5 sm:py-6 cursor-pointer transition-colors group ${
                    isActive ? 'opacity-100' : 'opacity-60 hover:opacity-90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-brand-mint">{act.number}</span>
                      <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-brand-mint transition-colors">
                        {act.title}
                      </h3>
                    </div>
                    <ArrowRight
                      className={`h-4 w-4 transition-transform duration-300 ${
                        isActive ? 'rotate-0 text-brand-mint' : '-rotate-45 text-slate-500'
                      }`}
                    />
                  </div>

                  {isActive && (
                    <div className="mt-3.5 pl-8 sm:pl-9 animate-in fade-in duration-200">
                      <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                        {act.description}
                      </p>
                      <Link
                        href={`/search?category=${act.category}`}
                        className="inline-flex items-center gap-2 mt-4 text-xs font-bold text-brand-mint hover:underline"
                      >
                        <span>{act.ctaText}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-5 relative aspect-[4/3] lg:aspect-[4/5] rounded-3xl overflow-hidden shadow-xl border border-white/10 bg-slate-900">
            <img
              src={previousImage}
              alt="Previous activity background"
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div
              key={activeActivity.id}
              className={`absolute inset-0 h-full w-full ${hasInteracted ? 'wayfare-reveal-slide' : ''}`}
            >
              <img
                src={activeActivity.image}
                alt={activeActivity.title}
                className={`h-full w-full object-cover ${hasInteracted ? 'wayfare-reveal-img' : ''}`}
                style={!hasInteracted ? { transform: 'scale(1)' } : undefined}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-mint bg-black/50 px-2.5 py-1 rounded-full border border-white/15 backdrop-blur-md">
                  {activeActivity.category}
                </span>
                <p className="text-white text-sm font-semibold mt-2 drop-shadow-sm">
                  {activeActivity.title}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
