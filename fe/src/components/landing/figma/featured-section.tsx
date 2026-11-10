'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { listingApi } from '@/lib/api/client';
import type { Listing, ListingCategory } from '@/types/listing';
import { LISTING_CATEGORIES } from '@/constants/categories';
import { ListingCard } from '@/components/listing-card';
import { ChevronDown } from 'lucide-react';
import { PillButton } from '@/components/ui/pill-button';

const LOCATIONS = ['Đà Lạt', 'Đà Nẵng', 'Hà Nội', 'Hồ Chí Minh', 'Nha Trang', 'Sa Pa'];

const SELECT_CLASS =
  'h-10 w-full appearance-none rounded-full border border-sky-100 bg-sky-50/70 pl-4 pr-9 text-[13px] font-semibold text-ink outline-none transition-colors hover:border-sky-200 focus:border-brand focus:ring-2 focus:ring-brand/20 cursor-pointer';

export function FeaturedSection() {
  const [selectedCategory, setSelectedCategory] = React.useState<ListingCategory | 'ALL'>('ALL');

  const [location, setLocation] = React.useState('');

  const { data: listingsData, isLoading } = useQuery<Listing[]>({
    queryKey: ['landing-featured', selectedCategory, location],
    queryFn: async () => {
      const res = await listingApi.list({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        location: location || undefined,
        limit: 6,
        sort: 'rating',
      });
      return res.items || [];
    },
    staleTime: 60 * 1000,
  });

  return (
    <section className="py-10 sm:py-14 lg:py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24" id="featured">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div className="max-w-xl">
          <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.14em] text-slate-500 mb-3">
            Nổi bật và được yêu thích
          </p>
          <h2 className="text-[clamp(1.75rem,2.2vw+1rem,2.75rem)] font-semibold text-ink tracking-[-0.03em] leading-[1.1]">
            Tìm thiết bị phù hợp với bạn
          </h2>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-600 leading-relaxed">
            Lọc theo loại thiết bị hoặc địa điểm. Mọi đơn thuê đều có hợp đồng số và tiền cọc được bảo vệ.
          </p>
        </div>

        <PillButton
          href="/search?sort=rating"
          variant="outline"
          size="md"
          className="bg-white border-brand hover:bg-sky-50 text-[13px] font-semibold px-5 h-10 shadow-none"
        >
          Tất cả thiết bị
        </PillButton>
      </div>

      {/* Filter bar */}
      <div className="mb-6 sm:mb-8 inline-flex w-full sm:w-auto max-w-full items-center gap-2 rounded-full border border-sky-100 bg-white p-1.5 shadow-soft">
        <div className="relative min-w-0 flex-1 sm:w-52 sm:flex-none">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ListingCategory | 'ALL')}
            aria-label="Loại thiết bị"
            className={SELECT_CLASS}
          >
            <option value="ALL">Tất cả loại thiết bị</option>
            {LISTING_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>
        <div className="relative min-w-0 flex-1 sm:w-48 sm:flex-none">
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            aria-label="Địa điểm"
            className={SELECT_CLASS}
          >
            <option value="">Tất cả địa điểm</option>
            {LOCATIONS.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('ALL');
            setLocation('');
          }}
          disabled={selectedCategory === 'ALL' && !location}
          className="h-10 shrink-0 rounded-full bg-ink px-4 text-[13px] font-semibold text-white transition-opacity hover:bg-ink/90 disabled:cursor-default disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
        >
          Xoá lọc
        </button>
      </div>

      {/* Equipment Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-white animate-pulse border border-sky-100" />
          ))}
        </div>
      ) : listingsData && listingsData.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {listingsData.slice(0, 6).map((item) => (
            <ListingCard key={item.id} listing={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-sky-100 p-8">
          <p className="text-sm font-semibold text-slate-600">
            Chưa có thiết bị phù hợp với bộ lọc này.
          </p>
          <Link
            href="/search"
            className="inline-block mt-3 text-xs font-bold text-brand hover:underline"
          >
            Khám phá các thiết bị khác →
          </Link>
        </div>
      )}
    </section>
  );
}
