'use client';

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Star, ChevronLeft, ChevronDown, ChevronUp,
  Clock, Tag, MessageCircle, Package, Check, BadgeCheck, Zap, Trophy, SearchX,
} from 'lucide-react';
import { useListing } from '@/hooks/useListings';
import { BookingWidget } from '@/components/listing/booking-widget';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/listing';
import { useListingReviews } from '@/hooks/useReviews';
import { ReputationBadge } from '@/components/reputation/reputation-badge';
import { WishlistButton } from '@/components/wishlist-button';
import { RecommendationRow } from '@/components/recommendations/recommendation-row';
import { useSimilarListings } from '@/hooks/useRecommendations';
import { cn } from '@/lib/utils';
import { Avatar, StarRating } from '@/components/listing/rating-parts';
import { ReviewsSection } from '@/components/listing/review-section';

const EYEBROW = 'text-xs font-semibold uppercase tracking-[0.16em] text-slate-500';
const SECTION_TITLE = 'font-display text-2xl font-medium tracking-[-0.02em] text-ink';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: listing, isLoading, error } = useListing(id);
  const { data: publicReviews } = useListingReviews(id);
  const [selectedImage, setSelectedImage] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const similar = useSimilarListings(id);

  if (isLoading) {
    return (
      <div className="min-h-screen animate-pulse bg-white">
        <div className="mx-auto max-w-7xl px-4 pt-28 sm:px-6">
          <div className="h-4 w-48 rounded bg-slate-200" />
          <div className="mt-4 h-12 w-2/3 rounded-2xl bg-slate-200" />
          <div className="mt-8 h-[460px] rounded-3xl bg-slate-200" />
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              <div className="h-24 rounded-3xl bg-slate-200" />
              <div className="h-40 rounded-3xl bg-slate-200" />
            </div>
            <div className="h-72 rounded-3xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-brand-blue shadow-soft">
          <SearchX className="h-9 w-9" />
        </span>
        <h1 className="text-xl font-bold text-ink">Không tìm thấy sản phẩm</h1>
        <p className="text-sm text-slate-500">Sản phẩm không tồn tại hoặc đã bị gỡ.</p>
        <Link href="/search" className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-blue">
          Quay lại tìm kiếm
        </Link>
      </div>
    );
  }

  const images = listing.imageUrls?.length > 0 ? listing.imageUrls : [];
  const reviews = publicReviews ?? listing.reviews ?? [];
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const providerBadges = reviews[0]?.targetBadges ?? [];
  const price = typeof listing.price === 'number' ? listing.price : Number(listing.price);
  const categoryLabel = CATEGORY_LABELS[listing.category] ?? listing.category;

  // Only the first three photos are laid out; any others are counted on the last small tile.
  const sideImages = images.slice(1, 3).map((url, i) => ({ url, index: i + 1 }));
  const hiddenCount = Math.max(images.length - 3, 0);

  const longDescription = listing.description?.length > 300;

  const stats = [
    { Icon: Tag, label: 'Danh mục', value: categoryLabel },
    { Icon: MapPin, label: 'Địa điểm', value: listing.location },
    { Icon: Package, label: 'Số lượng', value: `${(listing as { quantity?: number }).quantity ?? 1} sản phẩm` },
    { Icon: Clock, label: 'Phản hồi', value: listing.provider?.providerProfile?.responseHours ?? '< 2 giờ' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">

        {/* ── Breadcrumb ── */}
        <nav className={cn('mb-4 flex items-center gap-2', EYEBROW)}>
          <Link href="/search" className="flex items-center gap-1 text-brand-blue transition-colors hover:text-ink">
            <ChevronLeft className="h-3.5 w-3.5" />
            Tìm kiếm
          </Link>
          <span>/</span>
          <span>{categoryLabel}</span>
          <span className="hidden sm:inline">/</span>
          <span className="hidden max-w-xs truncate text-ink sm:inline">{listing.title}</span>
        </nav>

        {/* ── Title ── */}
        <header className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-700">
              <span>{CATEGORY_ICONS[listing.category]}</span>
              {categoryLabel}
            </span>
            {listing.status === 'ACTIVE' ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                <Check className="h-3.5 w-3.5" /> Đang cho thuê
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{listing.status}</span>
            )}
          </div>

          <div className="flex items-start justify-between gap-4">
            <h1 className="font-display max-w-4xl !text-4xl font-medium !leading-[1.05] tracking-[-0.03em] text-ink sm:!text-5xl">
              {listing.title}
            </h1>
            <WishlistButton
              listingId={listing.id}
              ownerId={listing.providerId}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sky-100 bg-white shadow-soft transition hover:border-brand/50"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5 text-slate-600">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
              {listing.location}
            </span>
            {avgRating > 0 && <StarRating rating={avgRating} count={reviews.length} />}
          </div>
        </header>

        {/* ── Gallery ── */}
        <div className="mb-10">
          {images.length > 0 ? (
            <>
              {/* Fixed height with an explicit single row, so a tall photo can never stretch the grid */}
              <div
                className={cn(
                  'grid h-[320px] grid-rows-[minmax(0,1fr)] gap-3 sm:h-[420px] lg:h-[480px]',
                  sideImages.length > 0 ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : 'grid-cols-1',
                )}
              >
                <div className="relative min-h-0 overflow-hidden rounded-3xl bg-slate-100">
                  {images.length > 1 ? (
                    <button
                      type="button"
                      aria-label="Xem ảnh tiếp theo"
                      onClick={() => setSelectedImage((i) => (i + 1) % images.length)}
                      className="absolute inset-0 cursor-pointer"
                    >
                      <img src={images[selectedImage]} alt={listing.title} className="h-full w-full object-cover" />
                    </button>
                  ) : (
                    <img src={images[selectedImage]} alt={listing.title} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                </div>

                {sideImages.length > 0 && (
                  <div className={cn('hidden min-h-0 gap-3 lg:grid', sideImages.length > 1 ? 'grid-rows-2' : 'grid-rows-1')}>
                    {sideImages.map(({ url, index }, i) => (
                      <button
                        type="button"
                        key={url}
                        aria-label={`Xem ảnh ${index + 1}`}
                        onClick={() => setSelectedImage(i === sideImages.length - 1 && hiddenCount > 0 ? 3 : index)}
                        className={cn(
                          'relative min-h-0 overflow-hidden rounded-3xl bg-slate-100 transition',
                          selectedImage === index ? 'ring-2 ring-brand ring-offset-2' : 'opacity-90 hover:opacity-100',
                        )}
                      >
                        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        {i === sideImages.length - 1 && hiddenCount > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-bold text-white">
                            +{hiddenCount}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phones have no side column, so every photo gets a small thumbnail under the main one */}
              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                  {images.map((url, index) => (
                    <button
                      type="button"
                      key={url}
                      aria-label={`Xem ảnh ${index + 1}`}
                      onClick={() => setSelectedImage(index)}
                      className={cn(
                        'h-16 w-20 shrink-0 overflow-hidden rounded-xl transition',
                        selectedImage === index ? 'ring-2 ring-brand ring-offset-1' : 'opacity-70',
                      )}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-3xl bg-sky-50 text-8xl sm:h-[420px]">
              {CATEGORY_ICONS[listing.category] ?? '📦'}
            </div>
          )}
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">

          {/* ── Left: content ── */}
          <div className="space-y-12">

            {/* Key stats */}
            <dl className="grid grid-cols-2 gap-y-6 rounded-3xl border border-sky-100 bg-white p-6 shadow-soft sm:grid-cols-4 sm:divide-x sm:divide-sky-100 sm:gap-y-0">
              {stats.map(({ Icon, label, value }) => (
                <div key={label} className="min-w-0 sm:px-5 sm:first:pl-0 sm:last:pr-0">
                  <dt className={cn('flex items-center gap-1.5', EYEBROW)}>
                    <Icon className="h-3.5 w-3.5 text-brand-blue" />
                    {label}
                  </dt>
                  <dd className="font-display mt-2 truncate text-lg font-semibold tracking-tight text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            {/* Description */}
            <section>
              <p className={EYEBROW}>Giới thiệu</p>
              <h2 className={cn('mt-2', SECTION_TITLE)}>Mô tả sản phẩm</h2>
              <div className="relative mt-4">
                <div className={cn('overflow-hidden whitespace-pre-line text-base leading-relaxed text-slate-600', !descExpanded && 'max-h-40')}>
                  {listing.description}
                </div>
                {!descExpanded && longDescription && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-white to-transparent" />
                )}
              </div>
              {longDescription && (
                <button
                  type="button"
                  onClick={() => setDescExpanded((v) => !v)}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:underline"
                >
                  {descExpanded ? <>Thu gọn <ChevronUp className="h-4 w-4" /></> : <>Xem thêm <ChevronDown className="h-4 w-4" /></>}
                </button>
              )}
            </section>

            {/* Amenities */}
            {listing.amenities?.length > 0 && (
              <section>
                <p className={EYEBROW}>Đi kèm</p>
                <h2 className={cn('mt-2', SECTION_TITLE)}>Tiện ích &amp; Thiết bị kèm theo</h2>
                <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {listing.amenities.map((a) => (
                    <li key={a} className="flex items-start gap-3 border-b border-sky-100 pb-3 text-[15px] font-medium text-slate-700">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand-blue">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {a}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Provider info */}
            {listing.provider && (
              <section>
                <p className={EYEBROW}>Người cho thuê</p>
                <h2 className={cn('mt-2', SECTION_TITLE)}>Thông tin người cho thuê</h2>
                <div className="mt-5 rounded-3xl border border-sky-100 bg-white p-6 shadow-soft">
                  <div className="flex items-start gap-4">
                    <Avatar src={listing.provider.avatarUrl} name={listing.provider.name} className="h-16 w-16 rounded-2xl text-2xl" />
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold tracking-tight text-ink">
                        {listing.provider.providerProfile?.shopName ?? listing.provider.name}
                      </p>
                      {listing.provider.providerProfile && (
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-500">
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
                        className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-brand-blue px-5 text-sm font-semibold text-brand-blue transition hover:bg-brand-blue hover:text-white"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Liên hệ ngay
                      </Link>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 border-t border-sky-100 pt-4 sm:grid-cols-3">
                    {[
                      { Icon: BadgeCheck, label: 'Đã xác minh' },
                      { Icon: Zap, label: 'Phản hồi nhanh' },
                      { Icon: Trophy, label: 'Cho thuê nhiều' },
                    ].map(({ Icon, label }) => (
                      <div key={label} className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
                        <Icon className="h-4 w-4 text-brand-blue" />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {reviews.length > 0 && <ReviewsSection reviews={reviews} />}
          </div>

          {/* ── Right: booking sidebar ── */}
          <div>
            <div className="mb-4 rounded-3xl border border-sky-100 bg-white p-5 shadow-soft lg:hidden">
              <span className="text-3xl font-medium tracking-tight text-brand-blue">{price.toLocaleString('vi-VN')} ₫</span>
              <span className="text-sm text-slate-400"> / ngày</span>
            </div>

            <BookingWidget listing={listing} />
          </div>
        </div>

        <div className="mt-14">
          <RecommendationRow
            title="Sản phẩm tương tự"
            items={similar.data?.items}
            isLoading={similar.isLoading}
          />
        </div>
      </div>
    </div>
  );
}
