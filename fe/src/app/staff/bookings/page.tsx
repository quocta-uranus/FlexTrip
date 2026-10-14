'use client';

import { useState } from 'react';
import {
  CalendarDays, CheckCircle2, ClipboardList, Clock3,
  MapPin, Package, Truck, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyBookings } from '@/hooks/use-staff-operations';
import type { StaffBooking } from '@/types/staff';

type StatusFilter = 'ALL' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'DISPUTED';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; icon: React.ReactNode }> = {
  CONFIRMED:   { label: 'Đã xác nhận', bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-400',   icon: <Clock3 className="h-3.5 w-3.5" /> },
  IN_PROGRESS: { label: 'Đang thuê',   bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500',icon: <Package className="h-3.5 w-3.5" /> },
  COMPLETED:   { label: 'Hoàn thành',  bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400',  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  DISPUTED:    { label: 'Tranh chấp',  bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500',    icon: <AlertTriangle className="h-3.5 w-3.5" /> },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <span className="text-xs text-slate-500">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function BookingCard({ booking }: { booking: StaffBooking }) {
  const isDelivery = booking.deliveryMethod === 'DELIVERY';
  const openMediations = booking.staffMediations.filter((m) => m.status === 'OPEN').length;

  return (
    <Link href={`/staff/bookings/${booking.id}`} className="block">
    <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e2e8f3] transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-[#2a7bd9]/30">
      <CardContent className="p-0">
        {/* Status bar */}
        <div className={`h-1 rounded-t-xl ${
          booking.status === 'IN_PROGRESS' ? 'bg-gradient-to-r from-emerald-400 to-teal-400' :
          booking.status === 'DISPUTED'    ? 'bg-red-400' :
          booking.status === 'COMPLETED'   ? 'bg-slate-300' :
          'bg-blue-400'
        }`} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[#0f1729]">{booking.listing.title}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-[#8694ad]">
                <MapPin className="h-3 w-3 shrink-0" />
                {booking.deliveryAddress ?? booking.listing.location}
              </p>
            </div>
            <StatusBadge status={booking.status} />
          </div>

          {/* Dates */}
          <div className="mt-3 flex items-center gap-1.5 text-sm text-[#5a6b85]">
            <CalendarDays className="h-4 w-4 shrink-0 text-[#8694ad]" />
            <span>{formatDate(booking.startDate)}</span>
            <span className="text-[#8694ad]">→</span>
            <span>{formatDate(booking.endDate)}</span>
          </div>

          {/* Parties */}
          <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-[#f8fafc] p-3 text-xs">
            <div>
              <p className="text-[#8694ad]">Traveler</p>
              <p className="mt-0.5 font-semibold text-[#0f1729]">{booking.traveler.name}</p>
              <p className="text-[#8694ad]">{booking.traveler.phone ?? booking.traveler.email}</p>
            </div>
            <div>
              <p className="text-[#8694ad]">Provider</p>
              <p className="mt-0.5 font-semibold text-[#0f1729]">{booking.listing.provider.name}</p>
              <p className="text-[#8694ad]">{booking.listing.provider.phone ?? '—'}</p>
            </div>
          </div>

          {/* Footer badges */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDelivery ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-500'}`}>
              {isDelivery ? <><Truck className="h-3 w-3" />Giao hàng</> : <><Package className="h-3 w-3" />Nhận trực tiếp</>}
            </span>
            {openMediations > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                {openMediations} thương lượng đang mở
              </span>
            )}
            {booking.checkedInAt && !booking.checkedOutAt && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />Đã bàn giao
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL',         label: 'Tất cả' },
  { value: 'CONFIRMED',   label: 'Đã xác nhận' },
  { value: 'IN_PROGRESS', label: 'Đang thuê' },
  { value: 'DISPUTED',    label: 'Tranh chấp' },
  { value: 'COMPLETED',   label: 'Hoàn thành' },
];

export default function MyBookingsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useMyBookings({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    page,
  });

  const bookings = data?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2a7bd9]">Staff Portal</p>
        <h1 className="mt-1 text-2xl font-bold text-[#0f1729]">Booking của tôi</h1>
        <p className="mt-1 text-sm text-[#5a6b85]">
          {data ? `${data.total} booking được phân công` : 'Đang tải...'}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => { setStatusFilter(value); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              statusFilter === value
                ? 'bg-[#2a7bd9] text-white shadow-sm'
                : 'bg-white text-[#5a6b85] ring-1 ring-[#e2e8f3] hover:bg-[#f8fafc]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Không thể tải danh sách booking. Vui lòng thử lại.
        </div>
      )}

      {!isLoading && !isError && bookings.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#e2e8f3] bg-white py-16 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-[#8694ad]" />
          <p className="font-semibold text-[#5a6b85]">Không có booking nào</p>
          <p className="mt-1 text-sm text-[#8694ad]">
            {statusFilter === 'ALL' ? 'Chưa có booking nào được phân công cho bạn.' : 'Không có booking ở trạng thái này.'}
          </p>
        </div>
      )}

      {bookings.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {bookings.map((b) => <BookingCard key={b.id} booking={b} />)}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-[#e2e8f3] bg-white px-3 py-1.5 text-sm font-medium text-[#5a6b85] disabled:opacity-40 hover:bg-[#f8fafc]"
          >
            ← Trước
          </button>
          <span className="text-sm text-[#5a6b85]">
            Trang {page} / {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-[#e2e8f3] bg-white px-3 py-1.5 text-sm font-medium text-[#5a6b85] disabled:opacity-40 hover:bg-[#f8fafc]"
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}
