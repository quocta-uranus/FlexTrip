'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PillBadge } from '@/components/ui/pill-badge';

const FIELD_NOTES = [
  {
    image: '/assets/travel-kit.jpg',
    tag: 'Cắm trại',
    category: 'CAMPING',
    title: 'Checklist đồ dã ngoại chuẩn bị cho chuyến cắm trại đêm đầu tiên',
    description: 'Từ loại lều chống nước, đệm cách nhiệt đến đèn pin sinh hoạt — trọn bộ danh sách không thể thiếu.',
    ctaText: 'Khám phá thiết bị liên quan',
  },
  {
    image: '/assets/backpack.jpg',
    tag: 'Leo núi',
    category: 'TREKKING',
    title: 'Bí quyết chọn balo trợ lực và gậy trekking cho cung đường dài',
    description: 'Cách phân bổ tải trọng hợp lý, chỉnh quai đệm và sử dụng gậy đôi để bảo vệ khớp gối khi leo dốc.',
    ctaText: 'Khám phá thiết bị liên quan',
  },
  {
    image: '/assets/camera.jpg',
    tag: 'Quay chụp',
    category: 'CAMERA_GEAR',
    title: 'Kinh nghiệm bảo quản GoPro và flycam khi khám phá vùng biển, thác suối',
    description: 'Quy tắc chống ẩm, túi chống nước chuyên dụng và cách kiểm tra thiết bị an toàn trước khi bay.',
    ctaText: 'Khám phá thiết bị liên quan',
  },
];

export function JournalSection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="journal">
      {/* ── Wayfare Section Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 sm:mb-14">
        <div className="max-w-2xl">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] text-[#00A3FF] mb-3">
            CẨM NANG & GỢI Ý HÀNH TRÌNH
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-[#0A1C2A] tracking-tight leading-[1.14]">
            Chuẩn bị kỹ lưỡng,{' '}
            <span className="bg-gradient-to-r from-[#1877F2] via-[#00A3FF] to-[#00D8F6] bg-clip-text text-transparent">
              trọn vẹn từng dặm xa.
            </span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#475569] leading-relaxed">
            Kinh nghiệm thực tế từ cộng đồng outdoor giúp bạn chọn đúng món đồ cần thiết cho từng loại địa hình.
          </p>
        </div>

        {/* View All Listings CTA */}
        <div className="shrink-0">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#075D82] hover:text-[#00A3FF] transition-colors group"
          >
            <span>Khám phá kho thiết bị</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      {/* ── 3 Field Notes Cards (Wayfare Style) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {FIELD_NOTES.map((note) => (
          <article
            key={note.title}
            className="group bg-white rounded-[32px] overflow-hidden border border-[#DCEFFB] shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col"
          >
            {/* Card Image */}
            <Link
              href={`/search?category=${note.category}`}
              className="relative aspect-[16/10] overflow-hidden block bg-slate-100"
            >
              <img
                src={note.image}
                alt={note.title}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

              {/* Tag Pill on Image */}
              <div className="absolute top-4 left-4 z-10">
                <PillBadge
                  variant="dark"
                  className="bg-black/50 backdrop-blur-md text-white border-white/20 text-xs font-semibold py-1 px-3 shadow-xs"
                >
                  {note.tag}
                </PillBadge>
              </div>
            </Link>

            {/* Card Body */}
            <div className="p-6 flex flex-col flex-1">
              <Link
                href={`/search?category=${note.category}`}
                className="group-hover:text-[#00A3FF] transition-colors"
              >
                <h3 className="text-lg sm:text-xl font-bold text-[#0A1C2A] leading-snug line-clamp-2 tracking-tight">
                  {note.title}
                </h3>
              </Link>

              <p className="mt-2.5 text-xs sm:text-sm text-slate-500 leading-relaxed line-clamp-2">
                {note.description}
              </p>

              {/* Bottom Card Action */}
              <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/search?category=${note.category}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#075D82] group-hover:text-[#00A3FF] transition-colors"
                >
                  <span>{note.ctaText}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <span className="text-[11px] text-slate-400 font-medium">Gợi ý thiết bị</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
