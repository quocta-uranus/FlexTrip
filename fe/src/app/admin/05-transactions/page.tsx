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
import { usePlatformSummary, useProcessWithdraw, useWithdrawRequests } from '@/hooks/useWithdraw';
import type { WithdrawRequest } from '@/lib/api/withdraw';
import { adminApi } from '@/lib/api/admin';
import { CommissionsTab } from './_components/commissions-tab';
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

const paymentStatusLabel: Record<string, string> = {
  PAID: 'Đã thanh toán',
  PENDING: 'Chờ thanh toán',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

const payoutStatusLabel: Record<string, string> = {
  PENDING: 'Chờ chi trả',
  PAID: 'Đã chi trả',
  ON_HOLD: 'Tạm giữ',
};

const reconLabel: Record<Reconciliation, string> = {
  MATCHED: 'Khớp',
  PENDING: 'Chờ đối soát',
  MISMATCH: 'Lệch tiền',
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

  const [withdrawStatus, setWithdrawStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const { data: withdrawData, isLoading: withdrawLoading } = useWithdrawRequests(withdrawStatus === 'ALL' ? undefined : withdrawStatus);
  const { data: platformSummary } = usePlatformSummary();
  const processWithdraw = useProcessWithdraw();
  const [approveTarget, setApproveTarget] = useState<WithdrawRequest | null>(null);
  const [transferRef, setTransferRef] = useState('');
  const [adminNote, setAdminNote] = useState('');

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
          toast.success(recordTarget.mode === 'record' ? 'Đã ghi nhận chi trả' : 'Đã cập nhật kỳ chi trả');
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
            <LiveDot label="ĐANG ĐỐI SOÁT" tone="blue" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: '#0f1729' }}>Quản lý giao dịch</h1>
          <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>Theo dõi tiền khách thanh toán, hoa hồng nền tảng, tiền ký quỹ (escrow) và chi trả cho provider</p>
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
              { label: 'Tổng doanh thu', hint: 'Tiền khách đã thanh toán trong kỳ', value: formatVnd(s?.totalRevenue), change: s?.changes.totalRevenue, invert: false },
              { label: 'Hoa hồng nền tảng', hint: 'Phần FlexTrip giữ lại (8–10%)', value: formatVnd(s?.platformCommission), change: s?.changes.platformCommission, invert: false },
              { label: 'Chi trả cho provider', hint: 'Phần provider nhận (90%)', value: formatVnd(s?.providerPayouts), change: s?.changes.providerPayouts, invert: false },
              { label: 'Tiền hoàn lại', hint: 'Tổng tiền đã hoàn cho khách', value: formatVnd(s?.refundVolume), change: s?.changes.refundVolume, invert: true },
            ].map((card) => (
              <Reveal key={card.label}>
                <div className="rounded-2xl border bg-white p-5" style={{ borderColor: '#e2e8f3' }}>
                  <div className="text-xs font-medium" style={{ color: '#5a6b85' }}>{card.label}</div>
                  <div className="mt-2 text-2xl font-bold tabular-nums" style={{ color: '#0f1729' }}>{card.value}</div>
                  <div className="mt-1 text-xs font-semibold" style={{ color: changeColor(card.change, card.invert) }}>
                    {formatPct(card.change)} so với kỳ trước
                  </div>
                  <div className="mt-1 text-xs" style={{ color: '#8694ad' }}>{card.hint}</div>
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
              <div className="text-lg font-bold" style={{ color: '#16a34a' }}>Khớp</div>
              <div className="text-2xl font-bold" style={{ color: '#0f1729' }}>{s?.reconciliation.matched ?? '—'} kỳ chi trả</div>
            </div>
          </div>
        </button>
        <button type="button" onClick={() => clickRecon('PENDING')} className="rounded-2xl border bg-gradient-to-br from-[#fefce8] to-white p-5 text-left transition hover:shadow-md" style={{ borderColor: '#fef08a' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ca8a04] text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: '#ca8a04' }}>Chờ đối soát</div>
              <div className="text-2xl font-bold" style={{ color: '#0f1729' }}>{s?.reconciliation.pending ?? '—'} kỳ chi trả</div>
            </div>
          </div>
        </button>
        <button type="button" onClick={() => clickRecon('MISMATCH')} className="rounded-2xl border bg-gradient-to-br from-[#fef2f2] to-white p-5 text-left transition hover:shadow-md" style={{ borderColor: '#fecaca' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dc2626] text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: '#dc2626' }}>Lệch tiền</div>
              <div className="text-2xl font-bold" style={{ color: '#0f1729' }}>{s?.reconciliation.mismatch ?? '—'} kỳ chi trả</div>
            </div>
          </div>
        </button>
      </div>

      {platformSummary && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Tiền ký quỹ (escrow)', hint: 'Tiền thuê khách trả bằng ví, nền tảng đang giữ đến khi đơn hoàn thành', value: formatVnd(platformSummary.escrowBalance), color: '#2a7bd9' },
            { label: 'Hoa hồng nền tảng đã thu', hint: 'Tổng hoa hồng của các đơn đã hoàn thành (toàn thời gian)', value: formatVnd(platformSummary.platformRevenue), color: '#7c3aed' },
            { label: 'Yêu cầu rút tiền đang chờ', hint: 'Số yêu cầu · tổng tiền chờ admin duyệt', value: `${platformSummary.pendingWithdrawalCount} · ${formatVnd(platformSummary.pendingWithdrawalAmount)}`, color: '#f59e0b' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border bg-white p-5" style={{ borderColor: '#e2e8f3' }}>
              <p className="text-xs font-medium" style={{ color: '#5a6b85' }}>{stat.label}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
              <p className="mt-1 text-xs" style={{ color: '#8694ad' }}>{stat.hint}</p>
            </div>
          ))}
        </div>
      )}

      <details className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <summary className="cursor-pointer font-semibold text-slate-900">Tiền được chia như thế nào? (bấm để xem)</summary>
        <div className="mt-4 space-y-4">
          <div>
            <p className="font-semibold text-slate-900">1. Khi khách đặt và thanh toán</p>
            <p className="mt-1">Khách trả <strong>tiền thuê + tiền cọc</strong>. Giao dịch hiện ở tab &quot;Giao dịch&quot; với trạng thái <em>Đã thanh toán</em>. Lúc này cột hoa hồng còn <strong>0đ</strong> vì tiền chưa được chia.</p>
            <p className="mt-1">Nếu khách trả bằng <strong>ví</strong>, tiền thuê được cộng vào quỹ <strong>ký quỹ (escrow)</strong> của nền tảng. Thanh toán qua PayOS không đi qua escrow.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">2. Khi đơn chuyển sang &quot;Hoàn thành&quot;</p>
            <p className="mt-1">Hệ thống tự chia <strong>tiền thuê</strong> (không tính tiền cọc):</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="font-medium text-slate-900">Đơn có staff phụ trách</p>
                <p>Provider 90% · Nền tảng 8% · Staff 2%</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="font-medium text-slate-900">Đơn không có staff</p>
                <p>Provider 90% · Nền tảng 10%</p>
              </div>
            </div>
            <p className="mt-2">Phần của provider và staff được cộng vào ví của họ (provider rút tiền ở tab &quot;Rút tiền&quot;). Nếu đơn trả bằng ví, phần này được trừ khỏi escrow; phần hoa hồng nền tảng ở lại escrow.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">3. Tiền cọc</p>
            <p className="mt-1">Sau khi đơn hoàn thành, tiền cọc được giữ thêm <strong>72 giờ</strong> rồi hoàn lại cho khách.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Cách kiểm tra nhanh</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>Tạo một đơn thuê và thanh toán xong, ở tab &quot;Giao dịch&quot; thấy giao dịch <em>Đã thanh toán</em>, hoa hồng = 0đ.</li>
              <li>Provider duyệt, rồi chuyển đơn sang <em>Hoàn thành</em>.</li>
              <li>Tải lại trang: cột &quot;Hoa hồng nền tảng&quot; và &quot;Provider nhận&quot; có số tiền, đúng tỷ lệ 8–10% / 90%.</li>
              <li>Xem thẻ &quot;Hoa hồng nền tảng đã thu&quot; ở trên tăng lên tương ứng.</li>
            </ol>
          </div>
        </div>
      </details>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="transactions">Giao dịch</TabsTrigger>
          <TabsTrigger value="commissions">Hoa hồng</TabsTrigger>
          <TabsTrigger value="payouts">Chi trả định kỳ</TabsTrigger>
          <TabsTrigger value="withdrawals">Rút tiền</TabsTrigger>
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
              <option value="PAID">Đã thanh toán</option>
              <option value="PENDING">Chờ thanh toán</option>
              <option value="FAILED">Thất bại</option>
              <option value="REFUNDED">Đã hoàn tiền</option>
            </select>
            <button
              type="button"
              onClick={exportTxns}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]"
              style={{ borderColor: '#e2e8f3', color: '#5a6b85' }}
            >
              Xuất CSV
            </button>
          </div>
          <Reveal>
            <div className="overflow-hidden rounded-2xl border" style={{ borderColor: '#e2e8f3' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#5a6b85' }}>Mã giao dịch</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#5a6b85' }}>Mã đơn</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: '#5a6b85' }}>Provider</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#5a6b85' }}>Tổng tiền khách trả</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#5a6b85' }}>Hoa hồng nền tảng</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: '#5a6b85' }}>Provider nhận</th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: '#5a6b85' }}>Trạng thái</th>
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
                            {paymentStatusLabel[txn.status] ?? txn.status}
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

        <TabsContent value="commissions">
          <CommissionsTab period={period} />
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
                <option value="PENDING">Chờ chi trả</option>
                <option value="PAID">Đã chi trả</option>
                <option value="ON_HOLD">Tạm giữ</option>
              </select>
              <select
                value={reconFilter}
                onChange={(e) => setReconFilter(e.target.value as Reconciliation | 'ALL')}
                className="rounded-xl border bg-white px-4 py-2 text-sm outline-none"
                style={{ borderColor: '#e2e8f3' }}
              >
                <option value="ALL">Tất cả đối soát</option>
                <option value="MATCHED">Khớp</option>
                <option value="PENDING">Chờ đối soát</option>
                <option value="MISMATCH">Lệch tiền</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportPayouts}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]"
                style={{ borderColor: '#e2e8f3', color: '#5a6b85' }}
              >
                Xuất CSV
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
                  <th className="px-4 py-3">Kỳ chi trả</th>
                  <th className="px-4 py-3 text-right">Số giao dịch</th>
                  <th className="px-4 py-3 text-right">Doanh thu</th>
                  <th className="px-4 py-3 text-right">Hoa hồng</th>
                  <th className="px-4 py-3 text-right">Dự kiến chi trả</th>
                  <th className="px-4 py-3 text-right">Thực chi trả</th>
                  <th className="px-4 py-3 text-right">Chênh lệch</th>
                  <th className="px-4 py-3">Đối soát</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payoutsLoading && (
                  <tr><td colSpan={11} className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</td></tr>
                )}
                {!payoutsLoading && payoutItems.length === 0 && (
                  <tr><td colSpan={11} className="p-8"><EmptyState icon={Search} title="Chưa có kỳ chi trả nào" description="Bấm “Chạy đối soát” để tạo kỳ chi trả hoặc đổi bộ lọc." /></td></tr>
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
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${reconBadge[p.reconciliation]}`}>{reconLabel[p.reconciliation]}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: sc.bg, color: sc.text }}>{payoutStatusLabel[p.status] ?? p.status}</span>
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

        {/* ── Withdrawals tab ─────────────────────────────────── */}
        <TabsContent value="withdrawals">
          {/* Filter */}
          <div className="mb-4 flex flex-wrap gap-2">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setWithdrawStatus(s)}
                className="rounded-full px-3 py-1 text-xs font-semibold transition-all"
                style={withdrawStatus === s
                  ? { background: '#2a7bd9', color: '#fff' }
                  : { background: '#f1f5fa', color: '#5a6b85' }}
              >
                {s === 'ALL' ? 'Tất cả' : s === 'PENDING' ? 'Chờ duyệt' : s === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Người dùng</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Số tiền</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Ngân hàng</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Ngày tạo</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {withdrawLoading && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Đang tải...</td></tr>
                )}
                {!withdrawLoading && (withdrawData?.items ?? []).length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Không có yêu cầu nào</td></tr>
                )}
                {(withdrawData?.items ?? []).map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{req.user.name}</p>
                      <p className="text-xs text-slate-400">{req.user.email}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-blue-700">{formatVnd(req.amount)}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{req.bankName}</p>
                      <p className="text-xs font-mono text-slate-500">{req.bankAccount}</p>
                      <p className="text-xs text-slate-400">{req.accountName}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(req.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                        req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>{req.status === 'PENDING' ? 'Chờ duyệt' : req.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {req.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setApproveTarget(req); setTransferRef(''); setAdminNote(''); }}
                            className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700"
                          >Duyệt</button>
                          <button
                            onClick={() => processWithdraw.mutate({ id: req.id, action: 'reject', adminNote: 'Từ chối bởi admin' }, { onSuccess: () => toast.success('Đã từ chối'), onError: toast.error })}
                            className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >Từ chối</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Approve withdraw dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Duyệt yêu cầu rút tiền</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Người dùng: <strong>{approveTarget?.user.name}</strong></p>
            <p>Số tiền: <strong className="text-blue-700">{formatVnd(approveTarget?.amount ?? 0)}</strong></p>
            <p>Ngân hàng: {approveTarget?.bankName} — {approveTarget?.bankAccount} — {approveTarget?.accountName}</p>
            <div>
              <Label htmlFor="transferRef">Mã chuyển khoản *</Label>
              <Input id="transferRef" className="mt-1" value={transferRef} onChange={(e) => setTransferRef(e.target.value)} placeholder="VD: VCB20241014..." />
            </div>
            <div>
              <Label htmlFor="adminNote">Ghi chú (tuỳ chọn)</Label>
              <Input id="adminNote" className="mt-1" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Huỷ</Button>
            <Button
              disabled={!transferRef || processWithdraw.isPending}
              onClick={() => {
                if (!approveTarget) return;
                processWithdraw.mutate(
                  { id: approveTarget.id, action: 'approve', transferRef, adminNote },
                  {
                    onSuccess: () => { toast.success('Đã duyệt yêu cầu rút tiền'); setApproveTarget(null); },
                    onError: toast.error,
                  },
                );
              }}
            >Xác nhận duyệt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chạy đối soát chi trả</DialogTitle>
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
        title={`Tạm giữ kỳ chi trả của ${holdTarget?.provider.shopName ?? holdTarget?.provider.name}?`}
        confirmLabel="Tạm giữ"
        tone="danger"
        pending={updatePayout.isPending}
        onConfirm={() => {
          if (!holdTarget) return;
          updatePayout.mutate(
            { id: holdTarget.id, status: 'ON_HOLD' },
            {
              onSuccess: () => {
                toast.success('Đã tạm giữ kỳ chi trả');
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
