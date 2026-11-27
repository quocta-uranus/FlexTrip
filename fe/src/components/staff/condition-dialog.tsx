'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Check, Package, RotateCcw, Scale } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useConfirmStaffTask } from '@/hooks/use-staff-operations';
import { cn } from '@/lib/utils';
import { staffConditionSchema, type StaffConditionInput } from '@/lib/validators/staff.schema';
import { ActionButton } from './action-button';
import { DIALOG_CLASS, DialogBand, DialogFooterBar, FIELD_CLASS, FormSection, OrderStrip } from './dialog-parts';

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
  /** Which order this is about, shown under the title so the staff member knows what they are confirming. */
  context?: { title: string; caption?: string };
  onClose: () => void;
  onDone: (msg: string) => void;
  onReportIssue: () => void;
}

// Dùng chung cho trang chi tiết booking và dashboard để checklist luôn hiển thị đủ, không có đường xác nhận nào bỏ qua được.
export function ConditionDialog({
  open, type, bookingId, providerCondition, context, onClose, onDone, onReportIssue,
}: ConditionDialogProps) {
  const mutation = useConfirmStaffTask();
  const form = useForm<StaffConditionInput>({ resolver: zodResolver(staffConditionSchema) });
  const items = INSPECTION_ITEMS[type];
  const isReturn = type === 'RETURN';
  const [checked, setChecked] = useState<boolean[]>([]);
  const ticks = items.map((_, i) => checked[i] ?? false);
  const done = ticks.filter(Boolean).length;
  const blocked = done < items.length;

  const file = form.watch('file') as File | undefined;
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  function pickFile(next?: File) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next ? URL.createObjectURL(next) : null;
    setPreview(previewRef.current);
    form.setValue('file', next as File, { shouldValidate: true });
  }

  const submit = form.handleSubmit((v) => {
    mutation.mutate(
      {
        bookingId, type, conditionNote: v.conditionNote, file: v.file,
        checklist: items.map((label, i) => ({ label, ok: ticks[i] })),
      },
      {
        onSuccess: () => {
          form.reset(); setChecked([]); pickFile(undefined); onClose();
          onDone(type === 'HANDOVER' ? 'Đã xác nhận bàn giao. Cuộc thuê đã bắt đầu.' : 'Đã kiểm tra và nhận lại. Cuộc thuê đã hoàn thành.');
        },
      },
    );
  });

  const hint = blocked ? `Cần tick đủ ${items.length} hạng mục` : !file ? 'Còn thiếu ảnh tình trạng' : 'Sẵn sàng xác nhận';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={DIALOG_CLASS}>
        <DialogBand
          tone={isReturn ? 'emerald' : 'blue'}
          icon={isReturn ? <RotateCcw className="h-5 w-5" /> : <Package className="h-5 w-5" />}
          title={<DialogTitle className="text-[17px] font-semibold leading-snug">{isReturn ? 'Xác nhận nhận lại thiết bị' : 'Xác nhận giao thiết bị'}</DialogTitle>}
          description={<DialogDescription className="text-[13px] leading-relaxed">Ảnh và ghi chú được lưu vào biên bản để đối chiếu khi có tranh chấp.</DialogDescription>}
        />

        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-5 pt-1">
            {context && <OrderStrip title={context.title} caption={context.caption} />}

            {providerCondition && (
              <div className="space-y-1 rounded-[13px] bg-amber-50/70 p-3.5 text-sm ring-1 ring-amber-100">
                <p className="text-xs font-semibold text-amber-800">Tình trạng do Provider mô tả</p>
                <p className="whitespace-pre-line text-slate-700">{providerCondition}</p>
              </div>
            )}

            <FormSection
              step={1}
              title={isReturn ? 'Kiểm tra thiết bị khi nhận lại' : 'Xác nhận thiết bị đúng như mô tả'}
              aside={
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <span
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-full"
                    style={{ background: `conic-gradient(#059669 ${(done / items.length) * 360}deg, #e2e8f0 0deg)` }}
                  >
                    <span className="block h-[18px] w-[18px] rounded-full bg-white" />
                  </span>
                  {done}/{items.length}
                </span>
              }
            >
              <div className="space-y-2">
                {items.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    role="checkbox"
                    aria-checked={ticks[i]}
                    onClick={() => setChecked(ticks.map((t, j) => (j === i ? !t : t)))}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-[13px] border px-3.5 py-3 text-left text-sm transition-colors',
                      ticks[i] ? 'border-emerald-600 bg-emerald-50/70 text-slate-900' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px]',
                        ticks[i] ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-transparent',
                      )}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {label}
                  </button>
                ))}
              </div>
              {blocked && (
                <div className="flex flex-col gap-2.5 rounded-[13px] border border-amber-200 bg-amber-50 p-3 text-[12.5px] leading-relaxed text-amber-800 sm:flex-row sm:items-center">
                  <span className="flex-1">
                    {isReturn
                      ? 'Còn hạng mục chưa đạt? Đừng hoàn thành, hãy lập biên bản thương lượng để ghi nhận.'
                      : 'Thiết bị có vấn đề? Đừng bàn giao, hãy lập biên bản thương lượng để ghi nhận.'}
                  </span>
                  <ActionButton variant="warn" size="sm" className="shrink-0" onClick={() => { onClose(); onReportIssue(); }}>
                    <Scale className="h-4 w-4" />Lập biên bản
                  </ActionButton>
                </div>
              )}
            </FormSection>

            <FormSection step={2} title="Ảnh tình trạng" badge="required">
              <label
                htmlFor="condition-photo"
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] p-3.5 text-sm transition-colors',
                  file ? 'border-emerald-600 bg-emerald-50/50' : 'border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-50',
                )}
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Ảnh đã chọn" className="h-12 w-12 shrink-0 rounded-[11px] object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[11px] bg-white text-slate-400 ring-1 ring-slate-200">
                    <Camera className="h-5 w-5" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-900">{file ? file.name : 'Chụp ảnh hoặc chọn từ máy'}</span>
                  <span className="text-xs text-slate-500">{file ? 'Bấm để đổi ảnh' : 'Ảnh JPG, PNG'}</span>
                </span>
              </label>
              <input
                id="condition-photo"
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              {form.formState.errors.file && <p className="text-xs text-red-600">{form.formState.errors.file.message}</p>}
            </FormSection>

            <FormSection step={3} title="Ghi chú" badge="optional">
              <textarea
                rows={3}
                aria-label="Ghi chú"
                placeholder="Ghi chú thêm nếu có, ví dụ vết xước nhỏ, phụ kiện đi kèm…"
                className={FIELD_CLASS}
                {...form.register('conditionNote')}
              />
              {form.formState.errors.conditionNote && <p className="text-xs text-red-600">{form.formState.errors.conditionNote.message}</p>}
            </FormSection>

            {mutation.isError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errMsg(mutation.error)}</p>}
          </div>

          <DialogFooterBar hint={hint}>
            <ActionButton variant="neutral" onClick={onClose}>Huỷ</ActionButton>
            <ActionButton
              type="submit"
              variant={isReturn ? 'primary-emerald' : 'primary-blue'}
              disabled={mutation.isPending || blocked || !file}
            >
              {mutation.isPending ? 'Đang lưu...' : isReturn ? 'Xác nhận & hoàn thành' : 'Xác nhận & bắt đầu thuê'}
            </ActionButton>
          </DialogFooterBar>
        </form>
      </DialogContent>
    </Dialog>
  );
}
