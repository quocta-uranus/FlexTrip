'use client';

import { Suspense } from 'react';
import { PageHeader, PAGE_WIDTH } from '@/components/layout/page-header';
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
    <main className="flex-1 pb-8">
      <PageHeader
        breadcrumb={[{ label: 'Hỗ trợ', href: '/support' }, { label: 'Gửi yêu cầu' }]}
        title="Gửi yêu cầu hỗ trợ"
        subtitle="Mô tả vấn đề của bạn, hệ thống sẽ tự phân loại và chuyển đến đúng bộ phận. Chúng tôi phản hồi ngay trong ticket này."
      />

      <div className={PAGE_WIDTH}>
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl space-y-5 rounded-2xl border border-[#e2e8f3] bg-white p-6">
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
          <p className="rounded-xl bg-[#f1f8ff] px-4 py-3 text-xs text-[#2a7bd9]">
            Ticket sẽ được gắn với đơn thuê <span className="font-semibold">{bookingId}</span>.
          </p>
        )}

        {errors.root && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errors.root.message}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" className="h-10 rounded-xl px-5" onClick={() => router.back()} disabled={create.isPending}>
            Huỷ
          </Button>
          <Button type="submit" className="h-10 rounded-xl bg-[#2a7bd9] px-6 font-semibold text-white hover:bg-[#1e5aa8]" disabled={create.isPending}>
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
