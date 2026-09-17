import Link from 'next/link';
import type { Listing } from '@/types/listing';
import { CATEGORY_LABELS } from '@/types/listing';

interface ListingCardProps {
  listing: Listing;
  href?: string;
}

function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <span className="flex items-center gap-1 text-xs">
      <svg className="h-3.5 w-3.5" fill="#f59e0b" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span style={{ color: '#0f1729' }} className="font-semibold">{rating.toFixed(1)}</span>
      {count != null && <span style={{ color: '#8694ad' }}>({count})</span>}
    </span>
  );
}

export function ListingCard({ listing, href }: ListingCardProps) {
  const dest = href ?? `/listings/${listing.id}`;
  const price = typeof listing.price === 'number' ? listing.price : Number(listing.price);
  const reviewCount = listing._count?.reviews ?? listing.reviews?.length ?? 0;
  const avgRating =
    listing.provider?.providerProfile?.ratingAvg ??
    (listing.reviews?.length
      ? listing.reviews.reduce((s, r) => s + r.rating, 0) / listing.reviews.length
      : 0);

  return (
    <Link
      href={dest}
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-all hover:-translate-y-1 hover:shadow-xl"
      style={{ borderColor: '#DCEFFB' }}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-[#f1f5fa]">
        {listing.imageUrls?.[0] ? (
          <img
            src={listing.imageUrls[0]}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">
            {listing.category === 'CAMPING_TREKKING' ? '⛺' :
             listing.category === 'VEHICLE' ? '🚵' :
             listing.category === 'STAY' ? '🏡' :
             listing.category === 'EXPERIENCE' ? '🌄' : '📦'}
          </div>
        )}

        {/* Category badge */}
        <span
          className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm"
          style={{ background: 'rgba(255,255,255,0.9)', color: '#2a7bd9' }}
        >
          {CATEGORY_LABELS[listing.category] ?? listing.category}
        </span>

        {/* Status badge for non-active */}
        {listing.status !== 'ACTIVE' && (
          <span
            className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
          >
            {listing.status === 'DRAFT' ? 'Bản nháp' : listing.status}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3
            className="line-clamp-2 text-sm font-semibold leading-snug flex-1"
            style={{ color: '#0f1729' }}
          >
            {listing.title}
          </h3>
        </div>

        <p className="mb-3 flex items-center gap-1 text-xs" style={{ color: '#8694ad' }}>
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{listing.location}</span>
        </p>

        {avgRating > 0 && (
          <div className="mb-3">
            <StarRating rating={avgRating} count={reviewCount} />
          </div>
        )}

        <div className="mt-auto flex items-end justify-between">
          <div>
            <span className="text-lg font-bold" style={{ color: '#2a7bd9' }}>
              {price.toLocaleString('vi-VN')}
            </span>
            <span className="ml-1 text-xs" style={{ color: '#8694ad' }}>
              {listing.currency ?? 'VND'}/ngày
            </span>
          </div>

          {listing.provider?.providerProfile?.shopName && (
            <span className="text-[11px] truncate max-w-[120px]" style={{ color: '#8694ad' }}>
              {listing.provider.providerProfile.shopName}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
