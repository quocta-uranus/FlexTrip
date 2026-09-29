'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useAdminToast } from '@/components/admin/use-admin-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteRule, useSaveRule, useStaffRules } from '@/hooks/admin/use-admin-staff';
import type { StaffRule } from '@/types/admin';
import { RuleFormDialog } from './rule-form-dialog';

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
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">Rule tự động gán booking theo khu vực (ưu tiên cao hơn khớp trước).</p>
        <button
          type="button"
          onClick={() => {
            setEditRule(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[#2a7bd9] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1e5aa8]"
        >
          Thêm rule
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Khu vực</th>
              <th className="px-4 py-3">Nhân viên</th>
              <th className="px-4 py-3 text-right">Ưu tiên</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr><td colSpan={6} className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</td></tr>
            )}
            {!isLoading && (rules ?? []).length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">Chưa có rule nào</td></tr>
            )}
            {(rules ?? []).map((rule) => (
              <tr key={rule.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{rule.name}</td>
                <td className="px-4 py-3 text-slate-600">{rule.region}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{rule.staff.name}</div>
                  <div className="text-xs text-slate-500">{rule.staff.employeeCode}</div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{rule.priority}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={save.isPending}
                    onClick={() => {
                      save.mutate(
                        {
                          id: rule.id,
                          name: rule.name,
                          region: rule.region,
                          staffId: rule.staff.id,
                          priority: rule.priority,
                          isActive: !rule.isActive,
                        },
                        {
                          onSuccess: () => toast.success(rule.isActive ? 'Đã tắt rule' : 'Đã bật rule'),
                          onError: toast.error,
                        },
                      );
                    }}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      rule.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {rule.isActive ? 'ON' : 'OFF'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditRule(rule);
                        setFormOpen(true);
                      }}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(rule)}
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Xoá
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RuleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        rule={editRule}
        onSuccess={toast.success}
        onError={toast.error}
      />
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
            onSuccess: () => {
              toast.success('Đã xoá rule');
              setDeleteTarget(null);
            },
            onError: toast.error,
          });
        }}
      />
      {toast.node}
    </div>
  );
}
