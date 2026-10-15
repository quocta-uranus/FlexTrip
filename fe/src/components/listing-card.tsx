'use client';

import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import type { Listing } from '@/types/listing';
import { CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_META } from '@/types/listing';
import { WishlistButton } from '@/components/wishlist-button';

interface ListingCardProps {
  listing: Listing;
  href?: string;
}

export function ListingCard({ listing, href }: ListingCardProps) {
  const dest = href ?? `/listings/${listing.id}`;
  const price = typeof listing.price === 'number' ? listing.price : Number(listing.price);
  const reviewCount = listing._count?.reviews ?? listing.reviews?.length ?? 0;
  const providerRating = Number(listing.provider?.providerProfile?.ratingAvg);
  const avgRating = Number.isFinite(providerRating) && providerRating > 0
    ? providerRating
    : listing.reviews?.length
      ? listing.reviews.reduce((s, r) => s + r.rating, 0) / listing.reviews.length
      : 0;

  const meta = CATEGORY_META[listing.category];
  const catColor = meta?.color ?? '#2a7bd9';
  const catBg = meta?.bg ?? '#eff6ff';

  return (
    <Link
      href={dest}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}
    >
      {/* ── Image ── */}
      <div className="relative overflow-hidden" style={{ height: 210 }}>
        {listing.imageUrls?.[0] ? (
          <img
            src={listing.imageUrls[0]}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl" style={{ background: catBg }}>
            {CATEGORY_ICONS[listing.category] ?? '📦'}
          </div>
        )}

        {/* gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 55%)' }} />

        {/* category pill */}
        <span
          className="absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
          style={{ background: 'rgba(255,255,255,0.92)', color: catColor, backdropFilter: 'blur(8px)' }}
        >
          <span>{CATEGORY_ICONS[listing.category]}</span>
          {CATEGORY_LABELS[listing.category] ?? listing.category}
        </span>

        {/* heart button */}
        <WishlistButton
          listingId={listing.id}
          ownerId={listing.providerId}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-all hover:scale-110"
        />

        {/* price on image */}
        <div className="absolute bottom-3 left-3">
          <span className="text-xl font-extrabold text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
            {price.toLocaleString('vi-VN')}
          </span>
          <span className="ml-1 text-xs font-medium text-white/80">₫/ngày</span>
        </div>

        {listing.status !== 'ACTIVE' && (
          <span
            className="absolute bottom-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
          >
            {listing.status === 'DRAFT' ? 'Bản nháp' : listing.status}
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug" style={{ color: '#0f1729' }}>
          {listing.title}
        </h3>

        <div className="flex items-center gap-1 text-xs" style={{ color: '#8694ad' }}>
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{listing.location}</span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
          {avgRating > 0 ? (
            <span className="flex items-center gap-1 text-xs">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold" style={{ color: '#0f1729' }}>{avgRating.toFixed(1)}</span>
              <span style={{ color: '#94a3b8' }}>({reviewCount})</span>
            </span>
          ) : (
            <span className="text-xs" style={{ color: '#94a3b8' }}>Chưa có đánh giá</span>
          )}

          {listing.amenities?.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: catBg, color: catColor }}
            >
              {listing.amenities.length} tiện ích
            </span>
          )}
        </div>

        {listing.provider?.providerProfile?.shopName && (
          <p className="truncate text-[11px]" style={{ color: '#94a3b8' }}>
            🏪 {listing.provider.providerProfile.shopName}
          </p>
        )}
      </div>
    </Link>
  );
}
