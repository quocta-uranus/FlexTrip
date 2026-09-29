'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useListing } from '@/hooks/useListings';
import { BookingWidget } from '@/components/listing/booking-widget';
import { CATEGORY_LABELS } from '@/types/listing';

function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className="h-4 w-4" fill={s <= Math.round(rating) ? '#f59e0b' : '#e2e8f3'} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-sm font-semibold" style={{ color: '#0f1729' }}>{rating.toFixed(1)}</span>
      {count != null && <span className="text-sm" style={{ color: '#8694ad' }}>({count} đánh giá)</span>}
    </span>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: listing, isLoading, error } = useListing(id);
  const [selectedImage, setSelectedImage] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen animate-pulse" style={{ background: '#f6fbfe' }}>
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="h-96 rounded-2xl bg-[#e2e8f3]" />
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-8 w-3/4 rounded bg-[#e2e8f3]" />
              <div className="h-4 w-1/2 rounded bg-[#e2e8f3]" />
              <div className="h-32 rounded bg-[#e2e8f3]" />
            </div>
            <div className="h-64 rounded-2xl bg-[#e2e8f3]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center" style={{ background: '#f6fbfe' }}>
        <span className="mb-4 text-6xl">😕</span>
        <h1 className="mb-2 text-xl font-bold" style={{ color: '#0f1729' }}>Không tìm thấy sản phẩm</h1>
        <p className="mb-6 text-sm" style={{ color: '#8694ad' }}>Sản phẩm không tồn tại hoặc đã bị gỡ.</p>
        <Link href="/search" className="rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: '#2a7bd9' }}>
          Quay lại tìm kiếm
        </Link>
      </div>
    );
  }

  const images = listing.imageUrls?.length > 0 ? listing.imageUrls : [];
  const reviews = listing.reviews ?? [];
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm" style={{ color: '#8694ad' }}>
          <Link href="/search" className="hover:underline" style={{ color: '#2a7bd9' }}>Tìm kiếm</Link>
          <span>/</span>
          <span>{CATEGORY_LABELS[listing.category] ?? listing.category}</span>
          <span>/</span>
          <span className="truncate max-w-xs" style={{ color: '#0f1729' }}>{listing.title}</span>
        </nav>

        {/* Gallery */}
        <div className="mb-8 overflow-hidden rounded-2xl">
          {images.length > 0 ? (
            <div className="grid gap-2" style={{ gridTemplateColumns: images.length > 1 ? '2fr 1fr' : '1fr' }}>
              <div className="relative overflow-hidden rounded-2xl" style={{ height: 420 }}>
                <img
                  src={images[selectedImage]}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                />
              </div>
              {images.length > 1 && (
                <div className="grid grid-rows-2 gap-2">
                  {images.slice(1, 3).map((url, i) => (
                    <button
                      key={url}
                      onClick={() => setSelectedImage(i + 1)}
                      className={`relative overflow-hidden rounded-xl transition-all ${selectedImage === i + 1 ? 'ring-2 ring-[#2a7bd9]' : ''}`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-96 items-center justify-center rounded-2xl text-7xl" style={{ background: '#f1f5fa' }}>
              {listing.category === 'CAMPING_TREKKING' ? '⛺' : listing.category === 'VEHICLE' ? '🚵' : '📦'}
            </div>
          )}
        </div>

        {/* Image thumbnails */}
        {images.length > 3 && (
          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {images.map((url, i) => (
              <button
                key={url}
                onClick={() => setSelectedImage(i)}
                className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg transition-all ${selectedImage === i ? 'ring-2 ring-[#2a7bd9]' : 'opacity-60 hover:opacity-100'}`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Content + booking sidebar */}
        <div className="grid gap-10 lg:grid-cols-3">
          {/* Left: details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title + meta */}
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
                  style={{ background: 'rgba(42,123,217,0.1)', color: '#2a7bd9' }}
                >
                  {CATEGORY_LABELS[listing.category] ?? listing.category}
                </span>
                {listing.status === 'ACTIVE' ? (
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                    Đang cho thuê
                  </span>
                ) : (
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#f1f5f9', color: '#475569' }}>
                    {listing.status}
                  </span>
                )}
              </div>
              <h1 className="mb-3 text-3xl font-bold leading-tight" style={{ color: '#0f1729' }}>
                {listing.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5 text-sm" style={{ color: '#8694ad' }}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {listing.location}
                </span>
                {avgRating > 0 && <StarRating rating={avgRating} count={reviews.length} />}
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="mb-3 text-xl font-semibold" style={{ color: '#0f1729' }}>Mô tả</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#5a6b85' }}>
                {listing.description}
              </p>
            </div>

            {/* Amenities */}
            {listing.amenities?.length > 0 && (
              <div>
                <h2 className="mb-3 text-xl font-semibold" style={{ color: '#0f1729' }}>Tiện ích & Thiết bị kèm theo</h2>
                <div className="flex flex-wrap gap-2">
                  {listing.amenities.map((a) => (
                    <span
                      key={a}
                      className="rounded-full border px-3 py-1.5 text-sm"
                      style={{ borderColor: '#DCEFFB', color: '#5a6b85', background: '#f6fbfe' }}
                    >
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Provider */}
            {listing.provider && (
              <div className="rounded-2xl border p-5" style={{ borderColor: '#DCEFFB' }}>
                <h2 className="mb-4 text-xl font-semibold" style={{ color: '#0f1729' }}>Thông tin Provider</h2>
                <div className="flex items-start gap-4">
                  {listing.provider.avatarUrl ? (
                    <img src={listing.provider.avatarUrl} alt={listing.provider.name} className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #2a7bd9, #92eee8)' }}>
                      {listing.provider.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold" style={{ color: '#0f1729' }}>
                      {listing.provider.providerProfile?.shopName ?? listing.provider.name}
                    </p>
                    {listing.provider.providerProfile && (
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs" style={{ color: '#8694ad' }}>
                        <span>⭐ {Number(listing.provider.providerProfile.ratingAvg).toFixed(1)} ({listing.provider.providerProfile.reviewsCount} đánh giá)</span>
                        <span>⏱ Phản hồi trong {listing.provider.providerProfile.responseHours}</span>
                      </div>
                    )}
                    <Link
                      href={`/messages?to=${listing.provider.id}`}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:shadow-sm"
                      style={{ borderColor: '#DCEFFB', color: '#2a7bd9' }}
                    >
                      💬 Liên hệ Provider
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div>
                <h2 className="mb-4 text-xl font-semibold" style={{ color: '#0f1729' }}>
                  Đánh giá ({reviews.length})
                </h2>
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((r) => (
                    <div key={r.id} className="rounded-xl border p-4" style={{ borderColor: '#DCEFFB' }}>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {r.author.avatarUrl ? (
                            <img src={r.author.avatarUrl} alt={r.author.name} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ background: 'linear-gradient(135deg, #2a7bd9, #92eee8)' }}>
                              {r.author.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-sm font-semibold" style={{ color: '#0f1729' }}>{r.author.name}</span>
                        </div>
                        <StarRating rating={r.rating} />
                      </div>
                      {r.comment && <p className="text-sm leading-relaxed" style={{ color: '#5a6b85' }}>{r.comment}</p>}
                      <p className="mt-2 text-xs" style={{ color: '#8694ad' }}>
                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking sidebar */}
          <div>
            <BookingWidget listing={listing} />
          </div>
        </div>
      </div>
    </div>
  );
}
