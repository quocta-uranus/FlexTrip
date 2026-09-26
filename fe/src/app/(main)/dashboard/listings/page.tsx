'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  useMyListings, useDeleteListing, usePublishListing,
  usePauseListing, useResumeListing, useBulkUpload,
} from '@/hooks/useListings';
import { CATEGORY_LABELS } from '@/types/listing';
import type { Listing } from '@/types/listing';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  ACTIVE:    { label: 'Đang cho thuê', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  DRAFT:     { label: 'Bản nháp',      bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  INACTIVE:  { label: 'Tạm ẩn',       bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  SUSPENDED: { label: 'Bị khoá',      bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
};

const CATEGORY_ICON: Record<string, string> = {
  CAMPING_TREKKING: '⛺', VEHICLE: '🚵', STAY: '🏡', EXPERIENCE: '🌄', OTHER: '📦',
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function ListingRow({ listing }: { listing: Listing }) {
  const price = Number(listing.price);
  const { mutate: del, isPending: deleting } = useDeleteListing();
  const { mutate: publish, isPending: publishing } = usePublishListing();
  const { mutate: pause, isPending: pausing } = usePauseListing();
  const { mutate: resume, isPending: resuming } = useResumeListing();
  const busy = deleting || publishing || pausing || resuming;

  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-white p-4 transition-all hover:shadow-sm dark:bg-[#121A2C] dark:text-white dark:border-white/10"
      style={{ borderColor: '#DCEFFB', opacity: deleting ? 0.4 : 1 }}>
      {/* Thumbnail */}
      <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-[#f1f5fa]">
        {listing.imageUrls?.[0] ? (
          <img src={listing.imageUrls[0]} alt={listing.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">
            {CATEGORY_ICON[listing.category] ?? '📦'}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#2a7bd9' }}>
            {CATEGORY_LABELS[listing.category] ?? listing.category}
          </span>
          <StatusBadge status={listing.status} />
        </div>
        <p className="font-semibold truncate text-slate-900 dark:text-slate-100">{listing.title}</p>
        <p className="mt-0.5 text-xs truncate text-slate-500 dark:text-slate-400">{listing.location}</p>
      </div>

      {/* Price */}
      <div className="shrink-0 text-right hidden sm:block">
        <p className="text-lg font-bold" style={{ color: '#2a7bd9' }}>{price.toLocaleString('vi-VN')}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{listing.currency}/ngày</p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        {listing.status === 'DRAFT' && (
          <button onClick={() => publish(listing.id)} disabled={busy}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-green-50 disabled:opacity-50"
            style={{ borderColor: '#bbf7d0', color: '#15803d' }}>
            {publishing ? '...' : 'Đăng'}
          </button>
        )}
        {listing.status === 'ACTIVE' && (
          <button onClick={() => pause(listing.id)} disabled={busy}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-amber-50 disabled:opacity-50"
            style={{ borderColor: '#fde68a', color: '#92400e' }}>
            {pausing ? '...' : 'Ẩn'}
          </button>
        )}
        {listing.status === 'INACTIVE' && (
          <button onClick={() => resume(listing.id)} disabled={busy}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-green-50 disabled:opacity-50"
            style={{ borderColor: '#bbf7d0', color: '#15803d' }}>
            {resuming ? '...' : 'Hiện lại'}
          </button>
        )}
        <Link href={`/listings/${listing.id}`}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#f1f5fa]"
          style={{ borderColor: '#DCEFFB', color: '#5a6b85' }}>
          Xem
        </Link>
        <Link href={`/dashboard/listings/${listing.id}/edit`}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#f6fbfe]"
          style={{ borderColor: '#2a7bd9', color: '#2a7bd9' }}>
          Sửa
        </Link>
        <button
          onClick={() => { if (confirm(`Xoá"${listing.title}"?`)) del(listing.id); }}
          disabled={busy}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-red-50 disabled:opacity-50"
          style={{ borderColor: '#fca5a5', color: '#dc2626' }}>
          Xoá
        </button>
      </div>
    </div>
  );
}

export default function ManageListingsPage() {
  const { data: listings, isLoading } = useMyListings();
  const { mutate: bulkUpload, isPending: uploading, data: uploadResult } = useBulkUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>('ALL');

  const filtered = listings?.filter((l) => filter === 'ALL' || l.status === filter) ?? [];

  const counts = listings?.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <nav className="mb-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Link href="/dashboard" style={{ color: '#2a7bd9' }}>Dashboard</Link>
              <span>/</span>
              <span>Sản phẩm</span>
            </nav>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quản lý sản phẩm</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Bulk upload */}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) bulkUpload(f); e.target.value = ''; }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all hover:bg-white disabled:opacity-50 dark:bg-[#121A2C] dark:text-white dark:border-white/10"
              style={{ borderColor: '#DCEFFB', color: '#5a6b85' }}>
              {uploading ? '⏳ Đang upload...' : '📂 Nhập hàng loạt'}
            </button>
            <Link href="/dashboard/listings/new"
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: '#2a7bd9' }}>
              + Thêm mới
            </Link>
          </div>
        </div>

        {/* Upload result */}
        {uploadResult && (
          <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
            ✅ Đã tạo {uploadResult.created} sản phẩm từ file.
          </div>
        )}

        {/* Stats */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { key: 'ALL',      label: 'Tất cả',        color: '#2a7bd9' },
            { key: 'ACTIVE',   label: 'Đang cho thuê', color: '#15803d' },
            { key: 'DRAFT',    label: 'Bản nháp',      color: '#475569' },
            { key: 'INACTIVE', label: 'Tạm ẩn',        color: '#92400e' },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className="rounded-2xl border p-3 text-left transition-all"
              style={{
                borderColor: filter === tab.key ? tab.color : '#DCEFFB',
                background: filter === tab.key ? `${tab.color}10` : '#fff',
              }}>
              <p className="text-xl font-bold" style={{ color: tab.color }}>
                {tab.key === 'ALL' ? (listings?.length ?? 0) : (counts[tab.key] ?? 0)}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{tab.label}</p>
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex animate-pulse gap-4 rounded-2xl border bg-white p-4 dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor: '#DCEFFB' }}>
                <div className="h-20 w-28 rounded-xl bg-[#e2e8f3]" />
                <div className="flex-1 space-y-2 pt-2">
                  <div className="h-3 w-1/3 rounded bg-[#e2e8f3]" />
                  <div className="h-4 w-2/3 rounded bg-[#e2e8f3]" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-white py-20 dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor: '#DCEFFB' }}>
            <span className="mb-4 text-5xl">🏕️</span>
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Chưa có sản phẩm</h3>
            <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">Tạo sản phẩm đầu tiên để bắt đầu cho thuê.</p>
            <Link href="/dashboard/listings/new" className="rounded-full px-6 py-2.5 text-sm font-semibold text-white" style={{ background: '#2a7bd9' }}>
              Tạo sản phẩm
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((listing) => <ListingRow key={listing.id} listing={listing} />)}
          </div>
        )}
      </div>
    </div>
  );
}
