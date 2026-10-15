'use client';

import { useState } from 'react';
import { CalendarDays, Search, Sparkles, UserCheck } from 'lucide-react';
import { Pagination } from '@/components/admin/pagination';
import { useAdminToast } from '@/components/admin/use-admin-toast';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  useActiveStaffOptions, useAssignableBookings, useAssignBooking, useAutoAssign,
} from '@/hooks/admin/use-admin-staff';
import { formatDate } from '@/lib/format';
import type { ApiError } from '@/lib/api/client';
import type { BookingStatus } from '@/types/admin';

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING_APPROVAL: { bg: 'bg-yellow-50',  text: 'text-yellow-700', dot: 'bg-yellow-400' },
  CONFIRMED:        { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-400' },
  IN_PROGRESS:      { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500' },
  COMPLETED:        { bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400' },
  DISPUTED:         { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500' },
  CANCELLED:        { bg: 'bg-slate-100',  text: 'text-slate-400',  dot: 'bg-slate-300' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

const FILTER_SELECT = 'h-9 rounded-xl border border-[#e2e8f3] bg-white px-3 text-sm text-[#0f1729] outline-none focus:border-[#2a7bd9] focus:ring-2 focus:ring-[#2a7bd9]/10';

export function BookingsTab() {
  const [assigned, setAssigned] = useState<'ALL' | 'true' | 'false'>('ALL');
  const [status, setStatus] = useState<BookingStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search);
  const filterKey = `${assigned}|${status}|${debounced}`;
  const [prevKey, setPrevKey] = useState(filterKey);
  if (filterKey !== prevKey) { setPrevKey(filterKey); setPage(1); }

  const { data, isLoading } = useAssignableBookings({ assigned, status, search: debounced, page });
  const { data: staffOpts } = useActiveStaffOptions();
  const assign = useAssignBooking();
  const autoAssign = useAutoAssign();
  const toast = useAdminToast();
  const bookings = data?.items ?? [];
  const staffList = staffOpts?.items ?? [];

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e2e8f3] bg-white px-5 py-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8694ad]" />
          <input
            type="text"
            placeholder="Tìm địa điểm, tiêu đề, booking ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-[#e2e8f3] bg-[#f8fafc] pl-9 pr-4 text-sm outline-none transition focus:border-[#2a7bd9] focus:ring-2 focus:ring-[#2a7bd9]/10"
          />
        </div>
        <select value={assigned} onChange={(e) => setAssigned(e.target.value as 'ALL' | 'true' | 'false')} className={FILTER_SELECT}>
          <option value="ALL">Tất cả phân công</option>
          <option value="false">Chưa gán staff</option>
          <option value="true">Đã gán staff</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus | 'ALL')} className={FILTER_SELECT}>
          <option value="ALL">Tất cả trạng thái</option>
          <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#e2e8f3] bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-[#f1f5fa] bg-[#f8fafc] text-left">
              {['Booking', 'Listing', 'Traveler', 'Ngày thuê', 'Trạng thái', 'Staff phụ trách', ''].map((h) => (
                <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#8694ad]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5fa]">
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}><td colSpan={7} className="px-5 py-3"><Skeleton className="h-10 w-full" /></td></tr>
            ))}
            {!isLoading && bookings.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16">
                  <EmptyState icon={Search} title="Không có booking" description="Thử thay đổi bộ lọc tìm kiếm." />
                </td>
              </tr>
            )}
            {bookings.map((b) => (
              <tr key={b.id} className="group hover:bg-[#f8fafc]">
                {/* ID */}
                <td className="px-5 py-3.5">
                  <span className="rounded-md bg-[#f1f5fa] px-2 py-0.5 font-mono text-[11px] text-[#5a6b85]">
                    #{b.id.slice(0, 8)}
                  </span>
                </td>

                {/* Listing */}
                <td className="px-5 py-3.5">
                  <p className="max-w-[180px] truncate font-medium text-[#0f1729]">{b.listing.title}</p>
                  <p className="text-xs text-[#8694ad]">{b.listing.location}</p>
                </td>

                {/* Traveler */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2a7bd9]/10 text-[10px] font-bold text-[#2a7bd9]">
                      {b.traveler.name.split(' ').pop()?.[0] ?? '?'}
                    </span>
                    <span className="text-sm font-medium text-[#0f1729]">{b.traveler.name}</span>
                  </div>
                </td>

                {/* Dates */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#5a6b85]">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#8694ad]" />
                    <span>{formatDate(b.startDate)}</span>
                    <span className="text-[#8694ad]">–</span>
                    <span>{formatDate(b.endDate)}</span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-5 py-3.5">
                  <StatusBadge status={b.status} />
                </td>

                {/* Staff assignment */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    {b.assignedStaff && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-700">
                        {b.assignedStaff.name.split(' ').pop()?.[0] ?? '?'}
                      </span>
                    )}
                    <select
                      value={b.assignedStaff?.id ?? ''}
                      disabled={assign.isPending}
                      onChange={(e) => {
                        assign.mutate(
                          { bookingId: b.id, staffId: e.target.value || null },
                          {
                            onSuccess: () => toast.success(e.target.value ? 'Đã gán nhân viên' : 'Đã bỏ gán'),
                            onError: toast.error,
                          },
                        );
                      }}
                      className="h-8 max-w-[160px] rounded-lg border border-[#e2e8f3] bg-white px-2 text-xs text-[#0f1729] outline-none focus:border-[#2a7bd9] disabled:opacity-50"
                    >
                      <option value="">— Chưa gán —</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </td>

                {/* Auto-assign */}
                <td className="px-5 py-3.5">
                  <button
                    type="button"
                    disabled={autoAssign.isPending}
                    onClick={() => {
                      autoAssign.mutate(b.id, {
                        onSuccess: (r) => toast.success(`Đã gán "${r.booking.assignedStaff?.name ?? ''}" theo rule "${r.rule.name}"`),
                        onError: (err) => {
                          const apiErr = err as ApiError;
                          toast.error(apiErr.code === 'NO_MATCHING_RULE' ? apiErr : err);
                        },
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a7bd9]/30 bg-[#2a7bd9]/5 px-3 py-1.5 text-xs font-semibold text-[#2a7bd9] transition-colors hover:bg-[#2a7bd9]/10 disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Tự gán
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-xs text-[#8694ad]">
        <span className="flex items-center gap-1.5">
          <UserCheck className="h-4 w-4" />
          Hiển thị {bookings.length} / {data?.total ?? 0} booking
        </span>
        <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
      </div>
      {toast.node}
    </div>
  );
}
