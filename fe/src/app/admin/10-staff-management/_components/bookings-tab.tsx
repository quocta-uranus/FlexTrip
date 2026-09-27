'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Pagination } from '@/components/admin/pagination';
import { useAdminToast } from '@/components/admin/use-admin-toast';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  useActiveStaffOptions,
  useAssignableBookings,
  useAssignBooking,
  useAutoAssign,
} from '@/hooks/admin/use-admin-staff';
import { formatDate } from '@/lib/format';
import type { ApiError } from '@/lib/api/client';
import type { BookingStatus } from '@/types/admin';

export function BookingsTab() {
  const [assigned, setAssigned] = useState<'ALL' | 'true' | 'false'>('ALL');
  const [status, setStatus] = useState<BookingStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search);
  const filterKey = `${assigned}|${status}|${debounced}`;
  const [prevKey, setPrevKey] = useState(filterKey);
  if (filterKey !== prevKey) {
    setPrevKey(filterKey);
    setPage(1);
  }

  const { data, isLoading } = useAssignableBookings({ assigned, status, search: debounced, page });
  const { data: staffOpts } = useActiveStaffOptions();
  const assign = useAssignBooking();
  const autoAssign = useAutoAssign();
  const toast = useAdminToast();
  const bookings = data?.items ?? [];
  const staffList = staffOpts?.items ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={assigned}
          onChange={(e) => setAssigned(e.target.value as 'ALL' | 'true' | 'false')}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
        >
          <option value="ALL">Tất cả</option>
          <option value="false">Chưa gán</option>
          <option value="true">Đã gán</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as BookingStatus | 'ALL')}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="PENDING">PENDING</option>
          <option value="CONFIRMED">CONFIRMED</option>
        </select>
        <input
          type="text"
          placeholder="Tìm địa điểm, tiêu đề, id..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Listing</th>
              <th className="px-4 py-3">Traveler</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr><td colSpan={7} className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</td></tr>
            )}
            {!isLoading && bookings.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8">
                  <EmptyState icon={Search} title="Không có booking" description="Thử đổi bộ lọc." />
                </td>
              </tr>
            )}
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{b.id.slice(0, 8)}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{b.listing.title}</div>
                  <div className="text-xs text-slate-500">{b.listing.location}</div>
                </td>
                <td className="px-4 py-3">{b.traveler.name}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {formatDate(b.startDate)} – {formatDate(b.endDate)}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{b.status}</span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={b.assignedStaff?.id ?? ''}
                    disabled={assign.isPending}
                    onChange={(e) => {
                      const staffId = e.target.value || null;
                      assign.mutate(
                        { bookingId: b.id, staffId },
                        {
                          onSuccess: () => toast.success(staffId ? 'Đã gán nhân viên' : 'Đã bỏ gán'),
                          onError: toast.error,
                        },
                      );
                    }}
                    className="w-full max-w-[180px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none"
                  >
                    <option value="">— Chưa gán —</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={autoAssign.isPending}
                    onClick={() => {
                      autoAssign.mutate(b.id, {
                        onSuccess: (r) => {
                          toast.success(`Đã gán ${r.booking.assignedStaff?.name ?? ''} theo rule "${r.rule.name}"`);
                        },
                        onError: (err) => {
                          const apiErr = err as ApiError;
                          toast.error(apiErr.code === 'NO_MATCHING_RULE' ? apiErr : err);
                        },
                      });
                    }}
                    className="rounded-lg border border-blue-200 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                  >
                    Tự gán
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>Hiển thị {bookings.length} / {data?.total ?? 0}</span>
        <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
      </div>
      {toast.node}
    </div>
  );
}
