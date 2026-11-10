'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  useMyListings, useDeleteListing, usePublishListing,
  usePauseListing, useResumeListing, useBulkUpload,
} from '@/hooks/useListings';
import { CATEGORY_LABELS } from '@/types/listing';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { Listing } from '@/types/listing';
import {
  Plus, Upload, Eye, Pencil, Trash2, Play, Pause, Send,
  ChevronRight, MapPin, Tent, Package, CheckCircle2, Loader2, AlertTriangle,
} from 'lucide-react';

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, {
  label: string; dot: string; bg: string; color: string; border: string; accent: string;
}> = {
  ACTIVE:    { label: 'Đang cho thuê', dot: '#22c55e', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', accent: '#22c55e' },
  DRAFT:     { label: 'Bản nháp',      dot: '#94a3b8', bg: '#f8fafc', color: '#475569', border: '#e2e8f0', accent: '#94a3b8' },
  INACTIVE:  { label: 'Tạm ẩn',       dot: '#f59e0b', bg: '#fffbeb', color: '#92400e', border: '#fde68a', accent: '#f59e0b' },
  SUSPENDED: { label: 'Bị khoá',      dot: '#ef4444', bg: '#fef2f2', color: '#991b1b', border: '#fecaca', accent: '#ef4444' },
};

const STAT_TABS = [
  { key: 'ALL',      label: 'Tất cả',        icon: Package,      color: '#2a7bd9', light: '#eff6ff' },
  { key: 'ACTIVE',   label: 'Đang cho thuê', icon: CheckCircle2, color: '#16a34a', light: '#f0fdf4' },
  { key: 'DRAFT',    label: 'Bản nháp',      icon: Tent,         color: '#64748b', light: '#f8fafc' },
  { key: 'INACTIVE', label: 'Tạm ẩn',        icon: Pause,        color: '#d97706', light: '#fffbeb' },
];

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.DRAFT;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function ActionBtn({
  onClick, disabled, variant = 'default', icon: Icon, label, blockedReason,
}: {
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'green' | 'amber' | 'red' | 'blue';
  icon: React.ElementType;
  label: string;
  /** When set the button is disabled and this text is shown as a tooltip */
  blockedReason?: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    default: { borderColor: '#e2e8f0', color: '#64748b' },
    green:   { borderColor: '#bbf7d0', color: '#16a34a' },
    amber:   { borderColor: '#fde68a', color: '#d97706' },
    red:     { borderColor: '#fca5a5', color: '#dc2626' },
    blue:    { borderColor: '#bfdbfe', color: '#2a7bd9' },
  };
  const hover: Record<string, string> = {
    default: 'hover:bg-slate-50',
    green:   'hover:bg-green-50',
    amber:   'hover:bg-amber-50',
    red:     'hover:bg-red-50',
    blue:    'hover:bg-blue-50',
  };
  // A disabled button gets no hover events in some browsers, so the tooltip hangs off the wrapper
  if (blockedReason) {
    return (
      <span className="group/tip relative inline-flex">
        <button
          type="button"
          disabled
          aria-label={`${label}: ${blockedReason}`}
          className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg border opacity-40"
          style={styles[variant]}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
        <span
          role="tooltip"
          className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-52 rounded-lg bg-slate-800 px-3 py-2 text-center text-xs leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100"
        >
          {blockedReason}
        </span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${hover[variant]}`}
      style={styles[variant]}
    >
      {disabled
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Icon className="h-3.5 w-3.5" />}
    </button>
  );
}

function DeleteListingDialog({ listing, onClose }: { listing: Listing | null; onClose: () => void }) {
  const { mutate: del, isPending, error, reset } = useDeleteListing();
  const { mutate: pause, isPending: pausing } = usePauseListing();

  const handleClose = () => {
    reset();
    onClose();
  };

  const hasBookings = (error as { code?: string } | null)?.code === 'LISTING_HAS_BOOKINGS';

  return (
    <Dialog open={!!listing} onOpenChange={(open) => { if (!open && !isPending) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Xoá sản phẩm?
          </DialogTitle>
          <DialogDescription>
            Bạn sắp xoá vĩnh viễn <strong className="text-slate-800">&ldquo;{listing?.title}&rdquo;</strong>.
            Ảnh, giá và lịch của sản phẩm sẽ bị xoá và không thể khôi phục.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error.message}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending || pausing}>Huỷ</Button>
          {hasBookings && listing?.status === 'ACTIVE' ? (
            <Button
              disabled={pausing}
              onClick={() => pause(listing.id, { onSuccess: handleClose })}
            >
              {pausing ? 'Đang xử lý…' : 'Tạm ẩn thay vì xoá'}
            </Button>
          ) : !hasBookings && listing ? (
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => del(listing.id, { onSuccess: handleClose })}
            >
              {isPending ? 'Đang xoá…' : 'Xoá vĩnh viễn'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ListingCard({ listing, onDelete }: { listing: Listing; onDelete: (l: Listing) => void }) {
  const price = Number(listing.price);
  const cfg   = STATUS_CFG[listing.status] ?? STATUS_CFG.DRAFT;

  const { mutate: publish, isPending: publishing } = usePublishListing();
  const { mutate: pause,   isPending: pausing    } = usePauseListing();
  const { mutate: resume,  isPending: resuming   } = useResumeListing();
  const busy = publishing || pausing || resuming;

  return (
    <div className="group relative flex items-stretch gap-0 rounded-2xl bg-white hover:z-30 shadow-sm ring-1 ring-black/[0.05] transition-all hover:shadow-md hover:-translate-y-0.5">
      {/* Status accent bar */}
      <div className="w-1 shrink-0 rounded-l-2xl" style={{ background: cfg.accent }} />

      {/* Thumbnail */}
      <div className="relative h-[108px] w-36 shrink-0 overflow-hidden bg-slate-100">
        {listing.imageUrls?.[0] ? (
          <img
            src={listing.imageUrls[0]}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Tent className="h-10 w-10 text-slate-200" />
          </div>
        )}
        {listing.imageUrls?.length > 1 && (
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-bold text-white">
            +{listing.imageUrls.length - 1}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center gap-4 min-w-0 px-5 py-4">
        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2a7bd9]">
              {CATEGORY_LABELS[listing.category] ?? listing.category}
            </span>
            <StatusBadge status={listing.status} />
          </div>
          <p className="truncate text-sm font-semibold text-slate-800">{listing.title}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{listing.location}</span>
          </div>
        </div>

        {/* Price */}
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-lg font-extrabold text-[#2a7bd9]">{price.toLocaleString('vi-VN')}</p>
          <p className="text-xs text-slate-400">{listing.currency ?? 'VND'} / ngày</p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {listing.status === 'DRAFT' && (
            <ActionBtn onClick={() => publish(listing.id)} disabled={busy} variant="green" icon={Send} label="Đăng" />
          )}
          {listing.status === 'ACTIVE' && (
            <ActionBtn onClick={() => pause(listing.id)} disabled={busy} variant="amber" icon={Pause} label="Tạm ẩn" />
          )}
          {listing.status === 'INACTIVE' && (
            <ActionBtn onClick={() => resume(listing.id)} disabled={busy} variant="green" icon={Play} label="Hiện lại" />
          )}
          <Link
            href={`/listings/${listing.id}`}
            title="Xem trang"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={`/dashboard/listings/${listing.id}/edit`}
            title="Chỉnh sửa"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 text-[#2a7bd9] transition-colors hover:bg-blue-50"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
          <ActionBtn
            onClick={() => onDelete(listing)}
            disabled={busy}
            variant="red"
            icon={Trash2}
            label="Xoá"
            blockedReason={
              listing.status === 'ACTIVE'
                ? 'Sản phẩm đang cho thuê nên không thể xoá. Hãy tạm ẩn trước.'
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] animate-pulse">
      <div className="w-1 bg-slate-100" />
      <div className="h-[108px] w-36 shrink-0 bg-slate-100" />
      <div className="flex flex-1 items-center gap-4 px-5 py-4">
        <div className="flex-1 space-y-2.5">
          <div className="flex gap-2">
            <div className="h-3 w-20 rounded-full bg-slate-100" />
            <div className="h-3 w-16 rounded-full bg-slate-100" />
          </div>
          <div className="h-4 w-3/4 rounded-lg bg-slate-100" />
          <div className="h-3 w-1/3 rounded-lg bg-slate-100" />
        </div>
        <div className="hidden sm:block space-y-1.5">
          <div className="h-6 w-24 rounded-lg bg-slate-100" />
          <div className="h-3 w-16 rounded-lg bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ManageListingsPage() {
  const { data: listings, isLoading } = useMyListings();
  const { mutate: bulkUpload, isPending: uploading, data: uploadResult } = useBulkUpload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);

  const counts = listings?.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const filtered = listings?.filter((l) => filter === 'ALL' || l.status === filter) ?? [];

  return (
    <div className="min-h-screen bg-[#f3f8fd]">

      {/* ── Page header ── */}
      <div className="bg-white shadow-sm ring-1 ring-black/[0.04]">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Link href="/dashboard" className="hover:text-[#2a7bd9] transition-colors">Dashboard</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-slate-600">Sản phẩm</span>
          </nav>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Quản lý sản phẩm</h1>
              <p className="mt-0.5 text-sm text-slate-400">
                {listings?.length ?? 0} sản phẩm · {counts['ACTIVE'] ?? 0} đang cho thuê
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) bulkUpload(f); e.target.value = ''; }}
              />
              {/* <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                {uploading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Đang upload…</>
                  : <><Upload className="h-4 w-4" />Nhập hàng loạt</>}
              </button> */}
              <Link
                href="/dashboard/listings/new"
                className="flex items-center gap-2 rounded-xl bg-[#2a7bd9] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#2a7bd9]/25 transition-all hover:brightness-110 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Thêm mới
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">

        {/* ── Upload result ── */}
        {uploadResult && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            <p className="text-sm font-medium text-green-700">
              Đã tạo {uploadResult.created} sản phẩm từ file thành công.
            </p>
          </div>
        )}

        {/* ── Stat / Filter tabs ── */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STAT_TABS.map(({ key, label, icon: Icon, color, light }) => {
            const count = key === 'ALL' ? (listings?.length ?? 0) : (counts[key] ?? 0);
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="relative overflow-hidden rounded-2xl p-4 text-left transition-all ring-1"
                style={{
                  background: active ? light : '#fff',
                  boxShadow: active
                    ? `0 0 0 2px ${color}40, 0 4px 12px -4px ${color}30`
                    : '0 1px 3px rgba(0,0,0,0.04)',
                  outline: active ? 'none' : 'none',
                }}
              >
                {active && (
                  <div
                    className="absolute right-0 top-0 h-16 w-16 rounded-bl-full opacity-[0.12]"
                    style={{ background: color }}
                  />
                )}
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: active ? `${color}18` : '#f8fafc' }}>
                  <Icon className="h-4 w-4" style={{ color: active ? color : '#94a3b8' }} />
                </div>
                <p className="text-2xl font-extrabold" style={{ color: active ? color : '#0f172a' }}>{count}</p>
                <p className="mt-0.5 text-xs font-medium" style={{ color: active ? color : '#94a3b8' }}>{label}</p>
              </button>
            );
          })}
        </div>

        {/* ── Listing list ── */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-20 text-center shadow-sm ring-1 ring-black/[0.04]">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
              <Tent className="h-8 w-8 text-slate-200" />
            </div>
            <h3 className="mb-1 text-base font-semibold text-slate-800">
              {filter === 'ALL' ? 'Chưa có sản phẩm nào' : `Không có sản phẩm "${STAT_TABS.find(t => t.key === filter)?.label}"`}
            </h3>
            <p className="mb-6 text-sm text-slate-400">
              {filter === 'ALL' ? 'Tạo sản phẩm đầu tiên để bắt đầu cho thuê.' : 'Thay đổi bộ lọc hoặc tạo sản phẩm mới.'}
            </p>
            <Link
              href="/dashboard/listings/new"
              className="flex items-center gap-2 rounded-xl bg-[#2a7bd9] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#2a7bd9]/25 hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              Tạo sản phẩm
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((listing) => <ListingCard key={listing.id} listing={listing} onDelete={setDeleteTarget} />)}
          </div>
        )}

      </div>

      <DeleteListingDialog listing={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
