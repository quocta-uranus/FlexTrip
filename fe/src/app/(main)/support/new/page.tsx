'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTicket } from '@/hooks/useSupport';
import { createTicketSchema, type CreateTicketInput } from '@/lib/validators/support.schema';
import type { ApiError } from '@/lib/api/client';

function NewTicketForm() {
  const router = useRouter();
  const bookingId = useSearchParams().get('bookingId') ?? undefined;
  const create = useCreateTicket();
  const form = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { subject: '', description: '', bookingId },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      { subject: values.subject, description: values.description, bookingId: values.bookingId || undefined },
      {
        onSuccess: ({ id }) => router.replace(`/support/${id}`),
        onError: (err) => form.setError('root', { message: (err as ApiError).message }),
      },
    );
  });

  return (
    <main className="min-h-screen bg-white">
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-24 sm:px-6 sm:pt-28">
      <Link href="/support" className="text-sm font-semibold text-brand-blue hover:underline">← Trung tâm hỗ trợ</Link>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hỗ trợ</p>
      <h1 className="font-display mt-2 text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl">Gửi yêu cầu hỗ trợ</h1>
      <p className="mt-3 text-sm text-slate-600">
        Mô tả vấn đề của bạn, hệ thống sẽ tự phân loại và chuyển đến đúng bộ phận. Chúng tôi phản hồi ngay trong ticket này.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="space-y-2">
          <Label htmlFor="subject">Tiêu đề</Label>
          <Input id="subject" placeholder="VD: Chưa nhận được tiền hoàn cọc" maxLength={150} aria-invalid={!!errors.subject} {...form.register('subject')} />
          {errors.subject && <p className="text-xs font-medium text-red-600">{errors.subject.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Mô tả chi tiết</Label>
          <Textarea id="description" rows={6} maxLength={4000} placeholder="Chuyện gì đã xảy ra? Bạn mong muốn được hỗ trợ điều gì?" aria-invalid={!!errors.description} {...form.register('description')} />
          {errors.description && <p className="text-xs font-medium text-red-600">{errors.description.message}</p>}
        </div>

        {bookingId && (
          <p className="rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-700">
            Ticket sẽ được gắn với đơn thuê <span className="font-semibold">{bookingId}</span>.
          </p>
        )}

        {errors.root && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errors.root.message}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" className="h-11 rounded-full px-5" onClick={() => router.back()} disabled={create.isPending}>
            Huỷ
          </Button>
          <Button type="submit" className="h-11 rounded-full bg-brand px-6 font-bold text-white shadow-md shadow-brand/30 hover:bg-brand-blue" disabled={create.isPending}>
            {create.isPending ? 'Đang gửi…' : 'Gửi yêu cầu'}
          </Button>
        </div>
      </form>
    </div>
    </main>
  );
}

export default function NewTicketPage() {
  return (
    <Suspense>
      <NewTicketForm />
    </Suspense>
  );
}
