'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  ArrowDown,
  Wallet,
  X,
} from 'lucide-react';
import { listingApi } from '@/lib/api/client';
import { recommendationsApi } from '@/lib/api/recommendations';
import { useSearchStore } from '@/store/search.store';
import { ListingCard } from '@/components/listing-card';
import { CategoryBar } from '@/components/search/category-bar';
import { SearchBar } from '@/components/search/search-bar';
import { FiltersPanel } from '@/components/search/filters-panel';
import { SortSelect } from '@/components/search/sort-select';
import { BottomSheet } from '@/components/ui/search-popup';
import type { AiSearchResult } from '@/lib/api/ai-search';
import { RecommendationRow } from '@/components/recommendations/recommendation-row';
import { useForYouListings } from '@/hooks/useRecommendations';
import { useAuthStore } from '@/store/auth.store';
import type { SearchFilters } from '@/types/listing';
import { formatShortDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import {
  paginationItems,
  parseSearchFilters,
  serializeSearchFilters,
} from '@/lib/search-query';

// With this few results the page would look empty, so well-rated listings are suggested below them.
const SPARSE_RESULTS = 9;
const SUGGESTION_COUNT = 6;

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-soft">
      <div className="h-52 bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-4/5 rounded-lg bg-slate-200" />
        <div className="h-3 w-1/2 rounded-lg bg-slate-200" />
        <div className="h-3 w-1/3 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

function FilterChip({ icon: Icon, label, onRemove }: { icon: typeof MapPin; label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 py-1 pl-2.5 pr-1.5 text-xs font-semibold text-brand-blue">
      <Icon className="h-3.5 w-3.5" />
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Bỏ lọc ${label}`}
        className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-brand/20"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const [filters, setFilters] = useState<SearchFilters>(() => parseSearchFilters(searchString));
  const { replaceFilters, resetFilters: resetStoreFilters } = useSearchStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [localKeyword, setLocalKeyword] = useState(filters.keyword ?? '');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    const parsed = parseSearchFilters(searchString);
    setFilters(parsed);
    replaceFilters(parsed);
    setLocalKeyword(parsed.keyword ?? '');
  }, [searchString, replaceFilters]);

  // Latest filters, so several quick changes build on each other without navigating from inside a state updater.
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const updateFilters = useCallback(
    (partial: Partial<SearchFilters>, historyMode: 'push' | 'replace' = 'push') => {
      const next = { ...filtersRef.current, ...partial, page: partial.page ?? 1 };
      filtersRef.current = next;
      setFilters(next);
      replaceFilters(next);
      const query = serializeSearchFilters(next);
      const url = query ? `/search?${query}` : '/search';
      if (historyMode === 'replace') {
        router.replace(url, { scroll: false });
      } else {
        router.push(url, { scroll: false });
      }
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

  // Feeds the personalised suggestions. Waits for the user to settle on a search, and only logged-in users have one.
  const searchKey = `${apiFilters.keyword ?? ''}|${apiFilters.category ?? ''}|${apiFilters.location ?? ''}`;
  const recordedSearch = useRef('||');
  useEffect(() => {
    if (!isAuthenticated || searchKey === recordedSearch.current || searchKey === '||') return;
    const t = setTimeout(() => {
      recordedSearch.current = searchKey;
      void recommendationsApi.recordSearch({
        keyword: apiFilters.keyword,
        category: apiFilters.category,
        location: apiFilters.location,
      });
    }, 2000);
    return () => clearTimeout(t);
  }, [isAuthenticated, searchKey, apiFilters.keyword, apiFilters.category, apiFilters.location]);

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

  const items = searchData?.items ?? [];
  const total = searchData?.total ?? 0;
  const totalPages = searchData?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;

  const [aiNeeds, setAiNeeds] = useState<AiSearchResult | null>(null);
  const hasAnyFilter = Boolean(
    filters.keyword || filters.location || filters.category || filters.minPrice != null ||
    filters.maxPrice != null || filters.dateFrom || filters.dateTo,
  );
  const hasPanelFilters = Boolean(
    filters.location || filters.minPrice != null || filters.maxPrice != null || filters.dateFrom || filters.dateTo,
  );
  const forYou = useForYouListings(isAuthenticated && !hasAnyFilter && !aiNeeds);

  const activeFiltersCount = [
    filters.location,
    filters.minPrice != null || filters.maxPrice != null,
    filters.dateFrom,
  ].filter(Boolean).length;

  const sparse = !isLoading && !isError && !aiNeeds && items.length < SPARSE_RESULTS;
  // Suggestions must be rentable by this user: still free on the chosen dates (the API only returns ACTIVE
  // listings), never the user's own listings, ranked by what they booked, saved or reviewed (the for-you API,
  // which already skips their own and already-used listings), then same category, then best rated.
  const dateFrom = filters.dateFrom || undefined;
  const dateTo = filters.dateTo || undefined;
  const category = filters.category || undefined;
  const userId = useAuthStore((s) => s.user?.id);
  const popular = useQuery({
    queryKey: ['search-suggestions', userId, category, dateFrom, dateTo],
    queryFn: async () => {
      const dates = dateFrom && dateTo ? { dateFrom, dateTo } : {};
      const [forYou, sameCategory, rated] = await Promise.all([
        isAuthenticated ? recommendationsApi.forYou(12).catch(() => null) : null,
        category ? listingApi.list({ ...dates, category, sort: 'rating', limit: 12 }) : null,
        listingApi.list({ ...dates, sort: 'rating', limit: 12 }),
      ]);
      // The for-you API knows nothing about dates, so keep only what is free in the chosen range.
      const free =
        forYou && dateFrom && dateTo
          ? new Set((await listingApi.list({ ...dates, limit: 50 })).items.map((i) => i.id))
          : null;
      const personal = (forYou?.source === 'personalized' ? forYou.items : []).filter((i) => !free || free.has(i.id));
      return { personal: personal.length > 0, items: [...personal, ...(sameCategory?.items ?? []), ...rated.items] };
    },
    enabled: sparse,
    staleTime: 5 * 60_000,
  });
  const exclude = new Set(items.map((i) => i.id));
  const suggestions = (popular.data?.items ?? [])
    .filter((i) => !exclude.has(i.id) && i.providerId !== userId)
    .filter((i, idx, all) => all.findIndex((o) => o.id === i.id) === idx)
    .slice(0, SUGGESTION_COUNT);

  const panel = (
    <FiltersPanel
      filters={filters}
      onChange={(partial) => updateFilters(partial)}
      onReset={resetFilters}
      hasActiveFilters={hasPanelFilters}
    />
  );

  return (
    <div className="min-h-screen bg-white">
      {/* ── Title and search ── */}
      <section className="pb-6 pt-24 sm:pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Khám phá</p>
              <h1 className="font-display mt-2 !text-4xl font-medium !leading-[1.05] tracking-[-0.03em] text-ink sm:!text-5xl">Tìm thiết bị cho chuyến đi của bạn</h1>
            </div>
          </div>

          <div className="mt-5">
            <SearchBar
              mode={aiOpen ? 'ai' : 'normal'}
              onModeChange={(mode) => {
                setAiOpen(mode === 'ai');
                if (mode === 'normal') setAiNeeds(null);
              }}
              keyword={localKeyword}
              onKeywordChange={setLocalKeyword}
              onSearch={handleSearch}
              filters={
                <FiltersPanel
                  layout="bar"
                  filters={filters}
                  onChange={(partial) => updateFilters(partial)}
                  onReset={resetFilters}
                  hasActiveFilters={hasPanelFilters}
                />
              }
              onAiResult={(result) => {
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
              onAiClear={() => {
                setAiNeeds(null);
                resetFilters();
              }}
            />
          </div>

          <div className="mt-5">
            <CategoryBar
              value={filters.category ?? ''}
              onChange={(category) => updateFilters({ category, page: 1 })}
            />
          </div>
        </div>
      </section>

      {/* ── Filters + results ── */}
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="min-w-0">
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
              {/* Result count, active filters, filter button (phones) and sort */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {isLoading ? (
                    <div className="h-5 w-40 animate-pulse rounded-lg bg-slate-200" />
                  ) : (
                    <p className="text-sm text-slate-600">
                      {total > 0 ? (
                        <>
                          <span className="font-bold text-ink">{total.toLocaleString('vi-VN')}</span> kết quả
                          {filters.keyword && (
                            <> cho &ldquo;<span className="font-semibold text-brand-blue">{filters.keyword}</span>&rdquo;</>
                          )}
                        </>
                      ) : 'Không tìm thấy kết quả phù hợp'}
                    </p>
                  )}

                  {filters.location && (
                    <FilterChip icon={MapPin} label={filters.location} onRemove={() => updateFilters({ location: '', page: 1 })} />
                  )}
                  {(filters.minPrice != null || filters.maxPrice != null) && (
                    <FilterChip
                      icon={Wallet}
                      label={`${filters.minPrice != null ? filters.minPrice.toLocaleString('vi-VN') : '0'}₫ – ${filters.maxPrice != null ? filters.maxPrice.toLocaleString('vi-VN') : '∞'}₫`}
                      onRemove={() => updateFilters({ minPrice: undefined, maxPrice: undefined, page: 1 })}
                    />
                  )}
                  {filters.dateFrom && (
                    <FilterChip
                      icon={Calendar}
                      label={`${formatShortDate(filters.dateFrom)}${filters.dateTo ? ` – ${formatShortDate(filters.dateTo)}` : ''}`}
                      onRemove={() => updateFilters({ dateFrom: '', dateTo: '', page: 1 })}
                    />
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className="lg:hidden">
                    <BottomSheet
                      open={sheetOpen}
                      onOpenChange={setSheetOpen}
                      title="Bộ lọc"
                      trigger={
                        <button
                          id="search-filter-toggle-btn"
                          type="button"
                          className={cn(
                            'inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold',
                            activeFiltersCount > 0
                              ? 'border-brand bg-brand/10 text-brand-blue'
                              : 'border-slate-200 bg-white text-slate-600',
                          )}
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                          Bộ lọc
                          {activeFiltersCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
                              {activeFiltersCount}
                            </span>
                          )}
                        </button>
                      }
                    >
                      {panel}
                      <button
                        type="button"
                        onClick={() => setSheetOpen(false)}
                        className="mt-5 h-12 w-full rounded-full bg-brand text-sm font-bold text-white transition hover:bg-brand-blue"
                      >
                        Xem {total.toLocaleString('vi-VN')} kết quả
                      </button>
                    </BottomSheet>
                  </div>
                  <SortSelect
                    appearance="field"
                    className="w-44"
                    value={filters.sort ?? 'newest'}
                    onChange={(sort) => updateFilters({ sort: (sort || 'newest') as SearchFilters['sort'], page: 1 })}
                  />
                </div>
              </div>

              {sparse && items.length > 0 && suggestions.length > 0 && (
                <a
                  href="#search-suggestions"
                  className="mb-5 flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-brand/40"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-brand-blue" />
                  <span className="min-w-0 flex-1">
                    Chỉ có {total.toLocaleString('vi-VN')} kết quả. Xem thêm thiết bị tương tự bên dưới
                  </span>
                  <ArrowDown className="h-4 w-4 shrink-0 text-brand-blue" />
                </a>
              )}

              {/* Grid */}
              {isLoading ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : isError ? (
                <div className="rounded-3xl border border-red-100 bg-white px-6 py-16 text-center">
                  <p className="text-sm font-semibold text-red-600">Không thể tải kết quả tìm kiếm.</p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-4 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white"
                  >
                    Thử lại
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-3xl border border-sky-100 bg-white px-6 py-6 text-center shadow-soft sm:flex-row sm:text-left">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-brand-blue">
                    <SearchX className="h-7 w-7" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-ink">Không tìm thấy kết quả</h3>
                    <p className="mt-0.5 text-sm text-slate-600">
                      Thử từ khóa khác hoặc xóa bộ lọc. Bên dưới là một số thiết bị bạn có thể thích.
                    </p>
                  </div>
                  {hasAnyFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        resetFilters();
                        setLocalKeyword('');
                      }}
                      className="shrink-0 rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-blue"
                    >
                      Xóa bộ lọc
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => updateFilters({ page: currentPage - 1 })}
                    aria-label="Trang trước"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition disabled:opacity-40"
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
                        type="button"
                        onClick={() => updateFilters({ page: p })}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold transition',
                          active ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand/50',
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => updateFilters({ page: currentPage + 1 })}
                    aria-label="Trang sau"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Keeps the page full when the search itself returns little */}
              {sparse && suggestions.length > 0 && (
                <section
                  id="search-suggestions"
                  className={cn('scroll-mt-28', items.length === 0 ? 'mt-6' : 'mt-12 border-t border-slate-200 pt-10')}
                >
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                    <Sparkles className="h-3.5 w-3.5" /> {popular.data?.personal ? 'Dành riêng cho bạn' : 'Gợi ý cho bạn'}
                  </span>
                  <h2 className="mt-3 text-xl font-extrabold tracking-tight text-ink">Có thể bạn quan tâm</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {dateFrom && dateTo
                      ? 'Những thiết bị còn trống trong ngày bạn chọn, ưu tiên cùng loại và được đánh giá cao.'
                      : popular.data?.personal
                        ? 'Dựa trên những thiết bị bạn đã thuê, đã lưu hoặc đánh giá cao.'
                        : 'Những thiết bị cùng loại hoặc được đánh giá cao trên FlexTrip, ngoài các kết quả bạn vừa tìm.'}
                  </p>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {suggestions.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
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
