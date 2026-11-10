'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSaveSchedule } from '@/hooks/admin/use-admin-reports';
import { reportScheduleSchema, type ReportScheduleInput } from '@/lib/validators/support.schema';
import type { ReportSchedule } from '@/types/admin';
import { FREQUENCY_LABELS, REPORT_TYPE_LABELS } from '../report-labels';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ReportSchedule | null;
  onSuccess: (msg: string) => void;
  onError: (err: unknown) => void;
}

const EMPTY: ReportScheduleInput = { name: '', type: 'REVENUE', frequency: 'WEEKLY', recipients: '' };
const SELECT_CLASS = 'h-10 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 text-sm outline-none focus:border-[#2a7bd9]';

export function ScheduleFormDialog({ open, onOpenChange, schedule, onSuccess, onError }: Props) {
  const save = useSaveSchedule();
  const editing = !!schedule;
  const form = useForm<ReportScheduleInput>({ resolver: zodResolver(reportScheduleSchema), defaultValues: EMPTY });
  const { errors } = form.formState;

  useEffect(() => {
    if (!open) return;
    form.reset(schedule
      ? { name: schedule.name, type: schedule.type, frequency: schedule.frequency, recipients: schedule.recipients.join(', ') }
      : EMPTY);
  }, [open, schedule, form]);

  const onSubmit = form.handleSubmit((values) => {
    save.mutate(
      { id: schedule?.id, ...values, recipients: values.recipients.split(/[\s,;]+/).filter(Boolean) },
      {
        onSuccess: () => { onSuccess(editing ? 'Đã cập nhật lịch gửi' : 'Đã tạo lịch gửi'); onOpenChange(false); },
        onError,
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[200] bg-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Chỉnh sửa lịch gửi' : 'Tạo lịch gửi báo cáo'}</DialogTitle>
          <DialogDescription>Báo cáo CSV được gửi tự động lúc 08:00 (giờ Việt Nam).</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sch-name">Tên lịch</Label>
            <Input id="sch-name" placeholder="VD: Doanh thu hàng tuần" maxLength={100} aria-invalid={!!errors.name} {...form.register('name')} />
            {errors.name && <p className="text-xs font-medium text-red-600">{errors.name.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sch-type">Loại báo cáo</Label>
              <select id="sch-type" className={SELECT_CLASS} {...form.register('type')}>
                {Object.entries(REPORT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sch-freq">Tần suất</Label>
              <select id="sch-freq" className={SELECT_CLASS} {...form.register('frequency')}>
                {Object.entries(FREQUENCY_LABELS).map(([v, l]) => <option key={v} value={v}>{l.option}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sch-recipients">Email nhận báo cáo</Label>
            <Input id="sch-recipients" placeholder="a@flextrip.vn, b@flextrip.vn" aria-invalid={!!errors.recipients} {...form.register('recipients')} />
            {errors.recipients && <p className="text-xs font-medium text-red-600">{errors.recipients.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>Huỷ</Button>
            <Button type="submit" disabled={save.isPending} className="bg-[#2a7bd9] text-white hover:bg-[#1e5aa8]">
              {save.isPending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo lịch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
