'use client';

import { useQuery } from '@tanstack/react-query';
import Link from "next/link";
import { MapPin, Star, ArrowRight, Heart } from "lucide-react";
import { listingApi } from '@/lib/api/client';
import type { Listing } from '@/types/listing';

function getListingTag(listing: Listing): string {
  const rating = Number(listing.provider?.providerProfile?.ratingAvg ?? 0);
  if (rating >= 4.8) return 'Được yêu thích';
  const responseH = listing.provider?.providerProfile?.responseHours;
  if (responseH && Number(responseH) <= 2) return 'Phản hồi nhanh';
  return 'Provider xác minh';
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('vi-VN')}đ`;
}

function ListingCard({ listing }: { listing: Listing }) {
  const image = listing.imageUrls[0] ?? '/assets/camping.jpg';
  const ratingAvg = listing.provider?.providerProfile?.ratingAvg;
  const rating = ratingAvg ? Number(ratingAvg).toFixed(1) : null;
  const reviewCount = listing._count?.reviews ?? 0;
  const tag = getListingTag(listing);

  return (
    <article className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-sky-100 transition-all duration-300 hover:-translate-y-1.5 flex flex-col">
      <Link href={`/listings/${listing.id}`} className="relative h-64 sm:h-72 overflow-hidden block">
        <img
          src={image}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute top-3.5 left-3.5 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold text-slate-800 shadow-sm">
          {tag}
        </span>
        <button
          aria-label={`Lưu ${listing.title}`}
          className="absolute top-3.5 right-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm transition-colors hover:text-red-500"
          type="button"
          onClick={(e) => e.preventDefault()}
        >
          <Heart className="h-4 w-4" />
        </button>
      </Link>

      <Link href={`/listings/${listing.id}`} className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#097dae]">
          <MapPin className="h-3.5 w-3.5" />
          <span>{listing.location}</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 mb-4 leading-snug group-hover:text-[#00b4ea] transition-colors tracking-tight line-clamp-2">
          {listing.title}
        </h3>

        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <div>
            <strong className="text-base text-slate-900 font-bold">{formatPrice(listing.price)}</strong>
            <span className="text-slate-500"> / ngày</span>
          </div>
          {rating && (
            <div className="flex items-center gap-1 text-slate-900 font-bold">
              <Star className="h-3.5 w-3.5 text-[#00b4ea] fill-[#00b4ea]" />
              <span>{rating}</span>
              {reviewCount > 0 && (
                <span className="text-slate-400 font-normal">({reviewCount})</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-sky-100 animate-pulse">
      <div className="h-64 sm:h-72 bg-slate-100" />
      <div className="p-6 space-y-3">
        <div className="h-3 w-24 bg-slate-100 rounded" />
        <div className="h-6 w-3/4 bg-slate-100 rounded" />
        <div className="h-4 w-1/2 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

export function FeaturedSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['featured-listings'],
    queryFn: () => listingApi.list({ status: 'ACTIVE', limit: 3 }),
    staleTime: 5 * 60 * 1000,
  });

  const listings = data?.items ?? [];

  return (
    <section className="bg-[#ebf7fd] py-20 px-6 sm:px-12 transition-colors duration-300" id="featured">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#00b4ea] mb-3">
            <span className="h-[1px] w-6 bg-current" />
            Được cộng đồng lựa chọn
          </p>
          <h2 className="text-3xl sm:text-5xl lg:text-[46px] font-extrabold text-slate-900 leading-tight tracking-tight">
            Thiết bị cho chuyến đi<br />
            <em className="not-italic text-[#097dae]">gần hơn bạn nghĩ.</em>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600">
            Khám phá một vài thiết bị nổi bật từ các Provider trên FlexTrip.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {isLoading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          {isError && (
            <p className="col-span-3 text-center text-sm text-slate-400 py-8">
              Không thể tải danh sách thiết bị. Vui lòng thử lại sau.
            </p>
          )}
          {!isLoading && !isError && listings.length === 0 && (
            <p className="col-span-3 text-center text-sm text-slate-400 py-8">
              Chưa có thiết bị nào được đăng.
            </p>
          )}
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 font-bold text-sm text-slate-900 hover:text-[#00b4ea] border-b-2 border-slate-900 pb-1 transition-colors"
          >
            <span>Xem tất cả thiết bị</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
