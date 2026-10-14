'use client';

import { useState } from 'react';
import { GitBranch, MapPin, Pencil, Plus, Trash2, User2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useAdminToast } from '@/components/admin/use-admin-toast';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteRule, useSaveRule, useStaffRules } from '@/hooks/admin/use-admin-staff';
import type { StaffRule } from '@/types/admin';
import { RuleFormDialog } from './rule-form-dialog';

const REGION_COLORS: Record<string, { bg: string; text: string }> = {
  'Hà Nội':      { bg: 'bg-violet-100', text: 'text-violet-700' },
  'Đà Nẵng':     { bg: 'bg-sky-100',    text: 'text-sky-700' },
  'Hồ Chí Minh': { bg: 'bg-amber-100',  text: 'text-amber-700' },
};

function regionStyle(region: string) {
  return REGION_COLORS[region] ?? { bg: 'bg-slate-100', text: 'text-slate-600' };
}

function priorityColor(p: number) {
  if (p >= 75) return 'bg-red-50 text-red-700 ring-red-200';
  if (p >= 40) return 'bg-amber-50 text-amber-700 ring-amber-200';
  return 'bg-slate-50 text-slate-600 ring-slate-200';
}

function RuleRow({
  rule,
  onEdit,
  onDelete,
  onToggle,
  toggling,
}: {
  rule: StaffRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  toggling: boolean;
}) {
  const rs = regionStyle(rule.region);
  const pc = priorityColor(rule.priority);

  return (
    <tr className="group hover:bg-[#f8fafc]">
      {/* Tên */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2a7bd9]/10">
            <GitBranch className="h-3.5 w-3.5 text-[#2a7bd9]" />
          </span>
          <span className="font-semibold text-[#0f1729]">{rule.name}</span>
        </div>
      </td>

      {/* Khu vực */}
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${rs.bg} ${rs.text}`}>
          <MapPin className="h-3 w-3" />
          {rule.region}
        </span>
      </td>

      {/* Nhân viên */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 text-[10px] font-bold text-white shadow-sm">
            {rule.staff.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </span>
          <div>
            <p className="text-sm font-medium text-[#0f1729]">{rule.staff.name}</p>
            <p className="text-[10px] text-[#8694ad]">{rule.staff.employeeCode}</p>
          </div>
        </div>
      </td>

      {/* Ưu tiên */}
      <td className="px-5 py-3.5">
        <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums ring-1 ${pc}`}>
          {rule.priority}
        </span>
      </td>

      {/* Toggle */}
      <td className="px-5 py-3.5">
        <button
          type="button"
          disabled={toggling}
          onClick={onToggle}
          aria-label={rule.isActive ? 'Tắt rule' : 'Bật rule'}
          className="relative inline-flex cursor-pointer disabled:opacity-60"
        >
          <div className={`h-6 w-11 rounded-full transition-colors ${rule.isActive ? 'bg-[#16a34a]' : 'bg-slate-200'}`} />
          <div className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${rule.isActive ? 'translate-x-5' : ''}`} />
        </button>
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#5a6b85] transition-colors hover:border-[#2a7bd9] hover:bg-[#2a7bd9]/5 hover:text-[#2a7bd9]"
            aria-label="Sửa rule"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#5a6b85] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            aria-label="Xoá rule"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function RulesTab() {
  const { data: rules, isLoading } = useStaffRules();
  const save = useSaveRule();
  const del = useDeleteRule();
  const toast = useAdminToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editRule, setEditRule] = useState<StaffRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffRule | null>(null);

  return (
    <div>
      {/* Header row */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e2e8f3] bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2a7bd9]/10">
            <GitBranch className="h-4 w-4 text-[#2a7bd9]" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#0f1729]">Rule tự động phân công</p>
            <p className="text-xs text-[#8694ad]">Booking khớp khu vực sẽ được gán theo rule ưu tiên cao nhất</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setEditRule(null); setFormOpen(true); }}
          className="inline-flex items-center gap-2 rounded-full bg-[#2a7bd9] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1e5aa8]"
        >
          <Plus className="h-4 w-4" />
          Thêm rule
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#e2e8f3] bg-white">
        <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className="border-b border-[#f1f5fa] bg-[#f8fafc] text-left">
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#8694ad]">Tên rule</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#8694ad]">Khu vực</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#8694ad]">
                <span className="flex items-center gap-1"><User2 className="h-3 w-3" />Nhân viên</span>
              </th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#8694ad]">Ưu tiên</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#8694ad]">Trạng thái</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#8694ad]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5fa]">
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}><td colSpan={6} className="px-5 py-3"><Skeleton className="h-9 w-full" /></td></tr>
            ))}
            {!isLoading && (rules ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="py-16">
                  <EmptyState icon={GitBranch} title="Chưa có rule nào" description="Tạo rule để tự động phân công booking theo khu vực." />
                </td>
              </tr>
            )}
            {(rules ?? []).map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                onEdit={() => { setEditRule(rule); setFormOpen(true); }}
                onDelete={() => setDeleteTarget(rule)}
                onToggle={() => {
                  save.mutate(
                    { id: rule.id, name: rule.name, region: rule.region, staffId: rule.staff.id, priority: rule.priority, isActive: !rule.isActive },
                    {
                      onSuccess: () => toast.success(rule.isActive ? 'Đã tắt rule' : 'Đã bật rule'),
                      onError: toast.error,
                    },
                  );
                }}
                toggling={save.isPending}
              />
            ))}
          </tbody>
        </table>
      </div>

      <RuleFormDialog open={formOpen} onOpenChange={setFormOpen} rule={editRule} onSuccess={toast.success} onError={toast.error} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Xoá rule "${deleteTarget?.name}"?`}
        confirmLabel="Xoá"
        tone="danger"
        pending={del.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          del.mutate(deleteTarget.id, {
            onSuccess: () => { toast.success('Đã xoá rule'); setDeleteTarget(null); },
            onError: toast.error,
          });
        }}
      />
      {toast.node}
    </div>
  );
}
