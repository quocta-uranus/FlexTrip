'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';
import { useAdminToast } from '@/components/admin/use-admin-toast';
import { TicketCategoryBadge, TicketPriorityBadge, TicketStatusBadge, TicketThread } from '@/components/support/ticket-parts';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useReplyTicketAdmin, useRetriageTicket, useTicketDetail, useUpdateTicket,
} from '@/hooks/admin/use-admin-support';
import { formatDateTime } from '@/lib/format';
import { adminReplySchema, type AdminReplyInput } from '@/lib/validators/support.schema';
import { TICKET_CATEGORY_LABELS } from '@/types/support';
import type { TicketCategory, TicketPriority, TicketStatus } from '@/types/support';

const SELECT_CLASS =
  'h-10 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 text-sm text-slate-900 outline-none focus:border-[#2a7bd9] focus:ring-2 focus:ring-[#2a7bd9]/15 disabled:opacity-50';

const STATUS_OPTIONS: Array<[TicketStatus, string]> = [
  ['OPEN', 'Mới'], ['IN_PROGRESS', 'Đang xử lý'], ['WAITING_USER', 'Chờ người dùng'], ['RESOLVED', 'Đã giải quyết'], ['CLOSED', 'Đã đóng'],
];
const TRIAGE_LABELS = { PENDING: 'Đang chờ AI phân loại', AI: 'AI phân loại', RULES: 'Phân loại theo từ khoá', ADMIN: 'Admin chỉnh tay' } as const;

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useTicketDetail(id);
  const reply = useReplyTicketAdmin(id);
  const update = useUpdateTicket(id);
  const retriage = useRetriageTicket(id);
  const toast = useAdminToast();
  const form = useForm<AdminReplyInput>({
    resolver: zodResolver(adminReplySchema),
    defaultValues: { body: '', nextStatus: 'WAITING_USER' },
  });

  const onSubmit = form.handleSubmit((values) => {
    reply.mutate(
      { body: values.body, nextStatus: values.nextStatus },
      {
        onSuccess: () => { form.reset({ body: '', nextStatus: 'WAITING_USER' }); toast.success('Đã gửi phản hồi'); },
        onError: toast.error,
      },
    );
  });

  const change = (body: Parameters<typeof update.mutate>[0], message: string) =>
    update.mutate(body, { onSuccess: () => toast.success(message), onError: toast.error });

  if (isLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-8">
        <Link href="/admin/12-support-tickets" className="text-sm font-semibold text-blue-600">← Quay lại danh sách</Link>
        <p className="mt-4 text-sm text-red-600">{error instanceof Error ? error.message : 'Không tìm thấy ticket'}</p>
      </div>
    );
  }

  const closed = data.status === 'CLOSED';

  return (
    <div className="p-8">
      {toast.node}
      <Link href="/admin/12-support-tickets" className="mb-4 inline-block text-sm font-semibold text-blue-600 hover:underline">
        ← Quay lại danh sách
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{data.subject}</h1>
              <TicketStatusBadge status={data.status} audience="admin" />
              <TicketPriorityBadge priority={data.priority} />
              <TicketCategoryBadge category={data.category} />
            </div>
            <p className="mt-1 text-sm text-slate-500">#{data.id} · {formatDateTime(data.createdAt)}</p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{data.description}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Hội thoại</h2>
            <TicketThread messages={data.messages} viewer="admin" />
          </div>

          {closed ? (
            <p className="rounded-2xl bg-slate-100 px-5 py-4 text-center text-sm text-slate-600">Ticket đã đóng, không thể phản hồi thêm.</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
              <Label htmlFor="admin-reply">Phản hồi người dùng</Label>
              <Textarea id="admin-reply" rows={4} maxLength={4000} placeholder="Nhập nội dung phản hồi…" {...form.register('body')} />
              {form.formState.errors.body && <p className="text-xs font-medium text-red-600">{form.formState.errors.body.message}</p>}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <select aria-label="Trạng thái sau khi gửi" className={`${SELECT_CLASS} !w-auto`} {...form.register('nextStatus')}>
                  <option value="WAITING_USER">Gửi &amp; chờ người dùng</option>
                  <option value="IN_PROGRESS">Gửi &amp; tiếp tục xử lý</option>
                  <option value="RESOLVED">Gửi &amp; đánh dấu đã giải quyết</option>
                </select>
                <Button type="submit" className="h-10 rounded-xl bg-[#2a7bd9] px-6 font-semibold text-white hover:bg-[#1e5aa8]" disabled={reply.isPending}>
                  {reply.isPending ? 'Đang gửi…' : 'Gửi phản hồi'}
                </Button>
              </div>
            </form>
          )}
        </div>

        <aside className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Xử lý</h2>
            <div className="space-y-1.5">
              <Label htmlFor="t-status">Trạng thái</Label>
              <select id="t-status" className={SELECT_CLASS} value={data.status} disabled={update.isPending}
                onChange={(e) => change({ status: e.target.value as TicketStatus }, 'Đã cập nhật trạng thái')}>
                {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-category">Chủ đề</Label>
              <select id="t-category" className={SELECT_CLASS} value={data.category} disabled={update.isPending}
                onChange={(e) => change({ category: e.target.value as TicketCategory }, 'Đã cập nhật chủ đề')}>
                {Object.entries(TICKET_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-priority">Mức ưu tiên</Label>
              <select id="t-priority" className={SELECT_CLASS} value={data.priority} disabled={update.isPending}
                onChange={(e) => change({ priority: e.target.value as TicketPriority }, 'Đã cập nhật ưu tiên')}>
                {(['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-600">Phụ trách: <span className="font-semibold text-slate-900">{data.assignedTo?.name ?? 'Chưa có'}</span></span>
              <Button type="button" variant="outline" size="sm" disabled={update.isPending}
                onClick={() => change({ assignToMe: !data.assignedTo }, data.assignedTo ? 'Đã bỏ nhận ticket' : 'Đã nhận ticket')}>
                {data.assignedTo ? 'Bỏ nhận' : 'Nhận xử lý'}
              </Button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-slate-500">
                <Sparkles className="size-4 text-[#2a7bd9]" /> Phân loại AI
              </h2>
              <span className="rounded-full bg-[#f1f5fa] px-2.5 py-1 text-xs font-semibold text-slate-600">{TRIAGE_LABELS[data.triageSource]}</span>
            </div>
            <p className="text-sm text-slate-600">{data.triageReason ?? 'Chưa có lý do phân loại.'}</p>
            <Button type="button" variant="outline" size="sm" disabled={retriage.isPending}
              onClick={() => retriage.mutate(undefined, { onSuccess: () => toast.success('Đã phân loại lại'), onError: toast.error })}>
              {retriage.isPending ? 'Đang phân loại…' : 'Chạy lại phân loại'}
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Người gửi</h2>
            <p className="font-semibold text-slate-900">{data.requester.name}</p>
            <p className="text-slate-500">{data.requester.email}</p>
            {data.booking && (
              <p className="mt-3 text-slate-600">
                Đơn thuê:{' '}
                <Link href="/admin/11-bookings" className="font-semibold text-blue-600 hover:underline">{data.booking.title}</Link>
                <span className="ml-1 text-xs text-slate-400">({data.booking.status})</span>
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
