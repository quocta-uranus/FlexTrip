'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { TicketCategoryBadge, TicketStatusBadge, TicketThread } from '@/components/support/ticket-parts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useCloseTicket, useMyTicket, useReplyTicket } from '@/hooks/useSupport';
import { formatDateTime } from '@/lib/format';
import { ticketReplySchema, type TicketReplyInput } from '@/lib/validators/support.schema';
import type { ApiError } from '@/lib/api/client';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useMyTicket(id);
  const reply = useReplyTicket(id);
  const close = useCloseTicket(id);
  const [confirmClose, setConfirmClose] = useState(false);
  const form = useForm<TicketReplyInput>({ resolver: zodResolver(ticketReplySchema), defaultValues: { body: '' } });

  const onSubmit = form.handleSubmit((values) => {
    reply.mutate(values.body, {
      onSuccess: () => form.reset(),
      onError: (err) => form.setError('root', { message: (err as ApiError).message }),
    });
  });

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }
  if (error || !data) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/support" className="text-sm font-semibold text-[#2a7bd9] hover:underline">← Trung tâm hỗ trợ</Link>
        <p className="mt-4 text-sm text-red-600">{error instanceof Error ? error.message : 'Không tìm thấy ticket'}</p>
      </main>
    );
  }

  const closed = data.status === 'CLOSED';

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <Link href="/support" className="text-sm font-semibold text-[#2a7bd9] hover:underline">← Trung tâm hỗ trợ</Link>

      <div className="mt-3 rounded-2xl border border-[#e2e8f3] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-[#0f1729]">{data.subject}</h1>
          <TicketStatusBadge status={data.status} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#8694ad]">
          <TicketCategoryBadge category={data.category} />
          <span>Gửi lúc {formatDateTime(data.createdAt)}</span>
          {data.booking && <span>· Đơn thuê: {data.booking.title}</span>}
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#0f1729]">{data.description}</p>
      </div>

      <section className="mt-6" aria-label="Hội thoại">
        <TicketThread messages={data.messages} viewer="user" />
      </section>

      {closed ? (
        <p className="mt-6 rounded-2xl bg-[#f1f5fa] px-5 py-4 text-center text-sm text-[#5a6b85]">
          Ticket đã đóng. Nếu vẫn cần hỗ trợ, vui lòng <Link href="/support/new" className="font-semibold text-[#2a7bd9] hover:underline">tạo ticket mới</Link>.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-2xl border border-[#e2e8f3] bg-white p-4">
          <Textarea rows={3} maxLength={4000} placeholder="Nhập phản hồi của bạn…" aria-label="Phản hồi" {...form.register('body')} />
          {form.formState.errors.body && <p className="text-xs font-medium text-red-600">{form.formState.errors.body.message}</p>}
          {form.formState.errors.root && <p className="text-xs font-medium text-red-600">{form.formState.errors.root.message}</p>}
          <div className="flex justify-between gap-3">
            <Button type="button" variant="outline" className="h-10 rounded-xl px-4" onClick={() => setConfirmClose(true)}>
              Đóng ticket
            </Button>
            <Button type="submit" className="h-10 rounded-xl bg-[#2a7bd9] px-6 font-semibold text-white hover:bg-[#1e5aa8]" disabled={reply.isPending}>
              {reply.isPending ? 'Đang gửi…' : 'Gửi phản hồi'}
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Đóng ticket này?"
        description="Sau khi đóng bạn không thể phản hồi thêm. Bạn vẫn có thể tạo ticket mới khi cần."
        confirmLabel="Đóng ticket"
        pending={close.isPending}
        onConfirm={() => close.mutate(undefined, { onSuccess: () => setConfirmClose(false) })}
      />
    </main>
  );
}
