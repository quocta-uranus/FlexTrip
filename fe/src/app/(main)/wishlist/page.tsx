'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, LoaderCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ListingCard } from '@/components/listing-card';
import { wishlistApi } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth.store';
import { canUseAccountWishlist, useGuestWishlistIds, useWishlistPage } from '@/hooks/useWishlist';

export default function WishlistPage() {
  const [page, setPage] = useState(1);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accountMode = isAuthenticated && canUseAccountWishlist(user?.roles);
  const guestIds = useGuestWishlistIds();
  const accountQuery = useWishlistPage(page);
  const guestQuery = useQuery({
    queryKey: ['wishlist', 'guest-resolve', guestIds],
    queryFn: () => wishlistApi.resolveGuest(guestIds),
    enabled: !accountMode && guestIds.length > 0,
  });

  const listings = accountMode
    ? (accountQuery.data?.items.map((item) => item.listing) ?? [])
    : (guestQuery.data?.items ?? []);
  const isLoading = accountMode ? accountQuery.isLoading : guestQuery.isLoading;
  const error = accountMode ? accountQuery.error : guestQuery.error;
  const totalPages = accountMode ? (accountQuery.data?.totalPages ?? 1) : 1;

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#2a7bd9]">SRC-07</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0f1729]">Danh sách yêu thích</h1>
            <p className="mt-2 text-sm text-[#64748b]">
              {accountMode
                ? 'Được đồng bộ an toàn trên các thiết bị của bạn.'
                : 'Được lưu trên trình duyệt này và sẽ tự gộp sau khi bạn đăng nhập.'}
            </p>
          </div>
          <Heart className="hidden h-10 w-10 fill-rose-100 text-rose-500 sm:block" />
        </div>

        {isLoading && (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải danh sách yêu thích…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Không thể tải danh sách yêu thích. Vui lòng thử lại.
          </div>
        )}

        {!isLoading && !error && listings.length === 0 && (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
              <Heart className="h-7 w-7 text-rose-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Chưa có thiết bị yêu thích</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Nhấn biểu tượng trái tim trên thiết bị bạn quan tâm để lưu lại tại đây.
            </p>
            <Link href="/search" className="mt-5 rounded-full bg-[#2a7bd9] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2168b8]">
              Khám phá thiết bị
            </Link>
          </div>
        )}

        {listings.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
          </div>
        )}

        {accountMode && totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Trang trước
            </button>
            <span className="text-sm text-slate-600">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
