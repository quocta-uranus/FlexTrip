'use client';

import { useState } from 'react';
import { MapPin, Pencil, Power, Users } from 'lucide-react';
import { Reveal } from '@/components/profile/wow';
import { Pagination } from '@/components/admin/pagination';
import { useAdminToast } from '@/components/admin/use-admin-toast';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useStaffList, useUpdateStaff } from '@/hooks/admin/use-admin-staff';
import { formatDateTime } from '@/lib/format';
import type { AdminStaff } from '@/types/admin';
import { StaffFormDialog } from './staff-form-dialog';
import { StaffStatusDialog } from './staff-status-dialog';

const REGION_COLORS: Record<string, { bg: string; text: string }> = {
  'Hà Nội':      { bg: 'bg-violet-50', text: 'text-violet-600' },
  'Đà Nẵng':     { bg: 'bg-sky-50',    text: 'text-sky-600' },
  'Hồ Chí Minh': { bg: 'bg-amber-50',  text: 'text-amber-600' },
};

function regionStyle(r: string) {
  return REGION_COLORS[r] ?? { bg: 'bg-slate-50', text: 'text-slate-500' };
}

function StaffCard({
  staff,
  onEdit,
  onToggle,
}: {
  staff: AdminStaff;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const initials = staff.name.split(' ').map((n) => n[0]).join('').slice(0, 2);

  return (
    <div className="group flex flex-col rounded-2xl border bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/80" style={{ borderColor: '#e2e8f3' }}>
      {/* Active indicator bar */}
      <div className={`h-1 rounded-t-2xl transition-colors ${staff.isActive ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-slate-200'}`} />

      <div className="flex flex-1 flex-col p-5">
        {/* Avatar + name */}
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-sm font-bold text-white shadow-sm">
              {initials}
            </div>
            <span
              className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${staff.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              {staff.isActive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-[#0f1729]">{staff.name}</p>
            <p className="truncate text-xs text-[#5a6b85]">{staff.email}</p>
            <span className="mt-1 inline-block max-w-full truncate rounded-md bg-[#f1f5fa] px-2 py-0.5 text-[10px] font-mono font-semibold text-[#8694ad]">
              {staff.employeeCode}
            </span>
          </div>
        </div>

        {/* Phone */}
        {staff.phone && (
          <p className="mt-3 text-xs text-[#8694ad]">{staff.phone}</p>
        )}

        {/* Regions */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {staff.regions.map((r) => {
            const rs = regionStyle(r);
            return (
              <span key={r} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${rs.bg} ${rs.text}`}>
                <MapPin className="h-2.5 w-2.5" />
                {r}
              </span>
            );
          })}
          {staff.regions.length === 0 && (
            <span className="text-xs text-[#8694ad]">Chưa có khu vực</span>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[#f1f5fa] bg-[#f8fafc] p-3">
          <div className="text-center">
            <p className="text-lg font-bold text-[#2a7bd9]">{staff.openAssignments}</p>
            <p className="text-[10px] text-[#8694ad]">Đang phụ trách</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">{staff.completedAssignments}</p>
            <p className="text-[10px] text-[#8694ad]">Hoàn thành</p>
          </div>
        </div>

        {/* Last active */}
        <p className="mt-3 text-[10px] text-[#8694ad]">
          {staff.lastActiveAt ? `Hoạt động: ${formatDateTime(staff.lastActiveAt)}` : 'Chưa đăng nhập'}
        </p>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2 border-t border-[#f1f5fa] pt-4">
          <button
            type="button"
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f3] bg-white py-2 text-xs font-semibold text-[#5a6b85] transition-colors hover:border-[#2a7bd9]/40 hover:bg-[#2a7bd9]/5 hover:text-[#2a7bd9]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Sửa
          </button>
          <button
            type="button"
            onClick={onToggle}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-colors ${
              staff.isActive
                ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            {staff.isActive ? 'Tạm ngừng' : 'Kích hoạt'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StaffTab() {
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState<'ALL' | 'true' | 'false'>('ALL');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search);
  const filterKey = `${debounced}|${isActive}`;
  const [prevKey, setPrevKey] = useState(filterKey);
  if (filterKey !== prevKey) { setPrevKey(filterKey); setPage(1); }

  const { data, isLoading } = useStaffList({ search: debounced, isActive, page });
  const update = useUpdateStaff();
  const toast = useAdminToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<AdminStaff | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AdminStaff | null>(null);
  const staff = data?.items ?? [];

  return (
    <div>
      {/* Filter + Add */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e2e8f3] bg-white px-5 py-4">
        <div className="relative min-w-[220px] flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8694ad]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm tên, email, mã NV..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-[#e2e8f3] bg-[#f8fafc] pl-9 pr-4 text-sm outline-none transition focus:border-[#2a7bd9] focus:ring-2 focus:ring-[#2a7bd9]/10"
          />
        </div>
        <select
          value={isActive}
          onChange={(e) => setIsActive(e.target.value as 'ALL' | 'true' | 'false')}
          className="h-9 rounded-xl border border-[#e2e8f3] bg-white px-3 text-sm text-[#0f1729] outline-none focus:border-[#2a7bd9]"
        >
          <option value="ALL">Tất cả</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Tạm ngừng</option>
        </select>
        <button
          type="button"
          onClick={() => { setEditStaff(null); setFormOpen(true); }}
          className="inline-flex items-center gap-2 rounded-full bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#15803d]"
        >
          <Users className="h-4 w-4" />
          Thêm nhân viên
        </button>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
        </div>
      ) : staff.length === 0 ? (
        <EmptyState icon={Users} title="Không có nhân viên" description="Thêm nhân viên mới hoặc thay đổi bộ lọc." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((s, i) => (
            <Reveal key={s.id} delay={i * 40}>
              <StaffCard
                staff={s}
                onEdit={() => { setEditStaff(s); setFormOpen(true); }}
                onToggle={() => setToggleTarget(s)}
              />
            </Reveal>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-[#8694ad]">
        <span>Hiển thị {staff.length} / {data?.total ?? 0} nhân viên</span>
        <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
      </div>

      <StaffFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        staff={editStaff}
        onSuccess={toast.success}
        onError={toast.error}
      />
      <StaffStatusDialog
        staff={toggleTarget}
        onOpenChange={(o) => !o && setToggleTarget(null)}
        pending={update.isPending}
        onConfirm={() => {
          if (!toggleTarget) return;
          update.mutate(
            { id: toggleTarget.id, isActive: !toggleTarget.isActive },
            {
              onSuccess: () => { toast.success(toggleTarget.isActive ? 'Đã tạm ngừng' : 'Đã kích hoạt'); setToggleTarget(null); },
              onError: toast.error,
            },
          );
        }}
      />
      {toast.node}
    </div>
  );
}
