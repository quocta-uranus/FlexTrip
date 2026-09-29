'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search } from 'lucide-react';
import { Reveal, LiveDot } from '@/components/profile/wow';
import { Pagination } from '@/components/admin/pagination';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { useAdminToast } from '@/components/admin/use-admin-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import {
  useFinanceSummary,
  useGeneratePayouts,
  usePayouts,
  useTransactions,
  useUpdatePayout,
} from '@/hooks/admin/use-admin-finance';
import { adminApi } from '@/lib/api/admin';
import { formatDate, formatDateTime, formatPct, formatVnd } from '@/lib/format';
import {
  generatePayoutsSchema,
  recordPayoutSchema,
  type GeneratePayoutsInput,
  type RecordPayoutInput,
} from '@/lib/validators/admin.schema';
import type { AdminPayout, PaymentStatus, PayoutStatus, Reconciliation } from '@/types/admin';

const vnToday = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

function previousMonth(): { periodStart: string; periodEnd: string } {
  const to = vnToday();
  const d = new Date(`${to}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const lastDay = new Date(Date.UTC(y, d.getUTCMonth() + 1, 0)).getUTCDate();
  return { periodStart: `${y}-${m}-01`, periodEnd: `${y}-${m}-${String(lastDay).padStart(2, '0')}` };
}

const statusColors: Record<string, { bg: string; text: string }> = {
  PAID: { bg: 'rgba(34,197,94,0.1)', text: '#16a34a' },
  PENDING: { bg: 'rgba(234,179,8,0.1)', text: '#ca8a04' },
  REFUNDED: { bg: 'rgba(42,123,217,0.1)', text: '#2a7bd9' },
  FAILED: { bg: 'rgba(239,68,68,0.1)', text: '#dc2626' },
  ON_HOLD: { bg: 'rgba(234,179,8,0.1)', text: '#ca8a04' },
};

const reconBadge: Record<Reconciliation, string> = {
  MATCHED: 'bg-green-50 text-green-700',
  PENDING: 'bg-amber-50 text-amber-700',
  MISMATCH: 'bg-red-50 text-red-700',
};

function changeColor(change: number | null | undefined, invert = false): string {
  if (change === null || change === undefined) return '#5a6b85';
  const positive = invert ? change < 0 : change > 0;
  const negative = invert ? change > 0 : change < 0;
  if (positive) return '#16a34a';
  if (negative) return '#dc2626';
  return '#5a6b85';
}

export default function TransactionsPage() {
  const today = vnToday();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const period = { from, to };

  const [tab, setTab] = useState('transactions');
  const [txnStatus, setTxnStatus] = useState<PaymentStatus | 'ALL'>('ALL');
  const [txnPage, setTxnPage] = useState(1);
  const txnFilterKey = `${from}|${to}|${txnStatus}`;
  const [prevTxnKey, setPrevTxnKey] = useState(txnFilterKey);
  if (txnFilterKey !== prevTxnKey) {
    setPrevTxnKey(txnFilterKey);
    setTxnPage(1);
  }

  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus | 'ALL'>('ALL');
  const [reconFilter, setReconFilter] = useState<Reconciliation | 'ALL'>('ALL');
  const [payoutPage, setPayoutPage] = useState(1);
  const payoutFilterKey = `${payoutStatus}|${reconFilter}`;
  const [prevPayoutKey, setPrevPayoutKey] = useState(payoutFilterKey);
  if (payoutFilterKey !== prevPayoutKey) {
    setPrevPayoutKey(payoutFilterKey);
    setPayoutPage(1);
  }

  const { data: summary, isLoading: summaryLoading } = useFinanceSummary(period);
  const { data: txns, isLoading: txnsLoading } = useTransactions({ ...period, status: txnStatus, page: txnPage });
  const { data: payouts, isLoading: payoutsLoading } = usePayouts({
    status: payoutStatus,
    reconciliation: reconFilter,
    page: payoutPage,
  });
  const generate = useGeneratePayouts();
  const updatePayout = useUpdatePayout();
  const toast = useAdminToast();

  const [generateOpen, setGenerateOpen] = useState(false);
  const [recordTarget, setRecordTarget] = useState<{ payout: AdminPayout; mode: 'record' | 'edit' } | null>(null);
  const [holdTarget, setHoldTarget] = useState<AdminPayout | null>(null);

  const prev = previousMonth();
  const generateForm = useForm<GeneratePayoutsInput>({
    resolver: zodResolver(generatePayoutsSchema),
    defaultValues: prev,
  });
  const recordForm = useForm<RecordPayoutInput>({
    resolver: zodResolver(recordPayoutSchema),
  });

  const openRecord = (payout: AdminPayout, mode: 'record' | 'edit') => {
    recordForm.reset({
      actualPaid: payout.actualPaid ?? payout.expectedNet,
      transferRef: payout.transferRef ?? '',
      note: payout.note ?? '',
    });
    setRecordTarget({ payout, mode });
  };

  const onGenerate = generateForm.handleSubmit((values) => {
    generate.mutate(values, {
      onSuccess: (r) => {
        toast.success(`Tạo ${r.created}, cập nhật ${r.updated}, bỏ qua ${r.skipped}`);
        setGenerateOpen(false);
      },
      onError: toast.error,
    });
  });

  const onRecord = recordForm.handleSubmit((values) => {
    if (!recordTarget) return;
    const body =
      recordTarget.mode === 'record'
        ? { status: 'PAID' as const, ...values, note: values.note || undefined }
        : { ...values, note: values.note || undefined };
    updatePayout.mutate(
      { id: recordTarget.payout.id, ...body },
      {
        onSuccess: () => {
          toast.success(recordTarget.mode === 'record' ? 'Đã ghi nhận chi trả' : 'Đã cập nhật payout');
          setRecordTarget(null);
        },
        onError: toast.error,
      },
    );
  });

  const clickRecon = (r: Reconciliation) => {
    setTab('payouts');
    setReconFilter(r);
  };

  const exportTxns = async () => {
    try {
      await adminApi.finance.exportTransactions({ ...period, status: txnStatus });
    } catch (e) {
      toast.error(e);
    }
  };
  const exportPayouts = async () => {
    try {
      await adminApi.finance.exportPayouts({ status: payoutStatus, reconciliation: reconFilter });
    } catch (e) {
      toast.error(e);
    }
  };

  const s = summary;
  const transactions = txns?.items ?? [];
  const payoutItems = payouts?.items ?? [];

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN-05</span>
            <LiveDot label="RECONCILING" tone="blue" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: '#0f1729' }}>Transaction Oversight</h1>
          <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>Đối soát giao dịch, kiểm tra chênh lệch payout</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border bg-white px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#e2e8f3' }}
          />
          <span className="text-sm text-slate-400">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border bg-white px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#e2e8f3' }}
          />
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {summaryLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
          : [
              { label: 'Total Revenue (MTD)', value: formatVnd(s?.totalRevenue), change: s?.changes.totalRevenue, invert: false },
              { label: 'Platform Commission', value: formatVnd(s?.platformCommission), change: s?.changes.platformCommission, invert: false },
              { label: 'Provider Payouts', value: formatVnd(s?.providerPayouts), change: s?.changes.providerPayouts, invert: false },
              { label: 'Refund Volume', value: formatVnd(s?.refundVolume), change: s?.changes.refundVolume, invert: true },
            ].map((card) => (
              <Reveal key={card.label}>
                <div className="rounded-2xl border bg-white p-5" style={{ borderColor: '#e2e8f3' }}>
                  <div className="text-xs font-medium" style={{ color: '#5a6b85' }}>{card.label}</div>
                  <div className="mt-2 text-2xl font-bold tabular-nums" style={{ color: '#0f1729' }}>{card.value}</div>
                  <div className="mt-1 text-xs font-semibold" style={{ color: changeColor(card.change, card.invert) }}>
                    {formatPct(card.change)} vs kỳ trước
                  </div>
                </div>
              </Reveal>
            ))}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <button type="button" onClick={() => clickRecon('MATCHED')} className="rounded-2xl border bg-gradient-to-br from-[#f0fdf4] to-white p-5 text-left transition hover:shadow-md" style={{ borderColor: '#bbf7d0' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#16a34a] text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: '#16a34a' }}>Matched</div>
              <div className="text-2xl font-bold" style={{ color: '#0f1729' }}>{s?.reconciliation.matched ?? '—'} payouts</div>
            </div>
          </div>
        </button>
        <button type="button" onClick={() => clickRecon('PENDING')} className="rounded-2xl border bg-gradient-to-br from-[#fefce8] to-white p-5 text-left transition hover:shadow-md" style={{ borderColor: '#fef08a' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ca8a04] text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: '#ca8a04' }}>Pending Review</div>
              <div className="text-2xl font-bold" style={{ color: '#0f1729' }}>{s?.reconciliation.pending ?? '—'} payouts</div>
            </div>
          </div>
        </button>
        <button type="button" onClick={() => clickRecon('MISMATCH')} className="rounded-2xl border bg-gradient-to-br from-[#fef2f2] to-white p-5 text-left transition hover:shadow-md" style={{ borderColor: '#fecaca' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dc2626] text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: '#dc2626' }}>Mismatch</div>
              <div className="text-2xl font-bold" style={{ color: '#0f1729' }}>{s?.reconciliation.mismatch ?? '—'} payouts</div>
            </div>
          </div>
        </button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">Giao dịch</TabsTrigger>
          <TabsTrigger value="payouts">Payout</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <select
              value={txnStatus}
              onChange={(e) => setTxnStatus(e.target.value as PaymentStatus | 'ALL')}
              className="rounded-xl border bg-white px-4 py-2 text-sm outline-none"
              style={{ borderColor: '#e2e8f3' }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
            <button
              type="button"
              onClick={exportTxns}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]"
              style={{ borderColor: '#e2e8f3', color: '#5a6b85' }}
            >
              Export CSV
            </button>
          </div>
          <Reveal>
            <div className="overflow-hidden rounded-2xl border" style={{ borderColor: '#e2e8f3' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#5a6b85' }}>Transaction</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#5a6b85' }}>Booking</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#5a6b85' }}>Provider</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#5a6b85' }}>Amount</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#5a6b85' }}>Platform Fee</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#5a6b85' }}>Provider Payout</th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: '#5a6b85' }}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#e2e8f3' }}>
                  {txnsLoading && (
                    <tr><td colSpan={7} className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</td></tr>
                  )}
                  {!txnsLoading && transactions.length === 0 && (
                    <tr><td colSpan={7} className="p-8"><EmptyState icon={Search} title="Không có giao dịch" description="Thử đổi khoảng thời gian hoặc bộ lọc." /></td></tr>
                  )}
                  {transactions.map((txn) => {
                    const sc = statusColors[txn.status] ?? statusColors.PENDING;
                    const refunded = txn.status === 'REFUNDED';
                    return (
                      <tr key={txn.id} className="bg-white transition-colors hover:bg-[#f8fafc]">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold" style={{ color: '#0f1729' }}>{txn.transactionId ?? txn.id.slice(0, 8)}</span>
                            <span className="text-xs" style={{ color: '#8694ad' }}>{formatDateTime(txn.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded-lg bg-[#f1f5fa] px-2 py-1 text-xs font-medium" style={{ color: '#5a6b85' }}>{txn.bookingId.slice(0, 8)}</span>
                        </td>
                        <td className="px-6 py-4"><span className="text-sm">{txn.provider.name}</span></td>
                        <td className={`px-6 py-4 text-right font-bold tabular-nums ${refunded ? 'text-red-600' : ''}`} style={{ color: refunded ? '#dc2626' : '#0f1729' }}>
                          {formatVnd(txn.amount)}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums" style={{ color: '#2a7bd9' }}>{formatVnd(txn.platformFee)}</td>
                        <td className="px-6 py-4 text-right font-bold tabular-nums" style={{ color: '#16a34a' }}>{formatVnd(txn.providerNet)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: sc.bg, color: sc.text }}>
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Reveal>
          <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
            <span>Hiển thị {transactions.length} / {txns?.total ?? 0}</span>
            <Pagination page={txnPage} totalPages={txns?.totalPages ?? 1} onChange={setTxnPage} />
          </div>
        </TabsContent>

        <TabsContent value="payouts">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <select
                value={payoutStatus}
                onChange={(e) => setPayoutStatus(e.target.value as PayoutStatus | 'ALL')}
                className="rounded-xl border bg-white px-4 py-2 text-sm outline-none"
                style={{ borderColor: '#e2e8f3' }}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="ON_HOLD">ON_HOLD</option>
              </select>
              <select
                value={reconFilter}
                onChange={(e) => setReconFilter(e.target.value as Reconciliation | 'ALL')}
                className="rounded-xl border bg-white px-4 py-2 text-sm outline-none"
                style={{ borderColor: '#e2e8f3' }}
              >
                <option value="ALL">Tất cả đối soát</option>
                <option value="MATCHED">MATCHED</option>
                <option value="PENDING">PENDING</option>
                <option value="MISMATCH">MISMATCH</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportPayouts}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]"
                style={{ borderColor: '#e2e8f3', color: '#5a6b85' }}
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  generateForm.reset(previousMonth());
                  setGenerateOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#2a7bd9] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1e5aa8]"
              >
                Chạy đối soát
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Kỳ</th>
                  <th className="px-4 py-3 text-right">Số GD</th>
                  <th className="px-4 py-3 text-right">Doanh thu</th>
                  <th className="px-4 py-3 text-right">Hoa hồng</th>
                  <th className="px-4 py-3 text-right">Dự kiến chi</th>
                  <th className="px-4 py-3 text-right">Thực chi</th>
                  <th className="px-4 py-3 text-right">Chênh lệch</th>
                  <th className="px-4 py-3">Đối soát</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payoutsLoading && (
                  <tr><td colSpan={11} className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</td></tr>
                )}
                {!payoutsLoading && payoutItems.length === 0 && (
                  <tr><td colSpan={11} className="p-8"><EmptyState icon={Search} title="Không có payout" description="Chạy đối soát hoặc đổi bộ lọc." /></td></tr>
                )}
                {payoutItems.map((p) => {
                  const disc = p.discrepancy ?? 0;
                  const sc = statusColors[p.status] ?? statusColors.PENDING;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{p.provider.shopName ?? p.provider.name}</div>
                        <div className="text-xs text-slate-500">{p.provider.bankAccount ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{formatDate(p.periodStart)} – {formatDate(p.periodEnd)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{p.paymentCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatVnd(p.grossAmount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatVnd(p.commissionAmount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{formatVnd(p.expectedNet)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatVnd(p.actualPaid)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${disc !== 0 ? 'text-red-600' : 'text-slate-700'}`}>
                        {formatVnd(p.discrepancy)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${reconBadge[p.reconciliation]}`}>{p.reconciliation}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: sc.bg, color: sc.text }}>{p.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.status !== 'PAID' && (
                            <button type="button" onClick={() => openRecord(p, 'record')} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              Ghi nhận chi trả
                            </button>
                          )}
                          {p.status === 'PENDING' && (
                            <button type="button" onClick={() => setHoldTarget(p)} className="rounded-lg border border-amber-200 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50">
                              Tạm giữ
                            </button>
                          )}
                          {p.status === 'PAID' && (
                            <button type="button" onClick={() => openRecord(p, 'edit')} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              Sửa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
            <span>Hiển thị {payoutItems.length} / {payouts?.total ?? 0}</span>
            <Pagination page={payoutPage} totalPages={payouts?.totalPages ?? 1} onChange={setPayoutPage} />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chạy đối soát payout</DialogTitle>
          </DialogHeader>
          <form onSubmit={onGenerate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="periodStart">Từ ngày</Label>
              <Input id="periodStart" type="date" {...generateForm.register('periodStart')} />
              {generateForm.formState.errors.periodStart && (
                <p className="text-xs text-red-600">{generateForm.formState.errors.periodStart.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">Đến ngày</Label>
              <Input id="periodEnd" type="date" {...generateForm.register('periodEnd')} />
              {generateForm.formState.errors.periodEnd && (
                <p className="text-xs text-red-600">{generateForm.formState.errors.periodEnd.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGenerateOpen(false)}>Huỷ</Button>
              <Button type="submit" disabled={generate.isPending}>{generate.isPending ? 'Đang xử lý…' : 'Chạy đối soát'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={recordTarget !== null} onOpenChange={(o) => !o && setRecordTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{recordTarget?.mode === 'edit' ? 'Sửa chi trả' : 'Ghi nhận chi trả'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onRecord} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="actualPaid">Số tiền thực chi</Label>
              <Input
                id="actualPaid"
                type="number"
                {...recordForm.register('actualPaid', { setValueAs: (v) => (v === '' ? 0 : Number(v)) })}
              />
              {recordForm.formState.errors.actualPaid && (
                <p className="text-xs text-red-600">{recordForm.formState.errors.actualPaid.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferRef">Mã chuyển khoản</Label>
              <Input id="transferRef" {...recordForm.register('transferRef')} />
              {recordForm.formState.errors.transferRef && (
                <p className="text-xs text-red-600">{recordForm.formState.errors.transferRef.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Input id="note" {...recordForm.register('note')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRecordTarget(null)}>Huỷ</Button>
              <Button type="submit" disabled={updatePayout.isPending}>{updatePayout.isPending ? 'Đang lưu…' : 'Lưu'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={holdTarget !== null}
        onOpenChange={(o) => !o && setHoldTarget(null)}
        title={`Tạm giữ payout ${holdTarget?.provider.shopName ?? holdTarget?.provider.name}?`}
        confirmLabel="Tạm giữ"
        tone="danger"
        pending={updatePayout.isPending}
        onConfirm={() => {
          if (!holdTarget) return;
          updatePayout.mutate(
            { id: holdTarget.id, status: 'ON_HOLD' },
            {
              onSuccess: () => {
                toast.success('Đã tạm giữ payout');
                setHoldTarget(null);
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
