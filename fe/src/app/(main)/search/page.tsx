'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, MapPin, ChevronLeft, ChevronRight, X, ChevronDown } from 'lucide-react';
import { listingApi } from '@/lib/api/client';
import { useSearchStore } from '@/store/search.store';
import { ListingCard } from '@/components/listing-card';
import { AiSearchBox } from '@/components/search/ai-search-box';
import type { AiSearchResult } from '@/lib/api/ai-search';
import { RecommendationRow } from '@/components/recommendations/recommendation-row';
import { useForYouListings } from '@/hooks/useRecommendations';
import { useAuthStore } from '@/store/auth.store';
import type { SearchFilters, ListingCategory } from '@/types/listing';
import { LISTING_CATEGORIES, CATEGORY_META } from '@/constants/categories';
import {
  paginationItems,
  parseSearchFilters,
  serializeSearchFilters,
} from '@/lib/search-query';

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

interface FilterDropdownProps {
  filters: SearchFilters;
  onApply: (draft: Partial<SearchFilters>) => void;
  onReset: () => void;
  onClose: () => void;
}

function FilterDropdown({
  filters,
  onApply,
  onReset,
  onClose,
}: FilterDropdownProps) {
  const [draft, setDraft] = useState<{
    location: string;
    dateFrom: string;
    dateTo: string;
    minPrice?: number;
    maxPrice?: number;
    sort: NonNullable<SearchFilters['sort']>;
  }>({
    location: filters.location ?? '',
    dateFrom: filters.dateFrom ?? '',
    dateTo: filters.dateTo ?? '',
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    sort: filters.sort ?? 'newest',
  });

  const activePreset = PRICE_PRESETS.find(
    (p) => p.min === (draft.minPrice ?? 0) && p.max === draft.maxPrice,
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
          <button
            onClick={() => {
              setDraft({
                location: '',
                dateFrom: '',
                dateTo: '',
                minPrice: undefined,
                maxPrice: undefined,
                sort: 'newest',
              });
              onReset();
            }}
            className="text-xs font-semibold"
            style={{ color: '#2a7bd9' }}
          >
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
                  value={draft.location}
                  onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
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
                  value={draft.dateFrom}
                  onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/25"
                  style={{ borderColor: '#e2e8f0', color: draft.dateFrom ? '#0f1729' : '#94a3b8' }}
                />
                <input
                  type="date"
                  value={draft.dateTo}
                  onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/25"
                  style={{ borderColor: '#e2e8f0', color: draft.dateTo ? '#0f1729' : '#94a3b8' }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed" style={{ color: '#8694ad' }}>
                Khả dụng theo ngày sẽ được xác nhận khi bạn đặt thuê.
              </p>
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
                        ? setDraft((d) => ({ ...d, minPrice: undefined, maxPrice: undefined }))
                        : setDraft((d) => ({ ...d, minPrice: p.min || undefined, maxPrice: p.max }))
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
                  min={0}
                  value={draft.minPrice ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, minPrice: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full rounded-xl border px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#2a7bd9]/25"
                  style={{ borderColor: '#e2e8f0', color: '#0f1729' }}
                />
                <span className="shrink-0 text-xs" style={{ color: '#94a3b8' }}>–</span>
                <input
                  type="number"
                  placeholder="Đến"
                  min={0}
                  value={draft.maxPrice ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, maxPrice: e.target.value ? Number(e.target.value) : undefined }))}
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
                  const active = (draft.sort ?? 'newest') === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => setDraft((d) => ({ ...d, sort: o.value as NonNullable<SearchFilters['sort']> }))}
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
          id="apply-filter-button"
          onClick={() => {
            onApply({
              location: draft.location,
              dateFrom: draft.dateFrom,
              dateTo: draft.dateTo,
              minPrice: draft.minPrice,
              maxPrice: draft.maxPrice,
              sort: draft.sort,
            });
            onClose();
          }}
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const [filters, setFilters] = useState<SearchFilters>(() => parseSearchFilters(searchString));
  const { replaceFilters, resetFilters: resetStoreFilters } = useSearchStore();
  const [localKeyword, setLocalKeyword] = useState(filters.keyword ?? '');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsed = parseSearchFilters(searchString);
    setFilters(parsed);
    replaceFilters(parsed);
    setLocalKeyword(parsed.keyword ?? '');
  }, [searchString, replaceFilters]);

  const updateFilters = useCallback(
    (partial: Partial<SearchFilters>, historyMode: 'push' | 'replace' = 'push') => {
      setFilters((prev) => {
        const next = { ...prev, ...partial, page: partial.page ?? 1 };
        replaceFilters(next);
        const query = serializeSearchFilters(next);
        const url = query ? `/search?${query}` : '/search';
        if (historyMode === 'replace') {
          router.replace(url, { scroll: false });
        } else {
          router.push(url, { scroll: false });
        }
        return next;
      });
    },
    [replaceFilters, router],
  );

  const resetFilters = useCallback(() => {
    resetStoreFilters();
    setFilters({});
    setLocalKeyword('');
    router.push('/search', { scroll: false });
  }, [resetStoreFilters, router]);

  const apiFilters = useMemo(
    () => ({
      page: filters.page ?? 1,
      limit: filters.limit ?? 12,
      category: filters.category || undefined,
      keyword: filters.keyword || undefined,
      location: filters.location || undefined,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      sort: filters.sort ?? 'newest',
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    }),
    [
      filters.category,
      filters.dateFrom,
      filters.dateTo,
      filters.keyword,
      filters.limit,
      filters.location,
      filters.maxPrice,
      filters.minPrice,
      filters.page,
      filters.sort,
    ],
  );

  const {
    data: searchData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['search', apiFilters],
    queryFn: () => listingApi.list(apiFilters),
  });

  const handleSearch = useCallback(() => {
    updateFilters({ keyword: localKeyword, page: 1 });
  }, [localKeyword, updateFilters]);

  useEffect(() => {
    if (localKeyword === (filters.keyword ?? '')) return;
    const t = setTimeout(
      () => updateFilters({ keyword: localKeyword, page: 1 }, 'replace'),
      500,
    );
    return () => clearTimeout(t);
  }, [filters.keyword, localKeyword, updateFilters]);

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

  const [aiNeeds, setAiNeeds] = useState<AiSearchResult | null>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasAnyFilter = Boolean(
    filters.keyword || filters.location || filters.category || filters.minPrice != null ||
    filters.maxPrice != null || filters.dateFrom || filters.dateTo,
  );
  const forYou = useForYouListings(isAuthenticated && !hasAnyFilter && !aiNeeds);

  const activeFiltersCount = [
    filters.location,
    filters.minPrice,
    filters.maxPrice,
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
                  onApply={(draft) => updateFilters(draft)}
                  onReset={resetFilters}
                  onClose={() => setFilterOpen(false)}
                />
              )}
            </div>
          </div>

          <AiSearchBox
            onResult={(result) => {
              if (result.mode === 'needs') {
                setAiNeeds(result);
                return;
              }
              setAiNeeds(null);
              const f = result.filters;
              setLocalKeyword(f.keyword ?? '');
              updateFilters({
                keyword: f.keyword ?? '',
                location: f.location ?? '',
                category: f.category ?? '',
                minPrice: f.minPrice,
                maxPrice: f.maxPrice,
                dateFrom: f.dateFrom ?? '',
                dateTo: f.dateTo ?? '',
                sort: f.sort ?? 'newest',
              });
            }}
            onClear={() => {
              setAiNeeds(null);
              resetFilters();
            }}
          />

          {/* Category pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide">
            {CATEGORIES.map((cat) => {
              const active = filters.category === cat.value;
              const meta = cat.value ? CATEGORY_META[cat.value] : null;
              return (
                <button
                  key={cat.value}
                  id={`category-filter-${cat.value || 'all'}`}
                  onClick={() => updateFilters({ category: cat.value, page: 1 })}
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

        {isAuthenticated && !hasAnyFilter && !aiNeeds && (
          <RecommendationRow
            title="Dành cho bạn"
            subtitle="Gợi ý từ danh sách yêu thích và đơn thuê của bạn"
            items={forYou.data?.items}
            isLoading={forYou.isLoading}
          />
        )}

        {aiNeeds ? (
          <RecommendationRow
            title="Gợi ý cho nhu cầu của bạn"
            subtitle="Các sản phẩm phù hợp, thuộc nhiều nhóm khác nhau"
            items={aiNeeds.items}
            isLoading={false}
          />
        ) : (
        <>
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
              <FilterChip label={`📍 ${filters.location}`} onRemove={() => updateFilters({ location: '', page: 1 })} />
            )}
            {(filters.minPrice != null || filters.maxPrice != null) && (
              <FilterChip
                label={`💰 ${filters.minPrice != null ? filters.minPrice.toLocaleString('vi-VN') : '0'}₫ – ${filters.maxPrice != null ? filters.maxPrice.toLocaleString('vi-VN') : '∞'}₫`}
                onRemove={() => updateFilters({ minPrice: undefined, maxPrice: undefined, page: 1 })}
              />
            )}
            {filters.dateFrom && (
              <FilterChip label={`📅 ${filters.dateFrom}${filters.dateTo ? ` → ${filters.dateTo}` : ''}`}
                onRemove={() => updateFilters({ dateFrom: '', dateTo: '', page: 1 })} />
            )}
          </div>

          <select
            id="sort-select"
            value={filters.sort ?? 'newest'}
            onChange={(e) => updateFilters({ sort: e.target.value as SearchFilters['sort'], page: 1 })}
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
        ) : isError ? (
          <div className="rounded-2xl bg-white px-6 py-16 text-center" style={{ border: '1px solid #fee2e2' }}>
            <p className="text-sm font-semibold text-red-600">Không thể tải kết quả tìm kiếm.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-full px-5 py-2 text-sm font-semibold text-white"
              style={{ background: '#2a7bd9' }}
            >
              Thử lại
            </button>
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
              onClick={() => updateFilters({ page: currentPage - 1 })}
              className="flex h-9 w-9 items-center justify-center rounded-xl border transition-all disabled:opacity-40"
              style={{ borderColor: '#e2e8f0', color: '#5a6b85' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {paginationItems(currentPage, totalPages).map((p) => {
              if (typeof p !== 'number') {
                return <span key={p} className="px-1 text-sm text-slate-400">…</span>;
              }
              const active = p === currentPage;
              return (
                <button
                  key={p}
                  onClick={() => updateFilters({ page: p })}
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
              onClick={() => updateFilters({ page: currentPage + 1 })}
              className="flex h-9 w-9 items-center justify-center rounded-xl border transition-all disabled:opacity-40"
              style={{ borderColor: '#e2e8f0', color: '#5a6b85' }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
        </>
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
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  );
}
