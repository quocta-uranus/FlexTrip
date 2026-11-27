'use client';

import { useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, FileText, MapPin, Package, Phone, Search, Shield, Truck, User2, X,
} from 'lucide-react';
import { useAdminBookingDetail, useAdminBookingList, useAdminBookingStats } from '@/hooks/admin/use-admin-bookings';
import { PAYMENT_STATUS_LABEL, type AdminBookingRow, type PaymentStatus } from '@/types/admin';
import { ContractDocument } from '@/components/contracts/ContractDocument';
import { ExportPdfButton } from '@/components/contracts/ExportPdfButton';
import { CONTRACT_STATUS_LABEL, type ContractStatus } from '@/types/contract';
import { bookingCode } from '@/lib/booking-code';
import { rentalDays } from '@/lib/rental-days';

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
  // Amber = waiting on the admin, cyan = waiting on the customer; no two statuses share a colour.
  PENDING_APPROVAL: { label: 'Chờ duyệt',      bg: '#fffbeb', text: '#92400e', bar: '#f59e0b' },
  PENDING_PAYMENT:  { label: 'Chờ thanh toán', bg: '#ecfeff', text: '#155e75', bar: '#06b6d4' },
  CONFIRMED:        { label: 'Đã xác nhận',    bg: '#eff6ff', text: '#1d4ed8', bar: '#3b82f6' },
  IN_PROGRESS:      { label: 'Đang thuê',      bg: '#f0fdf4', text: '#15803d', bar: '#22c55e' },
  COMPLETED:        { label: 'Hoàn thành',     bg: '#f0fdfa', text: '#115e59', bar: '#14b8a6' },
  CANCELLED:        { label: 'Đã huỷ',         bg: '#fef2f2', text: '#991b1b', bar: '#ef4444' },
  DISPUTED:         { label: 'Tranh chấp',     bg: '#faf5ff', text: '#6b21a8', bar: '#a855f7' },
  REFUNDING:        { label: 'Đang hoàn tiền', bg: '#eef2ff', text: '#3730a3', bar: '#6366f1' },
  REFUNDED:         { label: 'Đã hoàn tiền',   bg: '#f1f5f9', text: '#475569', bar: '#94a3b8' },
};

// Order of the filter chips; every status is always listed, empty ones are just dimmed.
const FILTER_ORDER = [
  '', 'PENDING_APPROVAL', 'PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'DISPUTED', 'COMPLETED', 'CANCELLED', 'REFUNDING', 'REFUNDED',
];

// Same column widths for the header and every row, so nothing shifts from one booking to the next.
const ROW_GRID = 'grid grid-cols-[minmax(0,2.1fr)_minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1.4fr)_96px_116px] items-center gap-4 px-4';

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
const NEW_BOOKING_WINDOW_MS = 24 * 60 * 60 * 1000;
function isNewBooking(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < NEW_BOOKING_WINDOW_MS;
}

function fmtRange(start: string, end: string) {
  const a = fmt(start);
  const b = fmt(end);
  return a.slice(-4) === b.slice(-4) ? `${a.slice(0, 5)} – ${b}` : `${a} – ${b}`;
}

function BookingTableHeader() {
  return (
    <div className={`${ROW_GRID} border-b border-[#e2e8f3] bg-[#f8fafc] py-2.5 text-[11px] font-semibold text-[#8694ad]`}>
      <span>Sản phẩm</span>
      <span>Thời gian</span>
      <span>Traveler</span>
      <span>Staff</span>
      <span>Giá</span>
      <span>Trạng thái</span>
    </div>
  );
}

function BookingRow({ row, onSelect }: { row: AdminBookingRow; onSelect: () => void }) {
  const nights = rentalDays(row.startDate, row.endDate);
  const mediations = row._count.staffMediations;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className={`${ROW_GRID} cursor-pointer border-b border-[#e2e8f3] py-3 text-xs transition-colors last:border-b-0 hover:bg-[#2a7bd9]/[0.05] focus-visible:bg-[#2a7bd9]/[0.07] focus-visible:outline-none`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#f1f5fa]">
          {row.listing.imageUrls?.[0]
            ? <img src={row.listing.imageUrls[0]} alt="" className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-lg">⛺</div>}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-[#0f1729]">{row.listing.title}</p>
            {isNewBooking(row.createdAt) && (
              <span className="shrink-0 rounded-md bg-[#2a7bd9] px-1.5 py-px text-[9.5px] font-bold tracking-wide text-white">MỚI</span>
            )}
          </div>
          <p className="flex items-center gap-1 truncate text-[#8694ad]">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{row.listing.location}</span>
            <span aria-hidden="true">·</span>
            {row.deliveryMethod === 'DELIVERY'
              ? <span className="flex shrink-0 items-center gap-1"><Truck className="h-3 w-3" />Giao hàng</span>
              : <span className="flex shrink-0 items-center gap-1"><Package className="h-3 w-3" />Nhận trực tiếp</span>}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <p className="truncate font-medium text-[#0f1729]">{fmtRange(row.startDate, row.endDate)}</p>
        <p className="text-[#8694ad]">{nights} ngày</p>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2a7bd9] text-[10px] font-bold text-white">
          {row.traveler.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#0f1729]">{row.traveler.name}</p>
          <p className="truncate text-[#8694ad]">{row.traveler.email}</p>
        </div>
      </div>

      {row.assignedStaff ? (
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#64748b] text-[10px] font-bold text-white">
            {row.assignedStaff.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#0f1729]">{row.assignedStaff.name}</p>
            {mediations > 0 ? (
              <p className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-3 w-3" />{mediations} biên bản</p>
            ) : (
              <p className="truncate text-[#8694ad]">{row.assignedStaff.staffProfile?.employeeCode}</p>
            )}
          </div>
        </div>
      ) : (
        <p className="italic text-[#8694ad]">Chưa phân công</p>
      )}

      <p className="text-sm font-semibold text-[#0f1729]">{fmtMoney(row.totalPrice)}</p>
      <div><StatusBadge status={row.status} /></div>
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
            <p className="mt-0.5 font-mono text-sm text-[#5a6b85]">{bookingCode(id)}</p>
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
                  <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[#5a6b85]">{b.payment.gateway}</span>
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${b.payment.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {PAYMENT_STATUS_LABEL[b.payment.status as PaymentStatus] ?? b.payment.status}
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
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-bold text-[#5a6b85] uppercase tracking-wide">
                    <FileText className="h-4 w-4" />Hợp đồng
                  </p>
                  <ExportPdfButton
                    contract={{ ...b.contract, bookingId: b.id }}
                    travelerName={b.traveler.name}
                    providerName={b.listing.provider.name}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
                    <p className="text-[#8694ad]">Trạng thái</p>
                    <p className="font-semibold text-[#0f1729]">{CONTRACT_STATUS_LABEL[b.contract.status as ContractStatus] ?? b.contract.status}</p>
                  </div>
                  <div className="rounded-lg bg-[#f8fafc] px-3 py-2">
                    <p className="text-[#8694ad]">Traveler ký</p>
                    <p className="font-semibold" style={{ color: b.contract.travelerSignedAt ? '#15803d' : '#a16207' }}>
                      {b.contract.travelerSignedAt ? `✓ ${fmt(b.contract.travelerSignedAt)}` : '⏳ Chưa ký'}
                    </p>
                  </div>
                </div>
                {b.contract.content && (
                  <details className="mt-3 rounded-lg border border-[#e2e8f3]">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-[#1d4ed8]">
                      Xem toàn văn hợp đồng{b.contract.contractNo ? ` số ${b.contract.contractNo}` : ''}
                    </summary>
                    <div className="max-h-[60vh] overflow-auto border-t border-[#e2e8f3] p-3">
                      <ContractDocument
                        doc={b.contract.content}
                        appendices={b.contract.appendices}
                        travelerSignature={b.contract.travelerSignature}
                        providerSignature={b.contract.providerSignature}
                      />
                    </div>
                  </details>
                )}
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
          <p className="mt-1 text-sm text-[#5a6b85]">
            Toàn bộ đơn thuê trên hệ thống
            {stats && ` · ${stats.total} đơn, ${stats.withStaff} có staff, ${stats.withoutStaff} chưa có`}
          </p>
        </div>

        {/* Search */}
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#e2e8f3] bg-white px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-[#8694ad]" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Tìm tên sản phẩm, traveler, địa điểm..."
            className="flex-1 bg-transparent text-sm text-[#0f1729] outline-none placeholder:text-[#8694ad]"
          />
          {search && (
            <button onClick={() => handleSearch('')} aria-label="Xoá tìm kiếm" className="text-[#8694ad] hover:text-[#5a6b85]">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status filter with counts */}
        <div className="mb-5 flex flex-wrap gap-2">
          {FILTER_ORDER.map((value) => {
            const count = value === '' ? stats?.total : (stats?.byStatus as Record<string, number> | undefined)?.[value] ?? 0;
            const cfg = value === '' ? undefined : STATUS_CFG[value];
            const label = cfg?.label ?? 'Tất cả';
            const active = status === value;
            const empty = value !== '' && !count && !active;
            return (
              <button
                key={value || 'all'}
                onClick={() => handleStatus(value)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  active ? 'border-[#2a7bd9] bg-[#2a7bd9] text-white' : 'border-[#e2e8f3] bg-white text-[#5a6b85] hover:bg-[#f8fafc]'
                } ${empty ? 'opacity-55' : ''}`}
              >
                {cfg && <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.bar }} />}
                {label}
                {count !== undefined && <span className={active ? 'text-white/80' : 'text-[#8694ad]'}>{count}</span>}
              </button>
            );
          })}
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

        {(listQ.data?.items ?? []).length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-[#e2e8f3] bg-white">
            <div className="min-w-[940px]">
              <BookingTableHeader />
              {(listQ.data?.items ?? []).map((row) => (
                <BookingRow key={row.id} row={row} onSelect={() => setSelectedId(row.id)} />
              ))}
            </div>
          </div>
        )}

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
