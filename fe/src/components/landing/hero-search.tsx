'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, Tag } from 'lucide-react';

const CATEGORIES = [
  { value: 'camping', label: 'Cắm trại' },
  { value: 'water-sports', label: 'Thể thao nước' },
  { value: 'vehicles', label: 'Xe cộ' },
  { value: 'travel-gear', label: 'Đồ du lịch' },
  { value: 'photography', label: 'Nhiếp ảnh' },
  { value: 'sports', label: 'Thể thao' },
  { value: 'electronics', label: 'Điện tử' },
];

export function HeroSearch() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set('q', location);
    if (startDate) params.set('from', startDate);
    if (endDate) params.set('to', endDate);
    if (category) params.set('category', category);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSearch} className="w-full max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row bg-white rounded-2xl shadow-2xl shadow-[#2A7BD9]/20 overflow-hidden border border-white/60">
        {/* Location */}
        <div className="flex items-center gap-2.5 px-4 py-4 flex-1 border-b sm:border-b-0 sm:border-r border-[#DCEFFB]">
          <MapPin className="h-4 w-4 text-[#2A7BD9] shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2A7BD9] mb-0.5">
              Địa điểm
            </span>
            <input
              type="text"
              placeholder="Bạn muốn đến đâu?"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="text-sm outline-none placeholder:text-[#5B7A93]/70 text-[#0E2233] bg-transparent w-full"
            />
          </div>
        </div>

        {/* Start date */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b sm:border-b-0 sm:border-r border-[#DCEFFB]">
          <Calendar className="h-4 w-4 text-[#2A7BD9] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2A7BD9] mb-0.5">
              Từ ngày
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm outline-none text-[#0E2233] bg-transparent w-28"
            />
          </div>
        </div>

        {/* End date */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b sm:border-b-0 sm:border-r border-[#DCEFFB]">
          <Calendar className="h-4 w-4 text-[#2A7BD9] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2A7BD9] mb-0.5">
              Đến ngày
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
              onChange={(e) => setCategory(e.target.value)}
              className="text-sm outline-none text-[#0E2233] bg-transparent"
            >
              <option value="">Tất cả</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
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
        <span className="text-xs text-white/70">Tìm kiếm phổ biến:</span>
        {['Lều cắm trại', 'Xe đạp leo núi', 'Kayak', 'Máy ảnh DSLR'].map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setLocation(tag)}
            className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-colors border border-white/20"
          >
            {tag}
          </button>
        ))}
      </div>
    </form>
  );
}
