'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Upload } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useConfirmStaffTask } from '@/hooks/use-staff-operations';
import { staffConditionSchema, type StaffConditionInput } from '@/lib/validators/staff.schema';

export const INSPECTION_ITEMS = {
  HANDOVER: ['Đúng thiết bị trong đơn thuê', 'Đầy đủ phụ kiện đi kèm', 'Hoạt động bình thường'],
  RETURN: ['Ngoại quan nguyên vẹn, không hư hỏng mới', 'Đầy đủ phụ kiện đi kèm', 'Hoạt động bình thường', 'Đã vệ sinh sạch sẽ'],
} as const;

function errMsg(e: unknown) {
  return e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
    ? (e as { message: string }).message
    : 'Không thể thực hiện. Vui lòng thử lại.';
}

interface ConditionDialogProps {
  open: boolean;
  type: 'HANDOVER' | 'RETURN';
  bookingId: string;
  providerCondition?: string | null;
  onClose: () => void;
  onDone: (msg: string) => void;
  onReportIssue: () => void;
}

// Dùng chung cho trang chi tiết booking và dashboard để checklist luôn hiển thị đủ, không có đường xác nhận nào bỏ qua được.
export function ConditionDialog({
  open, type, bookingId, providerCondition, onClose, onDone, onReportIssue,
}: ConditionDialogProps) {
  const mutation = useConfirmStaffTask();
  const form = useForm<StaffConditionInput>({ resolver: zodResolver(staffConditionSchema) });
  const items = INSPECTION_ITEMS[type];
  const [checked, setChecked] = useState<boolean[]>([]);
  const ticks = items.map((_, i) => checked[i] ?? false);
  const blocked = ticks.some((t) => !t);

  const submit = form.handleSubmit((v) => {
    mutation.mutate(
      {
        bookingId, type, conditionNote: v.conditionNote, file: v.file,
        checklist: items.map((label, i) => ({ label, ok: ticks[i] })),
      },
      {
        onSuccess: () => {
          form.reset(); setChecked([]); onClose();
          onDone(type === 'HANDOVER' ? 'Đã xác nhận bàn giao. Cuộc thuê đã bắt đầu.' : 'Đã kiểm tra và nhận lại. Cuộc thuê đã hoàn thành.');
        },
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{type === 'HANDOVER' ? 'Xác nhận giao thiết bị' : 'Xác nhận nhận lại thiết bị'}</DialogTitle>
          <DialogDescription>Ảnh và ghi chú sẽ được lưu vào biên bản để đối chiếu khi có tranh chấp.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {providerCondition && (
            <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
              <p className="text-xs font-semibold text-slate-500">Tình trạng do Provider mô tả</p>
              <p className="whitespace-pre-line text-slate-700">{providerCondition}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label>{type === 'RETURN' ? 'Kiểm tra thiết bị khi nhận lại' : 'Xác nhận thiết bị đúng như mô tả'}</Label>
            <div className="space-y-1.5 rounded-xl border border-slate-200 p-3">
              {items.map((label, i) => (
                <label key={label} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-600"
                    checked={ticks[i]}
                    onChange={(e) => setChecked(ticks.map((t, j) => (j === i ? e.target.checked : t)))}
                  />
                  {label}
                </label>
              ))}
            </div>
            {blocked && (
              <div className="flex items-start justify-between gap-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                <span>
                  {type === 'RETURN'
                    ? 'Chưa thể hoàn thành vì còn hạng mục chưa đạt. Nếu phát hiện vấn đề, hãy lập biên bản thương lượng.'
                    : 'Cần tick đủ các hạng mục trước khi bàn giao. Nếu thiết bị có vấn đề, hãy lập biên bản thương lượng thay vì bàn giao.'}
                </span>
                <button type="button" onClick={() => { onClose(); onReportIssue(); }} className="shrink-0 font-semibold underline">
                  Lập biên bản
                </button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Ảnh tình trạng</Label>
            <Input type="file" accept="image/*" capture="environment"
              onChange={(e) => form.setValue('file', e.target.files?.[0] as File, { shouldValidate: true })} />
            {form.formState.errors.file && <p className="text-xs text-red-600">{form.formState.errors.file.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Ghi chú <span className="font-normal text-slate-400">(không bắt buộc)</span></Label>
            <Textarea rows={3} placeholder="Ghi chú thêm nếu có, ví dụ vết xước nhỏ, phụ kiện đi kèm..." {...form.register('conditionNote')} />
            {form.formState.errors.conditionNote && <p className="text-xs text-red-600">{form.formState.errors.conditionNote.message}</p>}
          </div>
          {mutation.isError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errMsg(mutation.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
            <Button type="submit" disabled={mutation.isPending || blocked}>
              <Upload className="h-4 w-4" />
              {mutation.isPending ? 'Đang lưu...' : type === 'HANDOVER' ? 'Xác nhận & bắt đầu thuê' : 'Xác nhận & hoàn thành'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
