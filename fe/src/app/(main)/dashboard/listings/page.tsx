'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMyListings, useDeleteListing } from '@/hooks/useListings';
import { CATEGORY_LABELS } from '@/types/listing';

export default function ManageListingsPage() {
  const { data: listings, isLoading } = useMyListings();
  const { mutate: deleteListing, isPending: deleting } = useDeleteListing();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleDelete(id: string, title: string) {
    if (!confirm(`Bạn có chắc muốn xóa "${title}" không?`)) return;
    setDeletingId(id);
    deleteListing(id, {
      onSettled: () => setDeletingId(null),
    });
  }

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <nav className="mb-1 flex items-center gap-2 text-xs" style={{ color: '#8694ad' }}>
              <Link href="/dashboard" style={{ color: '#2a7bd9' }}>Dashboard</Link>
              <span>/</span>
              <span>Sản phẩm</span>
            </nav>
            <h1 className="text-2xl font-bold" style={{ color: '#0f1729' }}>Quản lý sản phẩm</h1>
          </div>
          <Link
            href="/dashboard/listings/new"
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: '#2a7bd9' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Thêm mới
          </Link>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex animate-pulse gap-4 rounded-2xl border bg-white p-4" style={{ borderColor: '#DCEFFB' }}>
                <div className="h-20 w-28 rounded-xl bg-[#e2e8f3]" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-[#e2e8f3]" />
                  <div className="h-3 w-1/2 rounded bg-[#e2e8f3]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!listings || listings.length === 0) && (
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-white py-20" style={{ borderColor: '#DCEFFB' }}>
            <span className="mb-4 text-6xl">🏕️</span>
            <h3 className="mb-2 text-lg font-semibold" style={{ color: '#0f1729' }}>Chưa có sản phẩm nào</h3>
            <p className="mb-6 text-sm" style={{ color: '#8694ad' }}>Tạo sản phẩm đầu tiên để bắt đầu cho thuê.</p>
            <Link href="/dashboard/listings/new" className="rounded-full px-6 py-2.5 text-sm font-semibold text-white" style={{ background: '#2a7bd9' }}>
              Tạo sản phẩm
            </Link>
          </div>
        )}

        {/* Listings table-style */}
        {!isLoading && listings && listings.length > 0 && (
          <div className="space-y-3">
            {listings.map((listing) => {
              const price = typeof listing.price === 'number' ? listing.price : Number(listing.price);
              const isDeleting = deletingId === listing.id;
              return (
                <div
                  key={listing.id}
                  className="flex items-center gap-4 rounded-2xl border bg-white p-4 transition-all hover:shadow-sm"
                  style={{ borderColor: '#DCEFFB', opacity: isDeleting ? 0.5 : 1 }}
                >
                  {/* Thumbnail */}
                  <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-[#f1f5fa]">
                    {listing.imageUrls?.[0] ? (
                      <img src={listing.imageUrls[0]} alt={listing.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">
                        {listing.category === 'CAMPING_TREKKING' ? '⛺' : listing.category === 'VEHICLE' ? '🚵' : '📦'}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#2a7bd9' }}>
                        {CATEGORY_LABELS[listing.category] ?? listing.category}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={listing.status === 'ACTIVE'
                          ? { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }
                          : { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }
                        }
                      >
                        {listing.status === 'ACTIVE' ? 'Đang cho thuê' : listing.status === 'DRAFT' ? 'Bản nháp' : listing.status}
                      </span>
                    </div>
                    <p className="font-semibold truncate" style={{ color: '#0f1729' }}>{listing.title}</p>
                    <p className="mt-0.5 text-xs truncate" style={{ color: '#8694ad' }}>{listing.location}</p>
                  </div>

                  {/* Price */}
                  <div className="shrink-0 text-right hidden sm:block">
                    <p className="text-lg font-bold" style={{ color: '#2a7bd9' }}>
                      {price.toLocaleString('vi-VN')}
                    </p>
                    <p className="text-xs" style={{ color: '#8694ad' }}>{listing.currency ?? 'VND'}/ngày</p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/listings/${listing.id}`}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#f1f5fa]"
                      style={{ borderColor: '#DCEFFB', color: '#5a6b85' }}
                    >
                      Xem
                    </Link>
                    <Link
                      href={`/dashboard/listings/${listing.id}/edit`}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#f6fbfe]"
                      style={{ borderColor: '#2a7bd9', color: '#2a7bd9' }}
                    >
                      Sửa
                    </Link>
                    <button
                      id={`delete-listing-${listing.id}`}
                      onClick={() => handleDelete(listing.id, listing.title)}
                      disabled={isDeleting}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-red-50 disabled:opacity-50"
                      style={{ borderColor: '#fca5a5', color: '#dc2626' }}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
