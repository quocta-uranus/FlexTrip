'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchApi, listingApi } from '@/lib/api/client';
import { useSearchStore } from '@/store/search.store';
import { ListingCard } from '@/components/listing-card';
import type { SearchFilters, ListingCategory } from '@/types/listing';
import { CATEGORY_LABELS } from '@/types/listing';

const CATEGORIES: Array<{ value: '' | ListingCategory; label: string; icon: string }> = [
  { value: '', label: 'Tất cả', icon: '🌟' },
  { value: 'CAMPING_TREKKING', label: 'Cắm trại & Trekking', icon: '⛺' },
  { value: 'VEHICLE', label: 'Phương tiện', icon: '🚵' },
  { value: 'STAY', label: 'Chỗ ở', icon: '🏡' },
  { value: 'EXPERIENCE', label: 'Trải nghiệm', icon: '🌄' },
  { value: 'OTHER', label: 'Khác', icon: '📦' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'rating', label: 'Đánh giá cao' },
];

export default function SearchPage() {
  const { filters, setFilters, resetFilters } = useSearchStore();
  const [localKeyword, setLocalKeyword] = useState(filters.keyword ?? '');
  const [showFilters, setShowFilters] = useState(false);

  // Try real search API; fall back to listing list
  const { data: searchData, isLoading, error } = useQuery({
    queryKey: ['search', filters],
    queryFn: async () => {
      try {
        return await searchApi.search(filters);
      } catch {
        // BE search not yet available — fall back to listing list
        const items = await listingApi.list({ status: 'ACTIVE', page: filters.page, limit: filters.limit });
        return {
          items: filters.keyword
            ? items.filter((l) =>
                l.title.toLowerCase().includes((filters.keyword ?? '').toLowerCase()) ||
                l.location.toLowerCase().includes((filters.keyword ?? '').toLowerCase())
              )
            : items,
          total: items.length,
          page: filters.page ?? 1,
          limit: filters.limit ?? 12,
          totalPages: 1,
        };
      }
    },
    placeholderData: (prev) => prev,
  });

  const handleSearch = useCallback(() => {
    setFilters({ keyword: localKeyword, page: 1 });
  }, [localKeyword, setFilters]);

  useEffect(() => {
    const t = setTimeout(() => setFilters({ keyword: localKeyword, page: 1 }), 500);
    return () => clearTimeout(t);
  }, [localKeyword, setFilters]);

  const items = searchData?.items ?? [];
  const total = searchData?.total ?? 0;

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      {/* Hero search bar */}
      <div
        className="sticky top-16 z-30 border-b py-4 backdrop-blur-md"
        style={{ background: 'rgba(246,251,254,0.95)', borderColor: '#DCEFFB' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Main search input */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
                style={{ color: '#8694ad' }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="search-keyword-input"
                type="text"
                placeholder="Tìm thiết bị, địa điểm, trải nghiệm…"
                value={localKeyword}
                onChange={(e) => setLocalKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full rounded-full border py-3 pl-12 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-[#2a7bd9]/30"
                style={{ borderColor: '#DCEFFB', background: '#fff', color: '#0f1729' }}
              />
            </div>
            <button
              id="search-filter-toggle-btn"
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition-all hover:shadow-sm"
              style={{
                borderColor: showFilters ? '#2a7bd9' : '#DCEFFB',
                color: showFilters ? '#2a7bd9' : '#5a6b85',
                background: showFilters ? 'rgba(42,123,217,0.06)' : '#fff',
              }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Bộ lọc
            </button>
          </div>

          {/* Category pills */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const active = filters.category === cat.value;
              return (
                <button
                  key={cat.value}
                  id={`category-filter-${cat.value || 'all'}`}
                  onClick={() => setFilters({ category: cat.value, page: 1 })}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:shadow-sm"
                  style={{
                    borderColor: active ? '#2a7bd9' : '#DCEFFB',
                    background: active ? '#2a7bd9' : '#fff',
                    color: active ? '#fff' : '#5a6b85',
                  }}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex gap-6">
          {/* Sidebar filters */}
          {showFilters && (
            <aside className="hidden w-64 shrink-0 lg:block">
              <div
                className="sticky top-48 rounded-2xl border bg-white p-5"
                style={{ borderColor: '#DCEFFB' }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold" style={{ color: '#0f1729' }}>Bộ lọc</h2>
                  <button
                    onClick={() => { resetFilters(); setLocalKeyword(''); }}
                    className="text-xs font-medium"
                    style={{ color: '#2a7bd9' }}
                  >
                    Xóa tất cả
                  </button>
                </div>

                {/* Location */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: '#5a6b85' }}>
                    Địa điểm
                  </label>
                  <input
                    id="filter-location-input"
                    type="text"
                    placeholder="Đà Lạt, Hội An…"
                    value={filters.location ?? ''}
                    onChange={(e) => setFilters({ location: e.target.value, page: 1 })}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                    style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
                  />
                </div>

                {/* Price range */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: '#5a6b85' }}>
                    Khoảng giá (VND/ngày)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="filter-price-min-input"
                      type="number"
                      placeholder="Từ"
                      min={0}
                      value={filters.priceMin ?? ''}
                      onChange={(e) => setFilters({ priceMin: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                      style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
                    />
                    <span style={{ color: '#8694ad' }}>–</span>
                    <input
                      id="filter-price-max-input"
                      type="number"
                      placeholder="Đến"
                      min={0}
                      value={filters.priceMax ?? ''}
                      onChange={(e) => setFilters({ priceMax: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                      style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: '#5a6b85' }}>
                    Ngày thuê
                  </label>
                  <div className="space-y-2">
                    <input
                      id="filter-date-from-input"
                      type="date"
                      value={filters.dateFrom ?? ''}
                      onChange={(e) => setFilters({ dateFrom: e.target.value, page: 1 })}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                      style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
                    />
                    <input
                      id="filter-date-to-input"
                      type="date"
                      value={filters.dateTo ?? ''}
                      onChange={(e) => setFilters({ dateTo: e.target.value, page: 1 })}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                      style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
                    />
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium" style={{ color: '#5a6b85' }}>
                    Sắp xếp
                  </label>
                  <select
                    id="filter-sort-select"
                    value={filters.sortBy ?? 'newest'}
                    onChange={(e) => setFilters({ sortBy: e.target.value as SearchFilters['sortBy'], page: 1 })}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                    style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </aside>
          )}

          {/* Results */}
          <div className="flex-1">
            {/* Result header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                {isLoading ? (
                  <div className="h-5 w-40 animate-pulse rounded bg-[#e2e8f3]" />
                ) : (
                  <p className="text-sm" style={{ color: '#5a6b85' }}>
                    {total > 0 ? (
                      <>
                        <span className="font-semibold" style={{ color: '#0f1729' }}>{total}</span> kết quả
                        {filters.keyword && (
                          <> cho "<span className="font-semibold" style={{ color: '#2a7bd9' }}>{filters.keyword}</span>"</>
                        )}
                      </>
                    ) : 'Không tìm thấy kết quả'}
                  </p>
                )}
              </div>

              {/* Mobile sort */}
              <select
                id="sort-select-mobile"
                value={filters.sortBy ?? 'newest'}
                onChange={(e) => setFilters({ sortBy: e.target.value as SearchFilters['sortBy'], page: 1 })}
                className="rounded-lg border px-3 py-1.5 text-xs lg:hidden outline-none"
                style={{ borderColor: '#DCEFFB', color: '#0f1729' }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Loading skeleton */}
            {isLoading && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border bg-white" style={{ borderColor: '#DCEFFB' }}>
                    <div className="h-48 rounded-t-2xl bg-[#e2e8f3]" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 w-3/4 rounded bg-[#e2e8f3]" />
                      <div className="h-3 w-1/2 rounded bg-[#e2e8f3]" />
                      <div className="h-5 w-1/3 rounded bg-[#e2e8f3]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && items.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border bg-white py-20" style={{ borderColor: '#DCEFFB' }}>
                <span className="mb-4 text-6xl">🔍</span>
                <h3 className="mb-2 text-lg font-semibold" style={{ color: '#0f1729' }}>
                  Không tìm thấy kết quả
                </h3>
                <p className="mb-6 text-sm text-center max-w-xs" style={{ color: '#8694ad' }}>
                  Thử từ khóa khác hoặc xóa bộ lọc để xem thêm sản phẩm.
                </p>
                <button
                  onClick={() => { resetFilters(); setLocalKeyword(''); }}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ background: '#2a7bd9' }}
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}

            {/* Grid */}
            {!isLoading && items.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {(searchData?.totalPages ?? 0) > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  disabled={(filters.page ?? 1) <= 1}
                  onClick={() => setFilters({ page: (filters.page ?? 1) - 1 })}
                  className="rounded-lg border px-4 py-2 text-sm font-medium transition-all disabled:opacity-40"
                  style={{ borderColor: '#DCEFFB', color: '#5a6b85' }}
                >
                  ← Trước
                </button>
                <span className="flex items-center gap-1 px-4 text-sm" style={{ color: '#5a6b85' }}>
                  Trang <strong style={{ color: '#0f1729' }}>{filters.page ?? 1}</strong> / {searchData?.totalPages}
                </span>
                <button
                  disabled={(filters.page ?? 1) >= (searchData?.totalPages ?? 1)}
                  onClick={() => setFilters({ page: (filters.page ?? 1) + 1 })}
                  className="rounded-lg border px-4 py-2 text-sm font-medium transition-all disabled:opacity-40"
                  style={{ borderColor: '#DCEFFB', color: '#5a6b85' }}
                >
                  Sau →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
