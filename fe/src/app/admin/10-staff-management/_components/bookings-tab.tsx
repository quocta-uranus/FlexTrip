'use client';

import { useState } from 'react';
import { CalendarDays, Search, Sparkles, UserCheck } from 'lucide-react';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { FilterSelect, type FilterOption } from '@/components/admin/filter-select';
import { Pagination } from '@/components/admin/pagination';
import { StaffPicker } from './staff-picker';
import { useAdminToast } from '@/components/admin/use-admin-toast';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  useActiveStaffOptions, useAssignableBookings, useAssignBooking, useAutoAssign,
} from '@/hooks/admin/use-admin-staff';
import { formatDate } from '@/lib/format';
import type { ApiError } from '@/lib/api/client';
import type { AssignableBooking, BookingStatus } from '@/types/admin';
import { BOOKING_STATUS_LABEL } from '@/types/booking';
import { bookingCode } from '@/lib/booking-code';

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
      {BOOKING_STATUS_LABEL[status as keyof typeof BOOKING_STATUS_LABEL] ?? status}
    </span>
  );
}

const ASSIGNED_OPTIONS: FilterOption<'ALL' | 'true' | 'false'>[] = [
  { value: 'ALL', label: 'Tất cả phân công' },
  { value: 'false', label: 'Chưa gán staff', dotClass: 'bg-amber-400' },
  { value: 'true', label: 'Đã gán staff', dotClass: 'bg-emerald-500' },
];

const STATUS_OPTIONS: FilterOption<BookingStatus | 'ALL'>[] = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'PENDING_APPROVAL' as BookingStatus, label: BOOKING_STATUS_LABEL.PENDING_APPROVAL, dotClass: STATUS_STYLES.PENDING_APPROVAL.dot },
  { value: 'CONFIRMED', label: BOOKING_STATUS_LABEL.CONFIRMED, dotClass: STATUS_STYLES.CONFIRMED.dot },
  { value: 'IN_PROGRESS' as BookingStatus, label: BOOKING_STATUS_LABEL.IN_PROGRESS, dotClass: STATUS_STYLES.IN_PROGRESS.dot },
];

const CHANGE_REASONS = ['Staff nghỉ đột xuất', 'Sai khu vực', 'Quá tải việc', 'Khác'];

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
  // A change that needs a reason waits here until the admin confirms it in the dialog.
  const [pendingChange, setPendingChange] = useState<{ booking: AssignableBooking; staffId: string | null } | null>(null);
  const bookings = data?.items ?? [];
  const staffList = staffOpts?.items ?? [];

  function requestAssign(b: AssignableBooking, staffId: string | null) {
    if (staffId === (b.assignedStaff?.id ?? null)) return;
    if (!b.assignedStaff) {
      // Nobody to replace, so nothing to explain.
      if (staffId) assign.mutate({ bookingId: b.id, staffId }, { onSuccess: () => toast.success('Đã gán nhân viên'), onError: toast.error });
      return;
    }
    // The admin BookingStatus type predates IN_PROGRESS, but the API does return it.
    if (!staffId && (b.status as string) === 'IN_PROGRESS') {
      toast.error(new Error('Đơn đã bàn giao nên không thể bỏ trống nhân viên phụ trách. Hãy đổi sang nhân viên khác.'));
      return;
    }
    setPendingChange({ booking: b, staffId });
  }

  function confirmChange(reason: string) {
    if (!pendingChange) return;
    const { booking, staffId } = pendingChange;
    assign.mutate(
      { bookingId: booking.id, staffId, reason },
      {
        onSuccess: () => { toast.success(staffId ? 'Đã đổi nhân viên phụ trách' : 'Đã bỏ gán'); setPendingChange(null); },
        onError: (err) => { toast.error(err); setPendingChange(null); },
      },
    );
  }

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
        <FilterSelect
          ariaLabel="Lọc theo phân công"
          value={assigned}
          defaultValue="ALL"
          onChange={setAssigned}
          options={ASSIGNED_OPTIONS}
        />
        <FilterSelect
          ariaLabel="Lọc theo trạng thái"
          value={status}
          defaultValue="ALL"
          onChange={setStatus}
          options={STATUS_OPTIONS}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#e2e8f3] bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-[#f1f5fa] bg-[#f8fafc] text-left">
              {['Đơn thuê', 'Sản phẩm', 'Traveler', 'Ngày thuê', 'Trạng thái', 'Staff phụ trách', ''].map((h) => (
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
                    {bookingCode(b.id)}
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
                  <StaffPicker
                    current={b.assignedStaff}
                    staff={staffList}
                    disabled={assign.isPending}
                    onChange={(staffId) => requestAssign(b, staffId)}
                  />
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
                    Tự động gán
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
      <ConfirmDialog
        open={pendingChange !== null}
        onOpenChange={(open) => { if (!open) setPendingChange(null); }}
        title={pendingChange?.staffId ? 'Đổi nhân viên phụ trách' : 'Bỏ gán nhân viên'}
        description={
          pendingChange
            ? pendingChange.staffId
              ? `Đổi từ ${pendingChange.booking.assignedStaff?.name} sang ${staffList.find((x) => x.id === pendingChange.staffId)?.name ?? 'nhân viên mới'}. Nhân viên cũ sẽ được báo.`
              : `${pendingChange.booking.assignedStaff?.name} sẽ không còn phụ trách đơn này và được báo ngay.`
            : undefined
        }
        confirmLabel={pendingChange?.staffId ? 'Đổi nhân viên' : 'Bỏ gán'}
        tone={pendingChange?.staffId ? 'default' : 'danger'}
        requireReason
        reasonPresets={CHANGE_REASONS}
        pending={assign.isPending}
        onConfirm={confirmChange}
      />
      {toast.node}
    </div>
  );
}
