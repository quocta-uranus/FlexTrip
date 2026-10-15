'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GitBranch, MapPin, Settings2, User2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActiveStaffOptions, useSaveRule } from '@/hooks/admin/use-admin-staff';
import { STAFF_REGIONS, staffRuleSchema, type StaffRuleInput } from '@/lib/validators/admin.schema';
import type { ApiError } from '@/lib/api/client';
import type { StaffRule } from '@/types/admin';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: StaffRule | null;
  onSuccess: (msg: string) => void;
  onError: (err: unknown) => void;
}

const SELECT_CLASS =
  'h-11 w-full appearance-none rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-[#2a7bd9] focus:ring-2 focus:ring-[#2a7bd9]/15 disabled:bg-slate-100';

export function RuleFormDialog({ open, onOpenChange, rule, onSuccess, onError }: Props) {
  const save = useSaveRule();
  const { data: staffOpts } = useActiveStaffOptions();
  const editing = !!rule;

  const form = useForm<StaffRuleInput>({
    resolver: zodResolver(staffRuleSchema),
    defaultValues: { name: '', region: '', staffId: '', priority: 50, isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    if (rule) {
      form.reset({ name: rule.name, region: rule.region, staffId: rule.staff.id, priority: rule.priority, isActive: rule.isActive });
    } else {
      form.reset({ name: '', region: '', staffId: '', priority: 50, isActive: true });
    }
  }, [open, rule, form]);

  const onSubmit = form.handleSubmit((values) => {
    save.mutate(
      { id: rule?.id, ...values },
      {
        onSuccess: () => {
          onSuccess(editing ? 'Đã cập nhật rule' : 'Đã tạo rule');
          onOpenChange(false);
        },
        onError: (err) => {
          const apiErr = err as ApiError;
          if (apiErr.code === 'STAFF_NOT_AVAILABLE') {
            form.setError('staffId', { message: apiErr.message });
            return;
          }
          onError(err);
        },
      },
    );
  });

  const priority = form.watch('priority');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[200] overflow-hidden border-0 bg-white p-0 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.45)] sm:max-w-lg [&>[data-slot=dialog-close]]:right-4 [&>[data-slot=dialog-close]]:top-4 [&>[data-slot=dialog-close]]:text-white [&>[data-slot=dialog-close]]:hover:bg-white/10 [&>[data-slot=dialog-close]]:hover:text-white">
        {/* Header */}
        <DialogHeader className="relative overflow-hidden bg-[#0f1729] px-6 py-6 pr-14 text-white sm:px-8">
          <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[#2a7bd9]/25 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#92eee8]">
                Rule phân công
              </div>
              <DialogTitle className="text-xl font-bold leading-tight text-white">
                {editing ? 'Chỉnh sửa rule' : 'Thêm rule mới'}
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-5 text-slate-300">
                {editing
                  ? 'Cập nhật khu vực, nhân viên hoặc mức ưu tiên.'
                  : 'Booking thuộc khu vực này sẽ tự động được gán cho nhân viên được chọn.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={onSubmit} className="flex flex-col">
          <div className="space-y-5 px-6 py-6 sm:px-8">
            {/* Tên rule */}
            <div className="space-y-2">
              <Label htmlFor="rule-name" className="flex items-center gap-1.5 text-xs font-semibold text-[#5a6b85]">
                <Settings2 className="h-3.5 w-3.5" />
                Tên rule <span className="text-red-500">*</span>
              </Label>
              <Input
                id="rule-name"
                placeholder="VD: Giao nhận Quận 1 – HCM"
                className="h-11 rounded-xl border-slate-200 bg-[#f8fafc] focus-visible:border-[#2a7bd9] focus-visible:ring-[#2a7bd9]/15"
                aria-invalid={!!form.formState.errors.name}
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-xs font-medium text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Khu vực + Nhân viên */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rule-region" className="flex items-center gap-1.5 text-xs font-semibold text-[#5a6b85]">
                  <MapPin className="h-3.5 w-3.5" />
                  Khu vực <span className="text-red-500">*</span>
                </Label>
                <select id="rule-region" className={SELECT_CLASS} aria-invalid={!!form.formState.errors.region} {...form.register('region')}>
                  <option value="">— Chọn khu vực —</option>
                  {STAFF_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {form.formState.errors.region && (
                  <p className="text-xs font-medium text-red-600">{form.formState.errors.region.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rule-staff" className="flex items-center gap-1.5 text-xs font-semibold text-[#5a6b85]">
                  <User2 className="h-3.5 w-3.5" />
                  Nhân viên phụ trách <span className="text-red-500">*</span>
                </Label>
                <select id="rule-staff" className={SELECT_CLASS} aria-invalid={!!form.formState.errors.staffId} {...form.register('staffId')}>
                  <option value="">— Chọn nhân viên —</option>
                  {(staffOpts?.items ?? []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} · {s.employeeCode}</option>
                  ))}
                </select>
                {form.formState.errors.staffId && (
                  <p className="text-xs font-medium text-red-600">{form.formState.errors.staffId.message}</p>
                )}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="rule-priority" className="text-xs font-semibold text-[#5a6b85]">
                  Mức ưu tiên
                </Label>
                <span className="rounded-lg bg-[#2a7bd9]/10 px-2.5 py-0.5 text-sm font-bold tabular-nums text-[#2a7bd9]">
                  {priority}
                </span>
              </div>
              <input
                id="rule-priority"
                type="range"
                min={0}
                max={100}
                step={1}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#2a7bd9]"
                {...form.register('priority', { setValueAs: (v) => Number(v) })}
              />
              <div className="flex justify-between text-[10px] text-[#8694ad]">
                <span>0 — thấp nhất</span>
                <span>100 — cao nhất</span>
              </div>
              {form.formState.errors.priority && (
                <p className="text-xs font-medium text-red-600">{form.formState.errors.priority.message}</p>
              )}
            </div>

            {/* Active toggle */}
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#0f1729]">Kích hoạt rule</p>
                <p className="text-xs text-[#8694ad]">Rule chỉ hoạt động khi được bật</p>
              </div>
              <div className="relative">
                <input type="checkbox" {...form.register('isActive')} className="peer sr-only" />
                <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-[#2a7bd9]" />
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-[#f8fafc] px-6 py-4 sm:px-8">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}
              className="h-10 rounded-xl border-slate-200 px-5 text-[#5a6b85]">
              Huỷ
            </Button>
            <Button type="submit" disabled={save.isPending}
              className="h-10 rounded-xl bg-[#2a7bd9] px-6 font-semibold text-white hover:bg-[#1e5aa8]">
              {save.isPending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
