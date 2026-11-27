'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, Scale, X } from 'lucide-react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useCreateMediation } from '@/hooks/use-staff-operations';
import { staffMediationSchema, type StaffMediationInput } from '@/lib/validators/staff.schema';
import { ActionButton } from './action-button';
import { DIALOG_CLASS, DialogBand, DialogFooterBar, FIELD_CLASS, FormSection, OrderStrip } from './dialog-parts';

const MAX_FILES = 10;

function errMsg(e: unknown) {
  return e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
    ? (e as { message: string }).message
    : 'Không thể thực hiện. Vui lòng thử lại.';
}

// The preview URL is made once per file; it is small and the dialog is short-lived, so it is not revoked
// (revoking in an effect breaks the image under React strict mode in development).
function Thumb({ file }: { file: File }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={file.name} className="h-full w-full object-cover" />;
}

interface MediationFormDialogProps {
  open: boolean;
  bookingId: string;
  /** Which order this is about, shown under the title. */
  context?: { title: string; caption?: string };
  onClose: () => void;
  onDone: (msg: string) => void;
}

// One form for every place that can open a mediation (booking page and dashboard).
export function MediationFormDialog({ open, bookingId, context, onClose, onDone }: MediationFormDialogProps) {
  const mutation = useCreateMediation();
  const form = useForm<StaffMediationInput>({
    resolver: zodResolver(staffMediationSchema),
    defaultValues: { files: [], issue: '', travelerStatement: '', providerStatement: '' },
  });
  const issue = form.watch('issue') ?? '';
  const files = form.watch('files') ?? [];

  const submit = form.handleSubmit((v) => {
    mutation.mutate(
      { bookingId, ...v },
      { onSuccess: () => { form.reset(); onClose(); onDone('Đã lập biên bản thương lượng.'); } },
    );
  });

  function addFiles(picked: FileList | null) {
    if (!picked) return;
    form.setValue('files', [...files, ...Array.from(picked)].slice(0, MAX_FILES), { shouldValidate: true });
  }
  function removeFile(index: number) {
    form.setValue('files', files.filter((_, i) => i !== index), { shouldValidate: true });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={DIALOG_CLASS}>
        <DialogBand
          tone="amber"
          icon={<Scale className="h-5 w-5" />}
          title={<DialogTitle className="text-[17px] font-semibold leading-snug">Lập biên bản thương lượng</DialogTitle>}
          description={
            <DialogDescription className="text-[13px] leading-relaxed">
              Ghi nhận trung lập ý kiến hai bên và bằng chứng. Đơn vẫn mở cho tới khi hai bên thoả thuận hoặc bạn chuyển Admin.
            </DialogDescription>
          }
        />

        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-5 pt-1">
            {context && <OrderStrip title={context.title} caption={context.caption} />}

            <FormSection step={1} title="Chuyện gì đã xảy ra?" badge="required">
              <textarea
                rows={3}
                aria-label="Vấn đề phát sinh"
                aria-invalid={!!form.formState.errors.issue}
                placeholder="Mô tả ngắn gọn: thiết bị gặp vấn đề gì, ai phát hiện, vào lúc nào…"
                className={FIELD_CLASS}
                {...form.register('issue')}
              />
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-red-600">{form.formState.errors.issue?.message}</p>
                <p className="shrink-0 text-xs text-slate-400">{issue.length} / 4000 · ít nhất 5 ký tự</p>
              </div>
            </FormSection>

            <FormSection step={2} title="Ý kiến hai bên" badge="optional">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[14px] border border-blue-200/80 bg-blue-50/60 p-3">
                  <p className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-slate-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white">T</span>
                    Traveler
                  </p>
                  <textarea rows={4} aria-label="Ý kiến Traveler" placeholder="Traveler nói gì…" className={FIELD_CLASS} {...form.register('travelerStatement')} />
                </div>
                <div className="rounded-[14px] border border-violet-200/80 bg-violet-50/60 p-3">
                  <p className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-slate-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">P</span>
                    Provider
                  </p>
                  <textarea rows={4} aria-label="Ý kiến Provider" placeholder="Provider nói gì…" className={FIELD_CLASS} {...form.register('providerStatement')} />
                </div>
              </div>
            </FormSection>

            <FormSection
              step={3}
              title="Ảnh bằng chứng"
              aside={<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] text-slate-500">{files.length} / {MAX_FILES}</span>}
            >
              {files.length > 0 && (
                <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="relative aspect-square overflow-hidden rounded-[11px] bg-slate-100 ring-1 ring-slate-200">
                      <Thumb file={f} />
                      <button
                        type="button"
                        aria-label={`Bỏ ${f.name}`}
                        onClick={() => removeFile(i)}
                        className="absolute right-1 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {files.length < MAX_FILES && (
                <label
                  htmlFor="mediation-files"
                  className="flex cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-slate-300 bg-slate-50/70 p-3.5 transition-colors hover:bg-slate-50"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] bg-white text-slate-400 ring-1 ring-slate-200">
                    <ImagePlus className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-slate-900">Thêm ảnh bằng chứng</span>
                    <span className="text-xs text-slate-500">Chụp hoặc chọn nhiều ảnh cùng lúc</span>
                  </span>
                </label>
              )}
              <input
                id="mediation-files"
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
              />
              {form.formState.errors.files && <p className="text-xs text-red-600">{form.formState.errors.files.message as string}</p>}
            </FormSection>

            {mutation.isError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errMsg(mutation.error)}</p>}
          </div>

          <DialogFooterBar hint="Biên bản không thể xoá sau khi lập">
            <ActionButton variant="neutral" onClick={onClose}>Huỷ</ActionButton>
            <ActionButton type="submit" variant="primary-blue" disabled={mutation.isPending}>
              {mutation.isPending ? 'Đang lập...' : 'Lập biên bản'}
            </ActionButton>
          </DialogFooterBar>
        </form>
      </DialogContent>
    </Dialog>
  );
}
