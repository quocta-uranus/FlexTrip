'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, Tag } from 'lucide-react';
import { useSearchStore } from '@/store/search.store';
import type { ListingCategory } from '@/types/listing';

const CATEGORIES: Array<{ value: '' | ListingCategory; label: string }> = [
  { value: '', label: 'Tất cả' },
  { value: 'CAMPING_TREKKING', label: 'Cắm trại & Trekking' },
  { value: 'VEHICLE', label: 'Phương tiện' },
  { value: 'STAY', label: 'Chỗ ở' },
  { value: 'EXPERIENCE', label: 'Trải nghiệm' },
  { value: 'OTHER', label: 'Khác' },
];

const QUICK_PICKS: Array<{ label: string; keyword: string; category?: ListingCategory }> = [
  { label: 'Lều cắm trại', keyword: 'lều cắm trại', category: 'CAMPING_TREKKING' },
  { label: 'Xe đạp leo núi', keyword: 'xe đạp', category: 'VEHICLE' },
  { label: 'Kayak', keyword: 'kayak' },
  { label: 'Máy ảnh DSLR', keyword: 'máy ảnh' },
];

export function HeroSearch() {
  const router = useRouter();
  const { setFilters, resetFilters } = useSearchStore();

  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [category, setCategory] = useState<'' | ListingCategory>('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    resetFilters();
    setFilters({ keyword, location, dateFrom, dateTo, category, page: 1 });
    router.push('/search');
  }

  function applyQuickPick(pick: (typeof QUICK_PICKS)[number]) {
    resetFilters();
    setFilters({ keyword: pick.keyword, category: pick.category ?? '', page: 1 });
    router.push('/search');
  }

  return (
    <form onSubmit={handleSearch} className="w-full max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row bg-white rounded-2xl shadow-2xl shadow-[#2A7BD9]/20 overflow-hidden border border-white/60 dark:bg-[#121A2C] dark:text-white dark:border-white/10">
        {/* Keyword */}
        <div className="flex items-center gap-2.5 px-4 py-4 flex-1 border-b sm:border-b-0 sm:border-r border-[#DCEFFB]">
          <Search className="h-4 w-4 text-[#2A7BD9] shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2A7BD9] mb-0.5">
              Tìm kiếm
            </span>
            <input
              type="text"
              placeholder="Lều, kayak, máy ảnh…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="text-sm outline-none placeholder:text-[#5B7A93]/70 text-[#0E2233] bg-transparent w-full"
            />
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b sm:border-b-0 sm:border-r border-[#DCEFFB]">
          <MapPin className="h-4 w-4 text-[#2A7BD9] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2A7BD9] mb-0.5">
              Địa điểm
            </span>
            <input
              type="text"
              placeholder="Đà Lạt, Hội An…"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="text-sm outline-none placeholder:text-[#5B7A93]/70 text-[#0E2233] bg-transparent w-28"
            />
          </div>
        </div>

        {/* Date from */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b sm:border-b-0 sm:border-r border-[#DCEFFB]">
          <Calendar className="h-4 w-4 text-[#2A7BD9] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2A7BD9] mb-0.5">
              Từ ngày
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm outline-none text-[#0E2233] bg-transparent w-28"
            />
          </div>
        </div>

        {/* Date to */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b sm:border-b-0 sm:border-r border-[#DCEFFB]">
          <Calendar className="h-4 w-4 text-[#2A7BD9] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2A7BD9] mb-0.5">
              Đến ngày
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm outline-none text-[#0E2233] bg-transparent w-28"
            />
          </div>
        </div>

        {/* Category */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b sm:border-b-0 sm:border-r border-[#DCEFFB]">
          <Tag className="h-4 w-4 text-[#2A7BD9] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2A7BD9] mb-0.5">
              Danh mục
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as '' | ListingCategory)}
              className="text-sm outline-none text-[#0E2233] bg-transparent"
            >
              {CATEGORIES.map((c) => (
                <option className="bg-white dark:bg-[#1A263E] text-slate-900 dark:text-white" key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#2A7BD9] to-[#097DAE] text-white px-7 py-4 hover:opacity-90 transition-opacity font-semibold text-sm rounded-b-2xl sm:rounded-none sm:rounded-r-2xl"
        >
          <Search className="h-4 w-4" />
          <span>Tìm kiếm</span>
        </button>
      </div>

      {/* Quick picks */}
      <div className="flex flex-wrap items-center gap-2 mt-4 justify-center">
        <span className="text-xs text-white/70">Phổ biến:</span>
        {QUICK_PICKS.map((pick) => (
          <button
            key={pick.label}
            type="button"
            onClick={() => applyQuickPick(pick)}
            className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-colors border border-white/20 dark:bg-[#121A2C] dark:text-white dark:border-white/10"
          >
            {pick.label}
          </button>
        ))}
      </div>
    </form>
  );
}
