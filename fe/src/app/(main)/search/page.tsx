'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, MapPin, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import { listingApi } from '@/lib/api/client';
import { useSearchStore } from '@/store/search.store';
import { ListingCard } from '@/components/listing-card';
import type { SearchFilters, ListingCategory } from '@/types/listing';
import { LISTING_CATEGORIES, CATEGORY_META } from '@/constants/categories';

const CATEGORIES: Array<{ value: '' | ListingCategory; label: string; icon: string }> = [
  { value: '', label: 'Tất cả', icon: '🌟' },
  ...LISTING_CATEGORIES.map((c) => ({ value: c.value, label: c.label, icon: c.emoji })),
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'rating', label: 'Đánh giá cao' },
];

const PRICE_PRESETS = [
  { label: 'Dưới 100k', min: 0, max: 100_000 },
  { label: '100k – 300k', min: 100_000, max: 300_000 },
  { label: '300k – 500k', min: 300_000, max: 500_000 },
  { label: 'Trên 500k', min: 500_000, max: undefined },
];

function UrlParamSync() {
  const searchParams = useSearchParams();
  const { setFilters } = useSearchStore();
  useEffect(() => {
    const cat = searchParams.get('category') as ListingCategory | null;
    const kw = searchParams.get('keyword');
    if (cat || kw) setFilters({ ...(cat ? { category: cat } : {}), ...(kw ? { keyword: kw } : {}), page: 1 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl bg-white" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div className="bg-slate-200" style={{ height: 210 }} />
      <div className="space-y-3 p-4">
        <div className="h-4 w-4/5 rounded-lg bg-slate-200" />
        <div className="h-3 w-1/2 rounded-lg bg-slate-200" />
        <div className="h-3 w-1/3 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
      style={{ borderColor: '#e2e8f0', background: '#f8fafc', color: '#5a6b85' }}>
      {label}
      <button onClick={onRemove} className="rounded-full p-0.5 hover:bg-slate-200 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function FilterDropdown({
  filters, setFilters, resetFilters, onClose,
}: {
  filters: SearchFilters;
  setFilters: (f: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  onClose: () => void;
}) {
  const activePreset = PRICE_PRESETS.find(
    (p) => p.min === (filters.priceMin ?? 0) && p.max === filters.priceMax,
  );

  return (
    <div
      className="absolute right-0 top-full z-50 mt-2 w-[420px] overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: '0 16px 48px -8px rgba(0,0,0,0.18)', border: '1px solid rgba(0,0,0,0.07)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: '#f1f5f9' }}>
        <span className="text-sm font-bold" style={{ color: '#0f1729' }}>Bộ lọc</span>
        <div className="flex items-center gap-4">
          <button onClick={() => { resetFilters(); }} className="text-xs font-semibold" style={{ color: '#2a7bd9' }}>
            Xóa tất cả
          </button>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" style={{ color: '#8694ad' }} />
          </button>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        <div className="grid grid-cols-2 divide-x divide-slate-100">

          {/* Left column */}
          <div className="space-y-5 p-5">
            {/* Location */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#8694ad' }}>
                Địa điểm
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#8694ad' }} />
                <input
                  type="text"
                  placeholder="Đà Lạt, Hội An…"
                  value={filters.location ?? ''}
                  onChange={(e) => setFilters({ location: e.target.value, page: 1 })}
                  className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none transition-all focus:ring-2 focus:ring-[#2a7bd9]/25"
                  style={{ borderColor: '#e2e8f0', color: '#0f1729' }}
                />
              </div>
            </div>

            {/* Dates */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#8694ad' }}>
                Ngày thuê
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.dateFrom ?? ''}
                  onChange={(e) => setFilters({ dateFrom: e.target.value, page: 1 })}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/25"
                  style={{ borderColor: '#e2e8f0', color: filters.dateFrom ? '#0f1729' : '#94a3b8' }}
                />
                <input
                  type="date"
                  value={filters.dateTo ?? ''}
                  onChange={(e) => setFilters({ dateTo: e.target.value, page: 1 })}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/25"
                  style={{ borderColor: '#e2e8f0', color: filters.dateTo ? '#0f1729' : '#94a3b8' }}
                />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5 p-5">
            {/* Price presets */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#8694ad' }}>
                Khoảng giá / ngày
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {PRICE_PRESETS.map((p) => {
                  const active = activePreset === p;
                  return (
                    <button
                      key={p.label}
                      onClick={() => active
                        ? setFilters({ priceMin: undefined, priceMax: undefined, page: 1 })
                        : setFilters({ priceMin: p.min || undefined, priceMax: p.max, page: 1 })
                      }
                      className="rounded-xl border px-2.5 py-2 text-xs font-medium transition-all"
                      style={{
                        borderColor: active ? '#2a7bd9' : '#e2e8f0',
                        background: active ? 'rgba(42,123,217,0.08)' : '#fff',
                        color: active ? '#2a7bd9' : '#5a6b85',
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Từ"
                  value={filters.priceMin ?? ''}
                  onChange={(e) => setFilters({ priceMin: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                  className="w-full rounded-xl border px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#2a7bd9]/25"
                  style={{ borderColor: '#e2e8f0', color: '#0f1729' }}
                />
                <span className="shrink-0 text-xs" style={{ color: '#94a3b8' }}>–</span>
                <input
                  type="number"
                  placeholder="Đến"
                  value={filters.priceMax ?? ''}
                  onChange={(e) => setFilters({ priceMax: e.target.value ? Number(e.target.value) : undefined, page: 1 })}
                  className="w-full rounded-xl border px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#2a7bd9]/25"
                  style={{ borderColor: '#e2e8f0', color: '#0f1729' }}
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide" style={{ color: '#8694ad' }}>
                Sắp xếp theo
              </label>
              <div className="space-y-0.5">
                {SORT_OPTIONS.map((o) => {
                  const active = (filters.sortBy ?? 'newest') === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => setFilters({ sortBy: o.value as SearchFilters['sortBy'], page: 1 })}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all"
                      style={{
                        background: active ? 'rgba(42,123,217,0.07)' : 'transparent',
                        color: active ? '#2a7bd9' : '#5a6b85',
                      }}
                    >
                      {o.label}
                      {active && <span className="h-2 w-2 rounded-full" style={{ background: '#2a7bd9' }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer apply button */}
      <div className="border-t p-4" style={{ borderColor: '#f1f5f9' }}>
        <button
          onClick={onClose}
          className="w-full rounded-2xl py-3 text-sm font-bold text-white transition-all hover:brightness-110"
          style={{ background: '#2a7bd9' }}
        >
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
  );
}

function SearchPageInner() {
  const { filters, setFilters, resetFilters } = useSearchStore();
  const [localKeyword, setLocalKeyword] = useState(filters.keyword ?? '');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const { data: searchData, isLoading } = useQuery({
    queryKey: ['search', filters],
    queryFn: () =>
      listingApi.list({
        status: 'ACTIVE',
        page: filters.page ?? 1,
        limit: filters.limit ?? 12,
        category: filters.category || undefined,
        keyword: filters.keyword || undefined,
        location: filters.location || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const handleSearch = useCallback(() => {
    setFilters({ keyword: localKeyword, page: 1 });
  }, [localKeyword, setFilters]);

  useEffect(() => {
    const t = setTimeout(() => setFilters({ keyword: localKeyword, page: 1 }), 500);
    return () => clearTimeout(t);
  }, [localKeyword, setFilters]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = searchData?.items ?? [];
  const total = searchData?.total ?? 0;
  const totalPages = searchData?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;

  const activeFiltersCount = [
    filters.location,
    filters.priceMin,
    filters.priceMax,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>

      {/* ── Sticky top bar ── */}
      <div
        className="sticky top-16 z-30 border-b"
        style={{ background: 'rgba(255,255,255,0.97)', borderColor: '#e8eef5', backdropFilter: 'blur(16px)' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-3 py-3">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#8694ad' }} />
              <input
                id="search-keyword-input"
                type="text"
                placeholder="Tìm thiết bị, địa điểm, trải nghiệm…"
                value={localKeyword}
                onChange={(e) => setLocalKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full rounded-full border py-2.5 pl-11 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-[#2a7bd9]/25"
                style={{ borderColor: '#e2e8f0', background: '#f8fafc', color: '#0f1729' }}
              />
            </div>

            {/* Filter button + dropdown */}
            <div className="relative shrink-0" ref={filterRef}>
              <button
                id="search-filter-toggle-btn"
                onClick={() => setFilterOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all hover:shadow-sm"
                style={{
                  borderColor: activeFiltersCount > 0 || filterOpen ? '#2a7bd9' : '#e2e8f0',
                  color: activeFiltersCount > 0 || filterOpen ? '#2a7bd9' : '#5a6b85',
                  background: activeFiltersCount > 0 || filterOpen ? 'rgba(42,123,217,0.07)' : '#fff',
                }}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Bộ lọc</span>
                {activeFiltersCount > 0 && (
                  <span
                    className="flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: '#2a7bd9', minWidth: '18px', height: '18px' }}
                  >
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown
                  className="h-3.5 w-3.5 transition-transform duration-200"
                  style={{ transform: filterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {filterOpen && (
                <FilterDropdown
                  filters={filters}
                  setFilters={setFilters}
                  resetFilters={resetFilters}
                  onClose={() => setFilterOpen(false)}
                />
              )}
            </div>
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const active = filters.category === cat.value;
              const meta = cat.value ? CATEGORY_META[cat.value] : null;
              return (
                <button
                  key={cat.value}
                  id={`category-filter-${cat.value || 'all'}`}
                  onClick={() => setFilters({ category: cat.value, page: 1 })}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    borderColor: active ? (meta?.color ?? '#2a7bd9') : '#e2e8f0',
                    background: active ? (meta?.bg ?? 'rgba(42,123,217,0.08)') : '#fff',
                    color: active ? (meta?.color ?? '#2a7bd9') : '#5a6b85',
                    boxShadow: active ? `0 0 0 2px ${meta?.color ?? '#2a7bd9'}22` : 'none',
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

      {/* ── Results ── */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* Result count + sort + active chips */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {isLoading ? (
              <div className="h-5 w-40 animate-pulse rounded-lg bg-slate-200" />
            ) : (
              <p className="text-sm" style={{ color: '#5a6b85' }}>
                {total > 0 ? (
                  <>
                    <span className="font-bold" style={{ color: '#0f1729' }}>{total.toLocaleString()}</span> kết quả
                    {filters.keyword && (
                      <> cho &ldquo;<span className="font-semibold" style={{ color: '#2a7bd9' }}>{filters.keyword}</span>&rdquo;</>
                    )}
                    {filters.location && (
                      <> tại <span className="font-semibold" style={{ color: '#0f1729' }}>{filters.location}</span></>
                    )}
                  </>
                ) : !isLoading ? 'Không tìm thấy kết quả phù hợp' : ''}
              </p>
            )}

            {/* Active filter chips */}
            {filters.location && (
              <FilterChip label={`📍 ${filters.location}`} onRemove={() => setFilters({ location: '', page: 1 })} />
            )}
            {(filters.priceMin || filters.priceMax) && (
              <FilterChip
                label={`💰 ${filters.priceMin ? filters.priceMin.toLocaleString('vi-VN') : '0'}₫ – ${filters.priceMax ? filters.priceMax.toLocaleString('vi-VN') : '∞'}₫`}
                onRemove={() => setFilters({ priceMin: undefined, priceMax: undefined, page: 1 })}
              />
            )}
            {filters.dateFrom && (
              <FilterChip label={`📅 ${filters.dateFrom}${filters.dateTo ? ` → ${filters.dateTo}` : ''}`}
                onRemove={() => setFilters({ dateFrom: '', dateTo: '', page: 1 })} />
            )}
          </div>

          <select
            id="sort-select"
            value={filters.sortBy ?? 'newest'}
            onChange={(e) => setFilters({ sortBy: e.target.value as SearchFilters['sortBy'], page: 1 })}
            className="shrink-0 rounded-xl border px-3 py-2 text-xs font-medium outline-none cursor-pointer"
            style={{ borderColor: '#e2e8f0', color: '#5a6b85', background: '#fff' }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState onReset={() => { resetFilters(); setLocalKeyword(''); }} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setFilters({ page: currentPage - 1 })}
              className="flex h-9 w-9 items-center justify-center rounded-xl border transition-all disabled:opacity-40"
              style={{ borderColor: '#e2e8f0', color: '#5a6b85' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              const active = p === currentPage;
              return (
                <button
                  key={p}
                  onClick={() => setFilters({ page: p })}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-semibold transition-all"
                  style={{
                    borderColor: active ? '#2a7bd9' : '#e2e8f0',
                    background: active ? '#2a7bd9' : '#fff',
                    color: active ? '#fff' : '#5a6b85',
                  }}
                >
                  {p}
                </button>
              );
            })}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setFilters({ page: currentPage + 1 })}
              className="flex h-9 w-9 items-center justify-center rounded-xl border transition-all disabled:opacity-40"
              style={{ borderColor: '#e2e8f0', color: '#5a6b85' }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl py-20"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl text-4xl" style={{ background: '#f1f5f9' }}>
        🔍
      </div>
      <h3 className="mb-2 text-lg font-bold" style={{ color: '#0f1729' }}>Không tìm thấy kết quả</h3>
      <p className="mb-6 max-w-xs text-center text-sm leading-relaxed" style={{ color: '#8694ad' }}>
        Thử từ khóa khác hoặc xóa bộ lọc để xem thêm sản phẩm.
      </p>
      <button onClick={onReset} className="rounded-full px-6 py-2.5 text-sm font-bold text-white" style={{ background: '#2a7bd9' }}>
        Xóa bộ lọc
      </button>
    </div>
  );
}

export default function SearchPage() {
  return (
    <>
      <Suspense fallback={null}>
        <UrlParamSync />
      </Suspense>
      <SearchPageInner />
    </>
  );
}
