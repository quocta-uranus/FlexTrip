'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Star, ShieldCheck, Sparkles, RotateCw, ChevronDown, X } from 'lucide-react';
import { listingApi } from '@/lib/api/client';
import type { Listing, ListingCategory } from '@/types/listing';
import { LISTING_CATEGORIES, CATEGORY_META } from '@/constants/categories';
import { PillButton } from '@/components/ui/pill-button';
import { PillBadge } from '@/components/ui/pill-badge';

const POPULAR_LOCATIONS = [
  'Đà Lạt',
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Đà Nẵng',
  'Sapa',
  'Nha Trang',
];

function formatPrice(price: number): string {
  return `${Number(price).toLocaleString('vi-VN')}₫`;
}

function FeaturedCard({ listing }: { listing: Listing }) {
  const image = listing.imageUrls?.[0] || '/assets/camping.jpg';
  const meta = CATEGORY_META[listing.category];

  const ratingAvg = Number(listing.provider?.providerProfile?.ratingAvg ?? 0);
  const reviewCount = listing._count?.reviews ?? listing.reviews?.length ?? 0;
  const hasRating = Number.isFinite(ratingAvg) && ratingAvg > 0;

  return (
    <article className="group bg-white rounded-[32px] overflow-hidden border border-[#DCEFFB] shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col">
      {/* ── Image & Top Badges ── */}
      <div className="relative aspect-[4/3] overflow-hidden block bg-slate-100">
        <Link href={`/listings/${listing.id}`} className="block h-full w-full">
          <img
            src={image}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        {/* Ambient Top Shadow */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

        {/* Category Pill Badge */}
        <div className="absolute top-4 left-4 z-10">
          <PillBadge
            variant="stone"
            className="bg-white/95 backdrop-blur-md text-[#075D82] border-sky-200/80 text-xs font-semibold px-3 py-1 shadow-xs"
          >
            <span>{meta?.emoji ?? '🎒'}</span>
            <span className="ml-1">{meta?.label ?? listing.category}</span>
          </PillBadge>
        </div>

        {/* Location Badge on bottom of image */}
        <div className="absolute bottom-3.5 left-4 z-10 flex items-center gap-1.5 text-white text-xs font-medium drop-shadow-md">
          <MapPin className="h-3.5 w-3.5 text-[#00D8F6]" />
          <span className="line-clamp-1">{listing.location}</span>
        </div>
      </div>

      {/* ── Card Content ── */}
      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <Link href={`/listings/${listing.id}`} className="group-hover:text-[#00A3FF] transition-colors">
          <h3 className="text-lg sm:text-xl font-bold text-[#0A1C2A] leading-snug line-clamp-2 tracking-tight">
            {listing.title}
          </h3>
        </Link>

        {/* Provider trust status */}
        <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 text-[#075D82] font-medium bg-[#EBF7FD] px-2 py-0.5 rounded-full">
            <ShieldCheck className="h-3 w-3 text-[#00A3FF]" />
            {listing.provider?.providerProfile?.shopName || 'Chủ đồ xác minh'}
          </span>
        </div>

        {/* ── Price and Rating Footer ── */}
        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-lg sm:text-xl font-extrabold text-[#0A1C2A]">
              {formatPrice(listing.price)}
            </span>
            <span className="text-slate-500 font-medium"> / ngày</span>
          </div>

          {hasRating ? (
            <div className="flex items-center gap-1 text-[#0A1C2A] font-bold bg-[#FFF9EB] px-2.5 py-1 rounded-full border border-amber-200/60">
              <Star className="h-3.5 w-3.5 text-[#F4B942] fill-[#F4B942]" />
              <span>{ratingAvg.toFixed(1)}</span>
              {reviewCount > 0 && (
                <span className="text-slate-400 font-normal">({reviewCount})</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[#075D82] font-semibold bg-[#F1FAFF] px-2.5 py-1 rounded-full border border-sky-100">
              <Sparkles className="h-3 w-3 text-[#00A3FF]" />
              <span>Sẵn sàng thuê</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-[32px] overflow-hidden border border-[#DCEFFB] shadow-xs animate-pulse flex flex-col">
      <div className="aspect-[4/3] bg-slate-200" />
      <div className="p-6 space-y-3">
        <div className="h-3 w-28 bg-slate-200 rounded-full" />
        <div className="h-6 w-3/4 bg-slate-200 rounded-lg" />
        <div className="h-4 w-1/2 bg-slate-200 rounded-lg" />
        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
          <div className="h-5 w-24 bg-slate-200 rounded-md" />
          <div className="h-5 w-14 bg-slate-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function FeaturedSection() {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('');
  const [selectedLocation, setSelectedLocation] = React.useState<string>('');

  const hasActiveFilters = Boolean(selectedCategory || selectedLocation);

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedLocation('');
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['featured-listings', selectedCategory, selectedLocation],
    queryFn: () =>
      listingApi.list({
        limit: 6,
        category: (selectedCategory as ListingCategory) || undefined,
        location: selectedLocation || undefined,
      }),
    staleTime: 60 * 1000,
  });

  const listings = data?.items ?? [];

  return (
    <section className="pt-8 sm:pt-10 lg:pt-[40px] pb-14 sm:pb-16 lg:pb-[84px] px-4 sm:px-6 lg:px-10 max-w-[1380px] mx-auto" id="featured">
      {/* ── Section Header (Wayfare Left-Aligned Style) ── */}
      <div className="mb-10 sm:mb-12">
        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] text-[#00A3FF] mb-2.5 sm:mb-3">
          THIẾT BỊ NỔI BẬT
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#0A1C2A] tracking-tight leading-[1.14]">
          Tìm thiết bị phù hợp với bạn
        </h2>
        <p className="mt-3 text-sm sm:text-base text-[#475569] leading-relaxed max-w-[650px]">
          Khám phá thiết bị cho chuyến đi của bạn. Lọc theo danh mục và địa điểm để tìm lựa chọn phù hợp.
        </p>
      </div>

      {/* ── Wayfare Pill Filter Bar ── */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-10 sm:mb-12">
        <div className="inline-flex flex-wrap sm:flex-nowrap items-center gap-2 p-1.5 bg-white rounded-2xl sm:rounded-full border border-slate-200 shadow-xs">
          {/* Dropdown 1: Category */}
          <div className="relative flex items-center w-[165px] sm:w-[190px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`w-full appearance-none text-xs sm:text-sm font-semibold pl-4 pr-8 py-2.5 rounded-full border transition-all cursor-pointer focus:outline-none truncate ${
                selectedCategory
                  ? 'bg-[#EBF7FD] text-[#075D82] border-[#00A3FF]/40 font-bold'
                  : 'bg-[#F8FAFC] hover:bg-[#F1FAFF] text-[#0A1C2A] border-slate-200/80 hover:border-[#00A3FF]/40'
              }`}
            >
              <option value="">Tất cả danh mục</option>
              {LISTING_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-slate-400 pointer-events-none absolute right-3" />
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-slate-200 shrink-0" />

          {/* Dropdown 2: Location */}
          <div className="relative flex items-center w-[165px] sm:w-[190px]">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className={`w-full appearance-none text-xs sm:text-sm font-semibold pl-4 pr-8 py-2.5 rounded-full border transition-all cursor-pointer focus:outline-none truncate ${
                selectedLocation
                  ? 'bg-[#EBF7FD] text-[#075D82] border-[#00A3FF]/40 font-bold'
                  : 'bg-[#F8FAFC] hover:bg-[#F1FAFF] text-[#0A1C2A] border-slate-200/80 hover:border-[#00A3FF]/40'
              }`}
            >
              <option value="">Tất cả địa điểm</option>
              {POPULAR_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  📍 {loc}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-slate-400 pointer-events-none absolute right-3" />
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-full text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3-Column Equipment Grid ── */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-3xl bg-white border border-red-100 p-10 text-center max-w-lg mx-auto shadow-xs">
          <p className="text-sm font-semibold text-red-600 mb-4">
            Không thể tải danh sách thiết bị. Vui lòng kiểm tra lại kết nối.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[#EBF7FD] text-[#075D82] hover:bg-[#DCEFFB] transition-colors cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Thử tải lại</span>
          </button>
        </div>
      )}

      {!isLoading && !isError && listings.length === 0 && (
        <div className="rounded-3xl bg-white border border-[#DCEFFB] p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-[#EBF7FD] flex items-center justify-center text-3xl">
            🏕️
          </div>
          <h3 className="text-base font-bold text-[#0A1C2A]">
            Chưa có thiết bị nào phù hợp
          </h3>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            {hasActiveFilters
              ? 'Không tìm thấy thiết bị nào khớp với tiêu chí lọc đã chọn. Hãy thử xóa bộ lọc để xem các thiết bị khác.'
              : 'Hãy thử chọn danh mục khác hoặc trở thành người đầu tiên đăng cho thuê đồ trong khu vực của bạn!'}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-5 py-2 rounded-full text-xs font-bold bg-[#EBF7FD] text-[#075D82] hover:bg-[#DCEFFB] transition-colors cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            )}
            <Link
              href="/register-provider"
              className="px-5 py-2 rounded-full text-xs font-bold bg-[#00A3FF] text-white hover:brightness-110 transition-colors"
            >
              Đăng tin cho thuê
            </Link>
          </div>
        </div>
      )}

      {!isLoading && !isError && listings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {listings.map((listing) => (
            <FeaturedCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {/* ── Bottom Section CTA ── */}
      <div className="mt-14 sm:mt-18 text-center">
        <PillButton
          href={
            selectedCategory
              ? `/search?category=${selectedCategory}${selectedLocation ? `&location=${encodeURIComponent(selectedLocation)}` : ''}`
              : selectedLocation
              ? `/search?location=${encodeURIComponent(selectedLocation)}`
              : '/search'
          }
          variant="brand"
          size="lg"
        >
          Khám phá tất cả thiết bị
        </PillButton>
      </div>
    </section>
  );
}
