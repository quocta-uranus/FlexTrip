'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSaveFaq } from '@/hooks/admin/use-admin-support';
import { faqSchema, type FaqInput } from '@/lib/validators/support.schema';
import { TICKET_CATEGORY_LABELS } from '@/types/support';

export type FaqDraft = Partial<FaqInput> & { id?: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: FaqDraft | null;
  onSuccess: (msg: string) => void;
  onError: (err: unknown) => void;
}

const EMPTY: FaqInput = { question: '', answer: '', category: 'OTHER', isPublished: true };

export function FaqFormDialog({ open, onOpenChange, draft, onSuccess, onError }: Props) {
  const save = useSaveFaq();
  const editing = !!draft?.id;
  const form = useForm<FaqInput>({ resolver: zodResolver(faqSchema), defaultValues: EMPTY });
  const { errors } = form.formState;

  useEffect(() => {
    if (open) form.reset({ ...EMPTY, ...draft });
  }, [open, draft, form]);

  const onSubmit = form.handleSubmit((values) => {
    save.mutate(
      { id: draft?.id, ...values },
      {
        onSuccess: () => { onSuccess(editing ? 'Đã cập nhật FAQ' : 'Đã thêm FAQ'); onOpenChange(false); },
        onError,
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[200] bg-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Chỉnh sửa FAQ' : 'Thêm FAQ'}</DialogTitle>
          <DialogDescription>Nội dung xuất bản sẽ hiển thị trong Trung tâm hỗ trợ của Traveler và Provider.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="faq-question">Câu hỏi</Label>
            <Input id="faq-question" maxLength={200} aria-invalid={!!errors.question} {...form.register('question')} />
            {errors.question && <p className="text-xs font-medium text-red-600">{errors.question.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="faq-answer">Câu trả lời</Label>
            <Textarea id="faq-answer" rows={6} maxLength={4000} aria-invalid={!!errors.answer} {...form.register('answer')} />
            {errors.answer && <p className="text-xs font-medium text-red-600">{errors.answer.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="faq-category">Chủ đề</Label>
              <select
                id="faq-category"
                className="h-10 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 text-sm outline-none focus:border-[#2a7bd9]"
                {...form.register('category')}
              >
                {Object.entries(TICKET_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-3 self-end rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-2.5 text-sm font-semibold text-[#0f1729]">
              <input type="checkbox" className="size-4 accent-[#2a7bd9]" {...form.register('isPublished')} />
              Xuất bản ngay
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>Huỷ</Button>
            <Button type="submit" disabled={save.isPending} className="bg-[#2a7bd9] text-white hover:bg-[#1e5aa8]">
              {save.isPending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm FAQ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
