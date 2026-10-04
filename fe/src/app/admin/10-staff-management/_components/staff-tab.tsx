'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { Reveal } from '@/components/profile/wow';
import { Pagination } from '@/components/admin/pagination';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useAdminToast } from '@/components/admin/use-admin-toast';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useStaffList, useUpdateStaff } from '@/hooks/admin/use-admin-staff';
import { formatDateTime } from '@/lib/format';
import type { AdminStaff } from '@/types/admin';
import { StaffFormDialog } from './staff-form-dialog';

export function StaffTab() {
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState<'ALL' | 'true' | 'false'>('ALL');
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search);
  const filterKey = `${debounced}|${isActive}`;
  const [prevKey, setPrevKey] = useState(filterKey);
  if (filterKey !== prevKey) {
    setPrevKey(filterKey);
    setPage(1);
  }

  const { data, isLoading } = useStaffList({ search: debounced, isActive, page });
  const update = useUpdateStaff();
  const toast = useAdminToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<AdminStaff | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AdminStaff | null>(null);

  const staff = data?.items ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4" style={{ borderColor: '#e2e8f3' }}>
        <div className="relative min-w-[240px] flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#8694ad' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm tên, email, mã NV..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border bg-[#f8fafc] py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2"
            style={{ borderColor: '#e2e8f3' }}
          />
        </div>
        <select
          value={isActive}
          onChange={(e) => setIsActive(e.target.value as 'ALL' | 'true' | 'false')}
          className="rounded-xl border bg-white px-4 py-2.5 text-sm outline-none"
          style={{ borderColor: '#e2e8f3' }}
        >
          <option value="ALL">Tất cả</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Ngừng</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setEditStaff(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#15803d]"
        >
          Thêm nhân viên
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      ) : staff.length === 0 ? (
        <EmptyState icon={Users} title="Không có nhân viên" description="Thêm nhân viên mới hoặc đổi bộ lọc." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((s, i) => (
            <Reveal key={s.id} delay={i * 40}>
              <div className="group rounded-2xl border bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-xl" style={{ borderColor: '#e2e8f3' }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-lg font-bold text-white">
                        {s.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <span
                        className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white"
                        style={{ background: s.isActive ? '#16a34a' : '#6b7280' }}
                      >
                        {s.isActive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold" style={{ color: '#0f1729' }}>{s.name}</div>
                      <div className="text-xs" style={{ color: '#5a6b85' }}>{s.email}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {!s.isActive && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Ngừng hoạt động</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: '#8694ad' }}>{s.employeeCode}</span>
                </div>

                {s.phone && <div className="mt-2 text-xs text-slate-500">{s.phone}</div>}
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.regions.map((r) => (
                    <span key={r} className="rounded-full bg-[#f1f5fa] px-2 py-0.5 text-[10px] font-medium text-slate-600">{r}</span>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4" style={{ borderColor: '#f1f5fa' }}>
                  <div className="text-center">
                    <div className="text-lg font-bold" style={{ color: '#0f1729' }}>{s.openAssignments}</div>
                    <div className="text-[10px]" style={{ color: '#8694ad' }}>Đang phụ trách</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold" style={{ color: '#16a34a' }}>{s.completedAssignments}</div>
                    <div className="text-[10px]" style={{ color: '#8694ad' }}>Hoàn thành</div>
                  </div>
                </div>

                <div className="mt-3 border-t pt-3 text-xs" style={{ borderColor: '#f1f5fa', color: '#8694ad' }}>
                  {s.lastActiveAt ? `Hoạt động: ${formatDateTime(s.lastActiveAt)}` : 'Chưa đăng nhập'}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditStaff(s);
                      setFormOpen(true);
                    }}
                    className="flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors hover:bg-[#f1f5fa]"
                    style={{ borderColor: '#e2e8f3', color: '#5a6b85' }}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => setToggleTarget(s)}
                    className="flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors hover:bg-[#f1f5fa]"
                    style={{ borderColor: '#e2e8f3', color: '#5a6b85' }}
                  >
                    {s.isActive ? 'Tạm ngừng' : 'Kích hoạt'}
                  </button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>Hiển thị {staff.length} / {data?.total ?? 0}</span>
        <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
      </div>

      <StaffFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        staff={editStaff}
        onSuccess={toast.success}
        onError={toast.error}
      />
      <ConfirmDialog
        open={toggleTarget !== null}
        onOpenChange={(o) => !o && setToggleTarget(null)}
        title={toggleTarget?.isActive ? `Tạm ngừng ${toggleTarget.name}?` : `Kích hoạt ${toggleTarget?.name}?`}
        confirmLabel={toggleTarget?.isActive ? 'Tạm ngừng' : 'Kích hoạt'}
        tone={toggleTarget?.isActive ? 'danger' : 'default'}
        pending={update.isPending}
        onConfirm={() => {
          if (!toggleTarget) return;
          update.mutate(
            { id: toggleTarget.id, isActive: !toggleTarget.isActive },
            {
              onSuccess: () => {
                toast.success(toggleTarget.isActive ? 'Đã tạm ngừng' : 'Đã kích hoạt');
                setToggleTarget(null);
              },
              onError: toast.error,
            },
          );
        }}
      />
      {toast.node}
    </div>
  );
}
