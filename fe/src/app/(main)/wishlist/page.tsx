'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, ChevronLeft, ChevronRight, Heart, LoaderCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ListingCard } from '@/components/listing-card';
import { OptionSelect } from '@/components/search/option-select';
import { RecommendationRow } from '@/components/recommendations/recommendation-row';
import { wishlistApi } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth.store';
import { canUseAccountWishlist, useGuestWishlistIds, useWishlistPage } from '@/hooks/useWishlist';
import { useForYouListings } from '@/hooks/useRecommendations';
import { CATEGORY_LABELS } from '@/types/listing';
import { cn } from '@/lib/utils';

// The API returns up to 100 per page, so category counts and sorting cover the whole list for almost everyone.
const PAGE_SIZE = 100;

const SORTS = [
  { value: 'saved', label: 'Mới lưu nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
];

export default function WishlistPage() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('saved');
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accountMode = isAuthenticated && canUseAccountWishlist(user?.roles);
  const guestIds = useGuestWishlistIds();
  const accountQuery = useWishlistPage(page, PAGE_SIZE);
  const guestQuery = useQuery({
    queryKey: ['wishlist', 'guest-resolve', guestIds],
    queryFn: () => wishlistApi.resolveGuest(guestIds),
    enabled: !accountMode && guestIds.length > 0,
  });
  const forYou = useForYouListings(accountMode);

  const listings = useMemo(
    () => (accountMode ? (accountQuery.data?.items.map((item) => item.listing) ?? []) : (guestQuery.data?.items ?? [])),
    [accountMode, accountQuery.data, guestQuery.data],
  );
  const isLoading = accountMode ? accountQuery.isLoading : guestQuery.isLoading;
  const error = accountMode ? accountQuery.error : guestQuery.error;
  const totalPages = accountMode ? (accountQuery.data?.totalPages ?? 1) : 1;

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of listings) counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
    return [...counts.entries()];
  }, [listings]);
  // Removing the last saved item of a category must not leave the page filtered by a chip that is gone.
  const activeCategory = categories.some(([value]) => value === category) ? category : '';

  const visible = useMemo(() => {
    const filtered = activeCategory ? listings.filter((l) => l.category === activeCategory) : listings;
    if (sort === 'price_asc') return [...filtered].sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === 'price_desc') return [...filtered].sort((a, b) => Number(b.price) - Number(a.price));
    return filtered;
  }, [listings, activeCategory, sort]);

  const showChips = categories.length > 1;
  const showSort = listings.length > 1;
  const empty = !isLoading && !error && listings.length === 0;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28 lg:px-8">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Yêu thích</p>
          <h1 className="font-display mt-2 text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl">
            Danh sách yêu thích
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            {!isLoading && listings.length > 0 && (
              <>
                <span className="font-semibold text-ink">{accountQuery.data?.total ?? listings.length} thiết bị đã lưu</span>
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-slate-300" />
              </>
            )}
            <span>
              {accountMode
                ? 'Được đồng bộ an toàn trên các thiết bị của bạn.'
                : 'Được lưu trên trình duyệt này và sẽ tự gộp sau khi bạn đăng nhập.'}
            </span>
          </p>
        </div>

        {isLoading && (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải danh sách yêu thích…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
            Không thể tải danh sách yêu thích. Vui lòng thử lại.
          </div>
        )}

        {empty && (
          <>
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
                <Heart className="h-7 w-7 text-rose-400" />
              </span>
              <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-ink">Lưu lại những thiết bị bạn thích</h2>
              <p className="mt-2 max-w-md text-sm text-slate-600">
                Nhấn vào trái tim trên thiết bị bạn quan tâm để dễ so sánh và thuê lại sau.
              </p>
              <Link
                href="/search"
                className="mt-5 rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-brand/30 transition hover:bg-brand-blue"
              >
                Khám phá thiết bị
              </Link>
            </div>
            {accountMode && (
              <div className="mt-10">
                <RecommendationRow
                  title="Gợi ý để bắt đầu"
                  subtitle="Những thiết bị có thể hợp với bạn"
                  items={forYou.data?.items}
                  isLoading={forYou.isLoading}
                />
              </div>
            )}
          </>
        )}

        {listings.length > 0 && (
          <>
            {/* With one category or one item there is nothing to filter or sort, so the toolbar stays out of the way */}
            {(showChips || showSort) && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                {showChips ? (
                  <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Lọc theo danh mục">
                    {[['', listings.length] as const, ...categories].map(([value, count]) => {
                      const active = activeCategory === value;
                      return (
                        <button
                          key={value || 'all'}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setCategory(value)}
                          className={cn(
                            'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                            active
                              ? 'border-ink bg-ink text-white shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-brand/50 hover:text-brand-blue',
                          )}
                        >
                          {value ? (CATEGORY_LABELS[value as keyof typeof CATEGORY_LABELS] ?? value) : 'Tất cả'}
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[11px] font-bold',
                              active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                            )}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span />
                )}

                {showSort && (
                  <OptionSelect
                    appearance="chip"
                    className="w-52 shrink-0"
                    options={SORTS}
                    value={sort}
                    onChange={(next) => setSort(next || 'saved')}
                    placeholder="Sắp xếp"
                    title="Sắp xếp theo"
                    icon={ArrowUpDown}
                  />
                )}
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
            </div>
          </>
        )}

        {accountMode && totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              aria-label="Trang trước"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-slate-600">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
              aria-label="Trang sau"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {accountMode && listings.length > 0 && (
          <div className="mt-14">
            <RecommendationRow
              title="Có thể bạn cũng thích"
              subtitle="Gợi ý dựa trên những thiết bị bạn đã lưu"
              items={forYou.data?.items}
              isLoading={forYou.isLoading}
            />
          </div>
        )}
      </div>
    </main>
  );
}
