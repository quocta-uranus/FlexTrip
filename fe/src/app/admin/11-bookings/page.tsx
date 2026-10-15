'use client';

import { useState } from 'react';
import {
  AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, FileText, MapPin, Package, Phone, Search, Shield, Truck, User2, X,
} from 'lucide-react';
import { useAdminBookingDetail, useAdminBookingList, useAdminBookingStats } from '@/hooks/admin/use-admin-bookings';
import type { AdminBookingRow } from '@/types/admin';

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtdt(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtMoney(v: number | string) {
  return Number(v).toLocaleString('vi-VN') + ' ₫';
}

// ── status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; bg: string; text: string; bar: string }> = {
  PENDING_PAYMENT:  { label: 'Chờ TT',      bg: '#fff7ed', text: '#c2410c', bar: '#f97316' },
  PENDING_APPROVAL: { label: 'Chờ duyệt',   bg: '#fefce8', text: '#a16207', bar: '#eab308' },
  CONFIRMED:        { label: 'Đã xác nhận', bg: '#eff6ff', text: '#1d4ed8', bar: '#3b82f6' },
  IN_PROGRESS:      { label: 'Đang thuê',   bg: '#f0fdf4', text: '#15803d', bar: '#22c55e' },
  COMPLETED:        { label: 'Hoàn thành',  bg: '#f1f5f9', text: '#475569', bar: '#94a3b8' },
  CANCELLED:        { label: 'Đã huỷ',      bg: '#fef2f2', text: '#991b1b', bar: '#ef4444' },
  DISPUTED:         { label: 'Tranh chấp',  bg: '#fdf4ff', text: '#7e22ce', bar: '#a855f7' },
  REFUNDING:        { label: 'Đang HT',     bg: '#fefce8', text: '#a16207', bar: '#eab308' },
  REFUNDED:         { label: 'Đã HT',       bg: '#f1f5f9', text: '#475569', bar: '#94a3b8' },
};

const STATUS_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'IN_PROGRESS', label: 'Đang thuê' },
  { value: 'DISPUTED', label: 'Tranh chấp' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, bg: '#f1f5f9', text: '#475569', bar: '#94a3b8' };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: cfg.bg, color: cfg.text }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.bar }} />
      {cfg.label}
    </span>
  );
}

// ── booking row ───────────────────────────────────────────────────────────────
function BookingRow({ row, onSelect }: { row: AdminBookingRow; onSelect: () => void }) {
  const cfg = STATUS_CFG[row.status] ?? STATUS_CFG.COMPLETED;
  const nights = Math.round((new Date(row.endDate).getTime() - new Date(row.startDate).getTime()) / 86_400_000);
  return (
    <div
      onClick={onSelect}
      className="group cursor-pointer rounded-xl border bg-white transition-all hover:-translate-y-px hover:shadow-md"
      style={{ borderColor: '#e2e8f3', borderLeftWidth: 3, borderLeftColor: cfg.bar }}
    >
      <div className="flex flex-wrap items-start gap-4 p-4">
        {/* Listing thumbnail */}
        <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-[#f1f5fa]">
          {row.listing.imageUrls?.[0]
            ? <img src={row.listing.imageUrls[0]} alt="" className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-2xl">⛺</div>}
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#0f1729]">{row.listing.title}</p>
              <p className="flex items-center gap-1 text-xs text-[#8694ad]">
                <MapPin className="h-3 w-3 shrink-0" />{row.listing.location}
              </p>
            </div>
            <StatusBadge status={row.status} />
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5a6b85]">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-[#8694ad]" />
              {fmt(row.startDate)} → {fmt(row.endDate)} ({nights} ngày)
            </span>
            <span className="font-semibold text-[#2a7bd9]">{fmtMoney(row.totalPrice)}</span>
          </div>
        </div>

        {/* Parties */}
        <div className="hidden min-w-[300px] grid-cols-3 gap-3 text-xs sm:grid">
          {/* Traveler */}
          <div className="rounded-lg bg-[#f8fafc] p-2.5">
            <p className="mb-1 font-bold uppercase tracking-wide text-[#8694ad]" style={{ fontSize: 9 }}>Traveler</p>
            <div className="flex items-center gap-1.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2a7bd9] text-[10px] font-bold text-white">
                {row.traveler.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#0f1729]">{row.traveler.name}</p>
                <p className="truncate text-[#8694ad]">{row.traveler.email}</p>
              </div>
            </div>
          </div>

          {/* Staff */}
          <div className="rounded-lg bg-[#f8fafc] p-2.5">
            <p className="mb-1 font-bold uppercase tracking-wide text-[#8694ad]" style={{ fontSize: 9 }}>Staff</p>
            {row.assignedStaff ? (
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#64748b] text-[10px] font-bold text-white">
                  {row.assignedStaff.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#0f1729]">{row.assignedStaff.name}</p>
                  {row.assignedStaff.staffProfile?.employeeCode && (
                    <p className="text-[#8694ad]">{row.assignedStaff.staffProfile.employeeCode}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[#8694ad] italic">Chưa phân công</p>
            )}
          </div>

          {/* Meta */}
          <div className="rounded-lg bg-[#f8fafc] p-2.5">
            <p className="mb-1 font-bold uppercase tracking-wide text-[#8694ad]" style={{ fontSize: 9 }}>Chi tiết</p>
            <p className="text-[#5a6b85]">
              {row.deliveryMethod === 'DELIVERY'
                ? <span className="flex items-center gap-1"><Truck className="h-3 w-3" />Giao hàng</span>
                : <span className="flex items-center gap-1"><Package className="h-3 w-3" />Nhận trực tiếp</span>}
            </p>
            {row._count.staffMediations > 0 && (
              <p className="mt-0.5 flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3 w-3" />{row._count.staffMediations} biên bản
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── detail drawer ─────────────────────────────────────────────────────────────
function DetailDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: b, isLoading } = useAdminBookingDetail(id);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2e8f3] px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#2a7bd9]">Chi tiết booking</p>
            <p className="mt-0.5 font-mono text-sm text-[#5a6b85]">#{id.slice(0, 12).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-[#8694ad] hover:bg-[#f1f5f9]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e2e8f3] border-t-[#2a7bd9]" />
          </div>
        )}

        {b && (
          <div className="flex-1 space-y-5 p-6">
            {/* Status + dates */}
            <div className="rounded-xl border border-[#e2e8f3] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-[#0f1729]">{b.listing.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-[#8694ad]">
                    <MapPin className="h-3.5 w-3.5" />{b.listing.location}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
                  <p className="text-xs text-[#8694ad]">Nhận</p>
                  <p className="font-semibold text-[#0f1729]">{fmt(b.startDate)}</p>
                </div>
                <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
                  <p className="text-xs text-[#8694ad]">Trả</p>
                  <p className="font-semibold text-[#0f1729]">{fmt(b.endDate)}</p>
                </div>
              </div>
              {b.checkedInAt && (
                <p className="mt-2 text-xs text-[#5a6b85]">
                  ✓ Bàn giao: <span className="font-medium">{fmtdt(b.checkedInAt)}</span>
                </p>
              )}
              {b.checkedOutAt && (
                <p className="mt-1 text-xs text-[#5a6b85]">
                  ✓ Nhận lại: <span className="font-medium">{fmtdt(b.checkedOutAt)}</span>
                </p>
              )}
            </div>

            {/* Payment */}
            <div className="rounded-xl border border-[#e2e8f3] p-4">
              <p className="mb-3 text-sm font-bold text-[#5a6b85] uppercase tracking-wide">Thanh toán</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#5a6b85]">Tổng tiền</span>
                <span className="text-lg font-bold text-[#2a7bd9]">{fmtMoney(b.totalPrice)}</span>
              </div>
              {b.payment && (
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[#5a6b85]">{b.payment.method}</span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${b.payment.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {b.payment.status}
                  </span>
                </div>
              )}
            </div>

            {/* 3-column: Traveler / Provider / Staff */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'TRAVELER', icon: <User2 className="h-4 w-4" />, color: '#2a7bd9',
                  name: b.traveler.name, email: b.traveler.email, phone: b.traveler.phone },
                { label: 'PROVIDER', icon: <Shield className="h-4 w-4" />, color: '#16a34a',
                  name: b.listing.provider.name, email: b.listing.provider.email, phone: b.listing.provider.phone },
                ...(b.assignedStaff ? [{
                  label: 'STAFF', icon: <User2 className="h-4 w-4" />, color: '#64748b',
                  name: b.assignedStaff.name,
                  email: b.assignedStaff.email,
                  phone: b.assignedStaff.phone ?? b.assignedStaff.staffProfile?.phone ?? null,
                  extra: b.assignedStaff.staffProfile?.employeeCode,
                }] : [{ label: 'STAFF', icon: <User2 className="h-4 w-4" />, color: '#94a3b8',
                  name: 'Chưa phân công', email: '', phone: null }]),
              ].map((p) => (
                <div key={p.label} className="rounded-xl border border-[#e2e8f3] p-3">
                  <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: p.color }}>
                    {p.icon}{p.label}
                  </p>
                  <p className="font-semibold text-[#0f1729] text-sm">{p.name}</p>
                  {p.email && <p className="mt-0.5 truncate text-xs text-[#8694ad]">{p.email}</p>}
                  {p.phone && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[#5a6b85]">
                      <Phone className="h-3 w-3" />{p.phone}
                    </p>
                  )}
                  {'extra' in p && p.extra && (
                    <span className="mt-1 inline-block rounded-full bg-[#eff6ff] px-2 py-0.5 text-[10px] font-bold text-[#1d4ed8]">{p.extra}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Contract */}
            {b.contract && (
              <div className="rounded-xl border border-[#e2e8f3] p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-[#5a6b85] uppercase tracking-wide">
                  <FileText className="h-4 w-4" />Hợp đồng
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
                    <p className="text-[#8694ad]">Trạng thái</p>
                    <p className="font-semibold text-[#0f1729]">{b.contract.status}</p>
                  </div>
                  <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
                    <p className="text-[#8694ad]">Traveler ký</p>
                    <p className="font-semibold" style={{ color: b.contract.travelerSignedAt ? '#15803d' : '#a16207' }}>
                      {b.contract.travelerSignedAt ? `✓ ${fmt(b.contract.travelerSignedAt)}` : '⏳ Chưa ký'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mediations */}
            {b.staffMediations?.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800">
                  <AlertTriangle className="h-4 w-4" />Biên bản thương lượng ({b.staffMediations.length})
                </p>
                <div className="space-y-2">
                  {b.staffMediations.map((m) => (
                    <div key={m.id} className="rounded-lg border border-amber-200 bg-white p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`rounded-full px-2 py-0.5 font-bold ${
                          m.status === 'OPEN' ? 'bg-amber-100 text-amber-700' :
                          m.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-red-100 text-red-700'}`}>
                          {m.status === 'OPEN' ? 'Đang mở' : m.status === 'RESOLVED' ? 'Đã giải quyết' : 'Chuyển Admin'}
                        </span>
                        <span className="text-[#8694ad]">{fmtdt(m.createdAt)}</span>
                      </div>
                      <p className="mt-1.5 font-medium text-[#0f1729]">{m.issue}</p>
                      {m.resolution && <p className="mt-1 text-[#5a6b85]">→ {m.resolution}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cancellation */}
            {b.cancellationReason && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
                <p className="font-semibold text-red-700">Lý do huỷ</p>
                <p className="mt-1 text-red-600">{b.cancellationReason}</p>
                {b.cancelledAt && <p className="mt-1 text-xs text-red-400">Huỷ lúc: {fmtdt(b.cancelledAt)}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function AdminBookingsPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const statsQ = useAdminBookingStats();
  const listQ  = useAdminBookingList({ status: status || undefined, search: search || undefined, page });
  const stats  = statsQ.data;

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatus(v); setPage(1); };

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      {selectedId && <DetailDrawer id={selectedId} onClose={() => setSelectedId(null)} />}

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2a7bd9]">Admin</p>
          <h1 className="mt-1 text-2xl font-bold text-[#0f1729]">Quản lý Booking</h1>
          <p className="mt-1 text-sm text-[#5a6b85]">Toàn bộ đơn thuê trên hệ thống</p>
        </div>

        {/* Stats grid */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total */}
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: '#DCEFFB' }}>
            <p className="text-3xl font-bold text-[#0f1729]">{stats?.total ?? '—'}</p>
            <p className="mt-1 text-sm text-[#5a6b85]">Tổng booking</p>
            {stats && (
              <div className="mt-3 flex gap-2 text-xs">
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                  {stats.withStaff} có staff
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                  {stats.withoutStaff} chưa có
                </span>
              </div>
            )}
          </div>

          {/* By status — show 3 key ones */}
          {(['IN_PROGRESS', 'DISPUTED', 'COMPLETED'] as const).map((s) => {
            const cfg = STATUS_CFG[s];
            const count = (stats?.byStatus as Record<string, number> | undefined)?.[s] ?? 0;
            return (
              <div
                key={s}
                className="cursor-pointer rounded-2xl border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderColor: '#DCEFFB', borderTopWidth: 3, borderTopColor: cfg.bar }}
                onClick={() => handleStatus(status === s ? '' : s)}
              >
                <p className="text-3xl font-bold" style={{ color: cfg.bar }}>{count}</p>
                <p className="mt-1 text-sm" style={{ color: cfg.text }}>{cfg.label}</p>
                <p className="mt-2 text-xs text-[#8694ad]">Click để lọc →</p>
              </div>
            );
          })}
        </div>

        {/* All statuses mini row */}
        {stats && (
          <div className="mb-6 flex flex-wrap gap-2">
            {Object.entries(stats.byStatus).map(([s, count]) => {
              const cfg = STATUS_CFG[s] ?? { label: s, bg: '#f1f5f9', text: '#475569' };
              return (
                <button
                  key={s}
                  onClick={() => handleStatus(status === s ? '' : s)}
                  className="rounded-full px-3 py-1 text-xs font-semibold transition-all"
                  style={{
                    background: status === s ? cfg.text : cfg.bg,
                    color: status === s ? '#fff' : cfg.text,
                  }}
                >
                  {cfg.label}: {count}
                </button>
              );
            })}
          </div>
        )}

        {/* Search + filter bar */}
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-[#e2e8f3] bg-white px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[#8694ad]" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Tìm tên sản phẩm, traveler, địa điểm..."
              className="flex-1 bg-transparent text-sm text-[#0f1729] outline-none placeholder:text-[#8694ad]"
            />
            {search && (
              <button onClick={() => handleSearch('')} className="text-[#8694ad] hover:text-[#5a6b85]">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#e2e8f3] bg-white p-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => handleStatus(t.value)}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                style={status === t.value
                  ? { background: '#2a7bd9', color: '#fff' }
                  : { color: '#5a6b85' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {listQ.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-[#e2e8f3]" />
            ))}
          </div>
        )}

        {!listQ.isLoading && (listQ.data?.items ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e2e8f3] bg-white py-20">
            <Package className="mb-3 h-10 w-10 text-[#8694ad]" />
            <p className="font-semibold text-[#5a6b85]">Không có booking nào</p>
          </div>
        )}

        <div className="space-y-3">
          {(listQ.data?.items ?? []).map((row) => (
            <BookingRow key={row.id} row={row} onSelect={() => setSelectedId(row.id)} />
          ))}
        </div>

        {/* Pagination */}
        {listQ.data && listQ.data.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-[#5a6b85]">
              {((page - 1) * (listQ.data.limit ?? 20)) + 1}–{Math.min(page * (listQ.data.limit ?? 20), listQ.data.total)} / {listQ.data.total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f3] bg-white px-3 py-1.5 text-sm font-medium text-[#5a6b85] disabled:opacity-40 hover:bg-[#f8fafc]"
              >
                <ChevronLeft className="h-4 w-4" />Trước
              </button>
              <span className="flex items-center rounded-lg border border-[#e2e8f3] bg-white px-3 py-1.5 text-sm text-[#5a6b85]">
                {page} / {listQ.data.totalPages}
              </span>
              <button
                disabled={page >= listQ.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1.5 rounded-lg border border-[#e2e8f3] bg-white px-3 py-1.5 text-sm font-medium text-[#5a6b85] disabled:opacity-40 hover:bg-[#f8fafc]"
              >
                Sau<ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
