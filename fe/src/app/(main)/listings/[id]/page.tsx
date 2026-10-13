'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Star, ChevronLeft, ChevronRight, Share2,
  Shield, Clock, Tag, MessageCircle, Package,
} from 'lucide-react';
import { useListing } from '@/hooks/useListings';
import { BookingWidget } from '@/components/listing/booking-widget';
import { CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_META } from '@/types/listing';
import { useListingReviews } from '@/hooks/useReviews';
import { ReputationBadge } from '@/components/reputation/reputation-badge';
import { WishlistButton } from '@/components/wishlist-button';

function StarRating({ rating, count, size = 'md' }: { rating: number; count?: number; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'h-5 w-5' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const textSz = size === 'lg' ? 'text-base' : size === 'sm' ? 'text-xs' : 'text-sm';
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={sz} fill={s <= Math.round(rating) ? '#f59e0b' : '#e2e8f3'} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className={`ml-0.5 font-bold ${textSz}`} style={{ color: '#0f1729' }}>{rating.toFixed(1)}</span>
      {count != null && <span className={`${textSz}`} style={{ color: '#8694ad' }}>({count} đánh giá)</span>}
    </span>
  );
}

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-2 text-right font-medium" style={{ color: '#5a6b85' }}>{star}</span>
      <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
      <div className="flex-1 overflow-hidden rounded-full bg-slate-100" style={{ height: 6 }}>
        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-4 text-right" style={{ color: '#8694ad' }}>{count}</span>
    </div>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: listing, isLoading, error } = useListing(id);
  const { data: publicReviews } = useListingReviews(id);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen animate-pulse" style={{ background: '#f8fafc' }}>
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="rounded-3xl bg-slate-200" style={{ height: 460 }} />
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-8 w-3/4 rounded-xl bg-slate-200" />
              <div className="h-4 w-1/2 rounded-xl bg-slate-200" />
              <div className="h-32 rounded-xl bg-slate-200" />
            </div>
            <div className="h-64 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: '#f8fafc' }}>
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl text-5xl" style={{ background: '#f1f5f9' }}>😕</div>
        <h1 className="text-xl font-bold" style={{ color: '#0f1729' }}>Không tìm thấy sản phẩm</h1>
        <p className="text-sm" style={{ color: '#8694ad' }}>Sản phẩm không tồn tại hoặc đã bị gỡ.</p>
        <Link href="/search" className="rounded-full px-6 py-2.5 text-sm font-bold text-white" style={{ background: '#2a7bd9' }}>
          Quay lại tìm kiếm
        </Link>
      </div>
    );
  }

  const images = listing.imageUrls?.length > 0 ? listing.imageUrls : [];
  const reviews = publicReviews ?? listing.reviews ?? [];
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const providerBadges = reviews[0]?.targetBadges ?? [];
  const meta = CATEGORY_META[listing.category];
  const price = typeof listing.price === 'number' ? listing.price : Number(listing.price);

  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 4);

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">

        {/* ── Breadcrumb ── */}
        <nav className="mb-5 flex items-center gap-1.5 text-sm" style={{ color: '#94a3b8' }}>
          <Link href="/search" className="flex items-center gap-1 font-medium transition-colors hover:text-[#2a7bd9]" style={{ color: '#2a7bd9' }}>
            <ChevronLeft className="h-4 w-4" />
            Tìm kiếm
          </Link>
          <span>/</span>
          <span>{CATEGORY_LABELS[listing.category] ?? listing.category}</span>
          <span>/</span>
          <span className="max-w-xs truncate font-medium" style={{ color: '#0f1729' }}>{listing.title}</span>
        </nav>

        {/* ── Gallery ── */}
        <div className="mb-8 overflow-hidden rounded-3xl">
          {images.length > 0 ? (
            <div className="grid gap-2" style={{ gridTemplateColumns: images.length > 1 ? '3fr 1fr' : '1fr', height: 460 }}>
              {/* Main image */}
              <div className="relative overflow-hidden rounded-2xl">
                <img src={images[selectedImage]} alt={listing.title} className="h-full w-full object-cover" />
                {/* nav arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImage((i) => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md transition-all hover:bg-white hover:scale-105"
                    >
                      <ChevronLeft className="h-4 w-4" style={{ color: '#0f1729' }} />
                    </button>
                    <button
                      onClick={() => setSelectedImage((i) => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md transition-all hover:bg-white hover:scale-105"
                    >
                      <ChevronRight className="h-4 w-4" style={{ color: '#0f1729' }} />
                    </button>
                  </>
                )}
                {/* action buttons */}
                <div className="absolute right-3 top-3 flex gap-2">
                  <WishlistButton
                    listingId={listing.id}
                    ownerId={listing.providerId}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm hover:bg-white transition-all"
                  />
                  <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm hover:bg-white transition-all">
                    <Share2 className="h-4 w-4" style={{ color: '#5a6b85' }} />
                  </button>
                </div>
                {/* counter */}
                <div className="absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ background: 'rgba(0,0,0,0.55)' }}>
                  {selectedImage + 1} / {images.length}
                </div>
              </div>

              {/* Thumbnails column */}
              {images.length > 1 && (
                <div className="flex flex-col gap-2">
                  {images.slice(1, 4).map((url, i) => (
                    <button
                      key={url}
                      onClick={() => setSelectedImage(i + 1)}
                      className={`relative flex-1 overflow-hidden rounded-xl transition-all ${selectedImage === i + 1 ? 'ring-2 ring-[#2a7bd9]' : 'opacity-80 hover:opacity-100'}`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      {i === 2 && images.length > 4 && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 text-sm font-bold text-white">
                          +{images.length - 4}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div
              className="flex items-center justify-center rounded-3xl text-8xl"
              style={{ height: 420, background: meta?.bg ?? '#f1f5fa' }}
            >
              {CATEGORY_ICONS[listing.category] ?? '📦'}
            </div>
          )}
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">

          {/* ── Left: content ── */}
          <div className="space-y-8">

            {/* Title + meta */}
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                  style={{ background: meta?.bg ?? '#eff6ff', color: meta?.color ?? '#2a7bd9' }}
                >
                  <span>{CATEGORY_ICONS[listing.category]}</span>
                  {CATEGORY_LABELS[listing.category] ?? listing.category}
                </span>
                {listing.status === 'ACTIVE' ? (
                  <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}>
                    ✓ Đang cho thuê
                  </span>
                ) : (
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: '#f1f5f9', color: '#475569' }}>
                    {listing.status}
                  </span>
                )}
              </div>

              <h1 className="mb-3 text-2xl font-extrabold leading-tight sm:text-3xl" style={{ color: '#0f1729' }}>
                {listing.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5" style={{ color: '#5a6b85' }}>
                  <MapPin className="h-4 w-4 shrink-0" style={{ color: '#94a3b8' }} />
                  {listing.location}
                </span>
                {avgRating > 0 && (
                  <StarRating rating={avgRating} count={reviews.length} />
                )}
              </div>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { Icon: Tag, label: 'Danh mục', value: CATEGORY_LABELS[listing.category] ?? listing.category },
                { Icon: MapPin, label: 'Địa điểm', value: listing.location },
                {
                  Icon: Package,
                  label: 'Số lượng',
                  value: `${(listing as { quantity?: number }).quantity ?? 1} sản phẩm`,
                },
                {
                  Icon: Clock,
                  label: 'Phản hồi',
                  value: listing.provider?.providerProfile?.responseHours ?? '< 2 giờ',
                },
              ].map(({ Icon, label, value }) => (
                <div
                  key={label}
                  className="flex flex-col gap-2 rounded-2xl p-4"
                  style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
                >
                  <Icon className="h-5 w-5" style={{ color: meta?.color ?? '#2a7bd9' }} />
                  <p className="text-xs" style={{ color: '#94a3b8' }}>{label}</p>
                  <p className="text-sm font-semibold truncate" style={{ color: '#0f1729' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            <div
              className="rounded-2xl p-6"
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
            >
              <h2 className="mb-4 text-lg font-bold" style={{ color: '#0f1729' }}>Mô tả sản phẩm</h2>
              <div
                className="relative overflow-hidden text-sm leading-relaxed whitespace-pre-line"
                style={{
                  color: '#5a6b85',
                  maxHeight: descExpanded ? 'none' : 160,
                }}
              >
                {listing.description}
                {!descExpanded && listing.description?.length > 300 && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-12"
                    style={{ background: 'linear-gradient(to top, #fff, transparent)' }}
                  />
                )}
              </div>
              {listing.description?.length > 300 && (
                <button
                  onClick={() => setDescExpanded((v) => !v)}
                  className="mt-3 text-sm font-semibold"
                  style={{ color: '#2a7bd9' }}
                >
                  {descExpanded ? 'Thu gọn ▲' : 'Xem thêm ▼'}
                </button>
              )}
            </div>

            {/* Amenities */}
            {listing.amenities?.length > 0 && (
              <div
                className="rounded-2xl p-6"
                style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
              >
                <h2 className="mb-4 text-lg font-bold" style={{ color: '#0f1729' }}>
                  Tiện ích & Thiết bị kèm theo
                </h2>
                <div className="flex flex-wrap gap-2">
                  {listing.amenities.map((a) => (
                    <span
                      key={a}
                      className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium"
                      style={{ borderColor: '#e8eef5', background: meta?.bg ?? '#f8fafc', color: '#5a6b85' }}
                    >
                      <span className="text-base">✓</span>
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Provider info */}
            {listing.provider && (
              <div
                className="rounded-2xl p-6"
                style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
              >
                <h2 className="mb-5 text-lg font-bold" style={{ color: '#0f1729' }}>Thông tin người cho thuê</h2>
                <div className="flex items-start gap-4">
                  {listing.provider.avatarUrl ? (
                    <img src={listing.provider.avatarUrl} alt={listing.provider.name} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #2a7bd9, #92eee8)' }}
                    >
                      {listing.provider.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold" style={{ color: '#0f1729' }}>
                      {listing.provider.providerProfile?.shopName ?? listing.provider.name}
                    </p>
                    {listing.provider.providerProfile && (
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs" style={{ color: '#8694ad' }}>
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {Number(listing.provider.providerProfile.ratingAvg).toFixed(1)} · {listing.provider.providerProfile.reviewsCount} đánh giá
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Phản hồi {listing.provider.providerProfile.responseHours}
                        </span>
                      </div>
                    )}
                    {providerBadges.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {providerBadges.map((badge) => <ReputationBadge key={badge.code} badge={badge} />)}
                      </div>
                    )}
                    <Link
                      href={`/messages?to=${listing.provider.id}`}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all hover:shadow-sm"
                      style={{ borderColor: '#2a7bd9', color: '#2a7bd9' }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Liên hệ ngay
                    </Link>
                  </div>
                </div>

                {/* Trust signals */}
                <div className="mt-5 grid grid-cols-3 gap-3 border-t pt-4" style={{ borderColor: '#f1f5f9' }}>
                  {[
                    { icon: '🛡️', label: 'Đã xác minh' },
                    { icon: '⚡', label: 'Phản hồi nhanh' },
                    { icon: '🏆', label: 'Cho thuê nhiều' },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex items-center gap-2 text-xs" style={{ color: '#5a6b85' }}>
                      <span>{icon}</span>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div
                className="rounded-2xl p-6"
                style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
              >
                <div className="mb-6 flex items-start gap-8">
                  {/* Overall score */}
                  <div className="text-center">
                    <div className="text-5xl font-extrabold" style={{ color: '#0f1729' }}>
                      {avgRating.toFixed(1)}
                    </div>
                    <StarRating rating={avgRating} size="sm" />
                    <p className="mt-1 text-xs" style={{ color: '#94a3b8' }}>{reviews.length} đánh giá</p>
                  </div>

                  {/* Rating breakdown */}
                  <div className="flex-1 space-y-1.5">
                    {ratingDist.map(({ star, count }) => (
                      <RatingBar key={star} star={star} count={count} total={reviews.length} />
                    ))}
                  </div>
                </div>

                <h2 className="mb-4 text-lg font-bold" style={{ color: '#0f1729' }}>
                  Đánh giá từ khách thuê
                </h2>

                <div className="space-y-4">
                  {displayedReviews.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl p-4"
                      style={{ background: '#f8fafc', border: '1px solid rgba(0,0,0,0.04)' }}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {r.author.avatarUrl ? (
                            <img src={r.author.avatarUrl} alt={r.author.name} className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                              style={{ background: 'linear-gradient(135deg, #2a7bd9, #92eee8)' }}
                            >
                              {r.author.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold" style={{ color: '#0f1729' }}>{r.author.name}</p>
                            <p className="text-xs" style={{ color: '#94a3b8' }}>
                              {new Date(r.createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <StarRating rating={r.rating} size="sm" />
                      </div>

                      {r.authorBadges && r.authorBadges.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          {r.authorBadges.map((badge) => <ReputationBadge key={badge.code} badge={badge} />)}
                        </div>
                      )}

                      {r.comment && (
                        <p className="text-sm leading-relaxed" style={{ color: '#5a6b85' }}>{r.comment}</p>
                      )}

                      {r.response && (
                        <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(42,123,217,0.06)', border: '1px solid rgba(42,123,217,0.12)' }}>
                          <div className="mb-1 flex items-center gap-2">
                            <Shield className="h-3.5 w-3.5" style={{ color: '#2a7bd9' }} />
                            <p className="text-xs font-bold" style={{ color: '#2a7bd9' }}>Phản hồi từ người cho thuê</p>
                            {r.targetBadges?.map((badge) => <ReputationBadge key={badge.code} badge={badge} />)}
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#5a6b85' }}>{r.response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {reviews.length > 4 && (
                  <button
                    onClick={() => setShowAllReviews((v) => !v)}
                    className="mt-4 w-full rounded-2xl border py-3 text-sm font-semibold transition-all hover:bg-slate-50"
                    style={{ borderColor: '#e2e8f0', color: '#5a6b85' }}
                  >
                    {showAllReviews ? 'Thu gọn ▲' : `Xem tất cả ${reviews.length} đánh giá ▼`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Right: booking sidebar ── */}
          <div>
            {/* Price header (mobile) */}
            <div className="mb-4 rounded-2xl p-4 lg:hidden" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}>
              <span className="text-2xl font-extrabold" style={{ color: '#2a7bd9' }}>
                {price.toLocaleString('vi-VN')} ₫
              </span>
              <span className="text-sm" style={{ color: '#94a3b8' }}> / ngày</span>
            </div>

            <BookingWidget listing={listing} />
          </div>
        </div>
      </div>
    </div>
  );
}
