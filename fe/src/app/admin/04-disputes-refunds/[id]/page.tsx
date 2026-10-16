'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useAdminToast } from '@/components/admin/use-admin-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  useDisputeDetail,
  useResolveDispute,
  useSetDisputePriority,
  useSetDisputeStatus,
} from '@/hooks/admin/use-admin-disputes';
import { resolveDisputeSchema, type ResolveDisputeInput } from '@/lib/validators/admin.schema';
import { formatDate, formatDateTime, formatVnd } from '@/lib/format';
import type { DisputePriority } from '@/types/admin';
import { useDisputeAssist } from '@/hooks/usePaymentAi';

const typeLabels: Record<string, string> = {
  REFUND_REQUEST: 'Yêu cầu hoàn tiền',
  PAYMENT_DISPUTE: 'Tranh chấp thanh toán',
  CANCELLATION_DISPUTE: 'Tranh chấp hủy đơn',
  DAMAGE_CLAIM: 'Yêu cầu bồi thường',
};

const statusBadge: Record<string, string> = {
  OPEN: 'bg-red-50 text-red-700',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700',
  PENDING_INFO: 'bg-slate-100 text-slate-700',
  ESCALATED: 'bg-violet-50 text-violet-700',
  RESOLVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-slate-100 text-slate-600',
};

const priorityBadge: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-green-100 text-green-700',
};

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useDisputeDetail(id);
  const { data: aiAssist, isLoading: aiLoading } = useDisputeAssist(id, !!id);
  const setStatus = useSetDisputeStatus();
  const setPriority = useSetDisputePriority();
  const resolve = useResolveDispute();
  const toast = useAdminToast();
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [pendingResolve, setPendingResolve] = useState<ResolveDisputeInput | null>(null);

  const maxRefund = data?.payment?.amount ?? null;
  const schema = useMemo(() => resolveDisputeSchema(maxRefund), [maxRefund]);
  const form = useForm<ResolveDisputeInput>({
    resolver: zodResolver(schema),
    defaultValues: { outcome: 'RESOLVED', resolution: '', refundAmount: undefined },
  });
  const outcome = form.watch('outcome');
  const closed = data?.status === 'RESOLVED' || data?.status === 'REJECTED';

  const changeStatus = (status: 'UNDER_REVIEW' | 'PENDING_INFO' | 'ESCALATED', note?: string) => {
    setStatus.mutate(
      { id, status, note },
      {
        onSuccess: () => {
          toast.success(`Đã chuyển sang ${status.replace(/_/g, ' ')}`);
          setEscalateOpen(false);
        },
        onError: toast.error,
      },
    );
  };

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
        <Link href="/admin/04-disputes-refunds" className="text-sm font-semibold text-blue-600">
          ← Quay lại danh sách
        </Link>
        <p className="mt-4 text-sm text-red-600">{error instanceof Error ? error.message : 'Không tìm thấy tranh chấp'}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <Link href="/admin/04-disputes-refunds" className="mb-4 inline-block text-sm font-semibold text-blue-600 hover:underline">
        ← Quay lại danh sách
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{data.id}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge[data.status]}`}>{data.status}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityBadge[data.priority]}`}>{data.priority}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{typeLabels[data.type]} · {formatDateTime(data.createdAt)}</p>
            <p className="mt-3 font-medium text-slate-900">{data.reason}</p>
            {data.description && <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{data.description}</p>}
            <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <div>Opened by: <span className="font-semibold text-slate-900">{data.openedBy.name}</span></div>
              <div>Handled by: <span className="font-semibold text-slate-900">{data.handledBy?.name ?? 'Chưa ai nhận'}</span></div>
              <div>Traveler: <span className="font-semibold text-slate-900">{data.traveler.name}</span></div>
              <div>Provider: <span className="font-semibold text-slate-900">{data.provider.shopName ?? data.provider.name}</span></div>
            </div>
          </div>

          {/* Booking */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Booking</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">ID</dt><dd className="font-medium">{data.booking.id}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd className="font-medium">{data.booking.status}</dd></div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Listing</dt>
                <dd className="font-medium">{data.booking.listing.title} · {data.booking.listing.location}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Dates</dt>
                <dd className="font-medium">{formatDate(data.booking.startDate)} – {formatDate(data.booking.endDate)}</dd>
              </div>
              <div><dt className="text-slate-500">Total</dt><dd className="font-medium">{formatVnd(data.booking.totalPrice)}</dd></div>
            </dl>
          </div>

          {/* Payment */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Payment</h2>
            {data.payment ? (
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Amount</dt><dd className="font-medium">{formatVnd(data.payment.amount)}</dd></div>
                <div><dt className="text-slate-500">Platform fee</dt><dd className="font-medium">{formatVnd(data.payment.platformFee)}</dd></div>
                <div><dt className="text-slate-500">Status</dt><dd className="font-medium">{data.payment.status}</dd></div>
                <div><dt className="text-slate-500">Method</dt><dd className="font-medium">{data.payment.method}</dd></div>
                <div className="sm:col-span-2"><dt className="text-slate-500">Txn</dt><dd className="font-medium">{data.payment.transactionId ?? '—'}</dd></div>
              </dl>
            ) : (
              <p className="text-sm text-slate-500">Chưa có thanh toán</p>
            )}
          </div>

          {/* Contract */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Contract</h2>
            {data.contract ? (
              <div className="space-y-3">
                <p className="text-sm">Status: <span className="font-medium">{data.contract.status}</span></p>
                <p className="text-sm">Signed: <span className="font-medium">{formatDateTime(data.contract.signedAt)}</span></p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.contract.checkInPhoto && (
                    <a href={data.contract.checkInPhoto} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={data.contract.checkInPhoto} alt="Check-in" className="h-32 w-full rounded-lg object-cover" />
                    </a>
                  )}
                  {data.contract.checkOutPhoto && (
                    <a href={data.contract.checkOutPhoto} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={data.contract.checkOutPhoto} alt="Check-out" className="h-32 w-full rounded-lg object-cover" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Chưa có hợp đồng</p>
            )}
          </div>

          {/* History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">History</h2>
            <ol className="space-y-4 border-l-2 border-slate-100 pl-4">
              {data.history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <div className="text-xs text-slate-400">{formatDateTime(h.createdAt)} · {h.actor?.name ?? 'Hệ thống'}</div>
                  <div className="text-sm font-semibold text-slate-900">{h.action}</div>
                  {h.after != null && typeof h.after === 'object' ? (
                    <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                      {Object.entries(h.after as Record<string, unknown>).map(([k, v]) => (
                        <div key={k}>{`${k}: ${String(v)}`}</div>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* AI Dispute Assist */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-base">🤖</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-800">AI Phân tích</h2>
            </div>
            {aiLoading ? (
              <div className="space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-blue-100" />
                <div className="h-4 w-full animate-pulse rounded bg-blue-100" />
              </div>
            ) : aiAssist ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide"
                    style={
                      aiAssist.recommendation === 'full_refund'    ? { background: '#fee2e2', color: '#b91c1c' } :
                      aiAssist.recommendation === 'partial_refund' ? { background: '#fef3c7', color: '#92400e' } :
                      aiAssist.recommendation === 'no_refund'      ? { background: '#dcfce7', color: '#15803d' } :
                                                                     { background: '#ede9fe', color: '#6d28d9' }
                    }
                  >
                    {aiAssist.recommendation === 'full_refund'    && 'Hoàn toàn bộ'}
                    {aiAssist.recommendation === 'partial_refund' && `Hoàn ${aiAssist.suggestedRefundPct}%`}
                    {aiAssist.recommendation === 'no_refund'      && 'Không hoàn'}
                    {aiAssist.recommendation === 'provider_wins'  && 'Provider thắng'}
                  </span>
                  <span className="text-xs text-slate-400">
                    Độ tin cậy: {Math.round(aiAssist.confidence * 100)}%
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">{aiAssist.reasoning}</p>
                {aiAssist.keyEvidence.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-500">Bằng chứng chính:</p>
                    <ul className="space-y-1">
                      {aiAssist.keyEvidence.map((e, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Không thể tải phân tích AI.</p>
            )}
          </div>

          {closed ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Kết quả</h2>
              <p className="text-sm font-semibold text-slate-900">{data.status}</p>
              <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{data.resolution}</p>
              {data.refundAmount != null && (
                <p className="mt-2 text-sm">Hoàn: <span className="font-semibold text-red-600">{formatVnd(data.refundAmount)}</span></p>
              )}
              <p className="mt-2 text-xs text-slate-400">{formatDateTime(data.resolvedAt)}</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Xử lý</h2>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={data.status === 'UNDER_REVIEW' || setStatus.isPending}
                    onClick={() => changeStatus('UNDER_REVIEW')}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    Under review
                  </button>
                  <button
                    type="button"
                    disabled={data.status === 'PENDING_INFO' || setStatus.isPending}
                    onClick={() => changeStatus('PENDING_INFO')}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    Pending info
                  </button>
                  <button
                    type="button"
                    disabled={data.status === 'ESCALATED' || setStatus.isPending}
                    onClick={() => setEscalateOpen(true)}
                    className="rounded-xl border border-violet-200 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                  >
                    Escalate
                  </button>
                </div>
                <div className="mt-4">
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    value={data.priority}
                    disabled={setPriority.isPending}
                    onChange={(e) =>
                      setPriority.mutate(
                        { id, priority: e.target.value as DisputePriority },
                        { onSuccess: () => toast.success('Đã cập nhật độ ưu tiên'), onError: toast.error },
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                  >
                    {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as DisputePriority[]).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Kết luận</h2>
                <form
                  className="space-y-3"
                  onSubmit={form.handleSubmit((values) => setPendingResolve(values))}
                >
                  <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="radio" value="RESOLVED" {...form.register('outcome')} />
                      Chấp nhận
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" value="REJECTED" {...form.register('outcome')} />
                      Từ chối
                    </label>
                  </div>
                  <div>
                    <Label htmlFor="resolution">Kết luận</Label>
                    <Textarea id="resolution" rows={4} {...form.register('resolution')} className="mt-1" />
                    {form.formState.errors.resolution && (
                      <p className="mt-1 text-xs text-red-600">{form.formState.errors.resolution.message}</p>
                    )}
                  </div>
                  {outcome === 'RESOLVED' && data.payment && (
                    <div>
                      <Label htmlFor="refundAmount">Số tiền hoàn</Label>
                      <Input
                        id="refundAmount"
                        type="number"
                        className="mt-1"
                        {...form.register('refundAmount', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })}
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Tối đa {formatVnd(data.payment.amount)}. Booking sẽ chuyển sang REFUNDING.
                      </p>
                      {form.formState.errors.refundAmount && (
                        <p className="mt-1 text-xs text-red-600">{form.formState.errors.refundAmount.message}</p>
                      )}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Xác nhận kết luận
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={escalateOpen}
        onOpenChange={setEscalateOpen}
        title="Escalate tranh chấp này?"
        confirmLabel="Escalate"
        tone="danger"
        optionalReason
        pending={setStatus.isPending}
        onConfirm={(note) => changeStatus('ESCALATED', note || undefined)}
      />

      <ConfirmDialog
        open={pendingResolve !== null}
        onOpenChange={(o) => !o && setPendingResolve(null)}
        title={
          pendingResolve?.outcome === 'RESOLVED'
            ? `Chấp nhận tranh chấp${pendingResolve.refundAmount ? ` · hoàn ${formatVnd(pendingResolve.refundAmount)}` : ''}?`
            : 'Từ chối tranh chấp?'
        }
        description={pendingResolve?.resolution}
        confirmLabel="Xác nhận"
        tone={pendingResolve?.outcome === 'REJECTED' ? 'danger' : 'default'}
        pending={resolve.isPending}
        onConfirm={() => {
          if (!pendingResolve) return;
          resolve.mutate(
            { id, ...pendingResolve },
            {
              onSuccess: () => {
                toast.success('Đã kết luận tranh chấp');
                setPendingResolve(null);
              },
              onError: toast.error,
            },
          );
        }}
      />

      {toast.node}
    </div>
  );
}
