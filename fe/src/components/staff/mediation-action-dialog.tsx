'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { FieldSelect } from '@/components/admin/field-select';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useEscalateMediation, useResolveMediation } from '@/hooks/use-staff-operations';
import {
  staffEscalationSchema, staffResolutionSchema,
  type StaffEscalationInput, type StaffResolutionInput,
} from '@/lib/validators/staff.schema';
import { ActionButton } from './action-button';
import { DIALOG_CLASS, DialogBand, DialogFooterBar, FIELD_CLASS, FormSection, OrderStrip } from './dialog-parts';

const DISPUTE_TYPES = [
  { value: 'DAMAGE_CLAIM', label: 'Hư hỏng' },
  { value: 'REFUND_REQUEST', label: 'Hoàn tiền' },
  { value: 'PAYMENT_DISPUTE', label: 'Thanh toán' },
  { value: 'CANCELLATION_DISPUTE', label: 'Huỷ booking' },
];
const PRIORITIES = [
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HIGH', label: 'Cao' },
  { value: 'CRITICAL', label: 'Khẩn cấp' },
];

function errMsg(e: unknown) {
  return e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
    ? (e as { message: string }).message
    : 'Không thể thực hiện. Vui lòng thử lại.';
}

interface MediationActionDialogProps {
  mediationId: string | null;
  action: 'resolve' | 'escalate';
  /** The issue being decided, shown at the top so the choice is made with it in view. */
  issue: string;
  onClose: () => void;
  onDone: (msg: string) => void;
}

// Close a mediation (both sides agreed) or hand it to the admin as a dispute. Shared by the booking page and the dashboard.
export function MediationActionDialog({ mediationId, action, issue, onClose, onDone }: MediationActionDialogProps) {
  const resolve = useResolveMediation();
  const escalate = useEscalateMediation();
  const resolveForm = useForm<StaffResolutionInput>({ resolver: zodResolver(staffResolutionSchema), defaultValues: { resolution: '' } });
  const escalateForm = useForm<StaffEscalationInput>({
    resolver: zodResolver(staffEscalationSchema),
    defaultValues: { type: 'DAMAGE_CLAIM', priority: 'HIGH', requestedAmount: '', additionalNotes: '' },
  });
  const resolution = resolveForm.watch('resolution') ?? '';

  const submitResolve = resolveForm.handleSubmit((v) => {
    if (!mediationId) return;
    resolve.mutate({ id: mediationId, resolution: v.resolution }, {
      onSuccess: () => { resolveForm.reset(); onClose(); onDone('Đã ghi nhận thoả thuận.'); },
    });
  });
  const submitEscalate = escalateForm.handleSubmit((v) => {
    if (!mediationId) return;
    escalate.mutate(
      { id: mediationId, type: v.type, priority: v.priority, requestedAmount: v.requestedAmount ? Number(v.requestedAmount) : undefined, additionalNotes: v.additionalNotes },
      { onSuccess: () => { escalateForm.reset(); onClose(); onDone('Đã chuyển vụ việc lên Admin.'); } },
    );
  });

  const isResolve = action === 'resolve';
  const error = isResolve ? resolve.error : escalate.error;
  const pending = isResolve ? resolve.isPending : escalate.isPending;

  return (
    <Dialog open={Boolean(mediationId)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={DIALOG_CLASS}>
        <DialogBand
          tone={isResolve ? 'emerald' : 'red'}
          icon={isResolve ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          title={<DialogTitle className="text-[17px] font-semibold leading-snug">{isResolve ? 'Ghi nhận thoả thuận' : 'Chuyển vụ việc lên Admin'}</DialogTitle>}
          description={
            <DialogDescription className="text-[13px] leading-relaxed">
              {isResolve
                ? 'Hai bên đã đồng ý với cách giải quyết. Biên bản sẽ được đóng lại.'
                : 'Hai bên chưa thống nhất được. Vụ việc trở thành tranh chấp để Admin xử lý.'}
            </DialogDescription>
          }
        />

        {isResolve ? (
          <form onSubmit={submitResolve} className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-5 pt-1">
              <OrderStrip title={issue} caption="Vấn đề đang thương lượng" />
              <FormSection step={1} title="Nội dung hai bên đã thống nhất" badge="required">
                <textarea
                  rows={5}
                  aria-label="Nội dung thống nhất"
                  placeholder="Ví dụ: Traveler đồng ý đền 100.000₫ cho phần cọc lều bị mất, Provider nhận lại thiết bị."
                  className={FIELD_CLASS}
                  {...resolveForm.register('resolution')}
                />
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-red-600">{resolveForm.formState.errors.resolution?.message}</p>
                  <p className="shrink-0 text-xs text-slate-400">{resolution.length} / 4000 · ít nhất 5 ký tự</p>
                </div>
              </FormSection>
              {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errMsg(error)}</p>}
            </div>
            <DialogFooterBar hint="Sau khi đóng, biên bản không mở lại được">
              <ActionButton variant="neutral" onClick={onClose}>Huỷ</ActionButton>
              <ActionButton type="submit" variant="primary-emerald" disabled={pending}>
                {pending ? 'Đang lưu...' : 'Hoàn tất thương lượng'}
              </ActionButton>
            </DialogFooterBar>
          </form>
        ) : (
          <form onSubmit={submitEscalate} className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-5 pt-1">
              <OrderStrip title={issue} caption="Vấn đề sẽ chuyển cho Admin" />
              <FormSection step={1} title="Loại tranh chấp và mức ưu tiên">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-500">Loại tranh chấp</p>
                    <FieldSelect
                      value={escalateForm.watch('type')}
                      options={DISPUTE_TYPES}
                      placeholder="Chọn loại"
                      onChange={(v) => escalateForm.setValue('type', v as StaffEscalationInput['type'], { shouldValidate: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-500">Mức ưu tiên</p>
                    <FieldSelect
                      value={escalateForm.watch('priority')}
                      options={PRIORITIES}
                      placeholder="Chọn mức"
                      onChange={(v) => escalateForm.setValue('priority', v as StaffEscalationInput['priority'], { shouldValidate: true })}
                    />
                  </div>
                </div>
              </FormSection>
              <FormSection step={2} title="Số tiền yêu cầu" badge="optional">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    aria-label="Số tiền yêu cầu"
                    placeholder="0"
                    className={`${FIELD_CLASS} pr-9`}
                    {...escalateForm.register('requestedAmount')}
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">₫</span>
                </div>
              </FormSection>
              <FormSection step={3} title="Ghi chú cho Admin" badge="optional">
                <textarea
                  rows={3}
                  aria-label="Ghi chú cho Admin"
                  placeholder="Thông tin thêm giúp Admin xử lý nhanh hơn…"
                  className={FIELD_CLASS}
                  {...escalateForm.register('additionalNotes')}
                />
              </FormSection>
              {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errMsg(error)}</p>}
            </div>
            <DialogFooterBar hint="Admin sẽ nhận vụ việc ngay sau khi chuyển">
              <ActionButton variant="neutral" onClick={onClose}>Huỷ</ActionButton>
              <ActionButton type="submit" variant="primary-red" disabled={pending}>
                {pending ? 'Đang chuyển...' : 'Chuyển Admin'}
              </ActionButton>
            </DialogFooterBar>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
