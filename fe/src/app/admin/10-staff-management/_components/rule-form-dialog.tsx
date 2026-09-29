'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActiveStaffOptions, useSaveRule } from '@/hooks/admin/use-admin-staff';
import { staffRuleSchema, type StaffRuleInput } from '@/lib/validators/admin.schema';
import type { ApiError } from '@/lib/api/client';
import type { StaffRule } from '@/types/admin';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: StaffRule | null;
  onSuccess: (msg: string) => void;
  onError: (err: unknown) => void;
}

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
      form.reset({
        name: rule.name,
        region: rule.region,
        staffId: rule.staff.id,
        priority: rule.priority,
        isActive: rule.isActive,
      });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Sửa rule' : 'Thêm rule'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule-name">Tên rule</Label>
            <Input id="rule-name" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-region">Khu vực</Label>
            <Input id="rule-region" {...form.register('region')} />
            <p className="text-xs text-slate-500">
              So khớp không dấu với địa chỉ tin đăng. Viết đúng tên như trong địa chỉ, ví dụ &apos;Hồ Chí Minh&apos; (không dùng &apos;HCM&apos;)
            </p>
            {form.formState.errors.region && <p className="text-xs text-red-600">{form.formState.errors.region.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-staff">Nhân viên</Label>
            <select
              id="rule-staff"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
              {...form.register('staffId')}
            >
              <option value="">— Chọn —</option>
              {(staffOpts?.items ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.employeeCode})</option>
              ))}
            </select>
            {form.formState.errors.staffId && <p className="text-xs text-red-600">{form.formState.errors.staffId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-priority">Ưu tiên (0–100)</Label>
            <Input
              id="rule-priority"
              type="number"
              {...form.register('priority', { setValueAs: (v) => Number(v) })}
            />
            {form.formState.errors.priority && <p className="text-xs text-red-600">{form.formState.errors.priority.message}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('isActive')} className="rounded border-slate-300" />
            Đang hoạt động
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>Huỷ</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Lưu'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
