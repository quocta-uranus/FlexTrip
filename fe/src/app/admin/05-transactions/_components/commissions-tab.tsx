'use client';

import { useState } from 'react';
import { Coins, Search } from 'lucide-react';
import { Pagination } from '@/components/admin/pagination';
import { EmptyState } from '@/components/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useCommissions, useStaffCommissions, type Period } from '@/hooks/admin/use-admin-finance';
import { useActiveStaffOptions } from '@/hooks/admin/use-admin-staff';
import { formatDate, formatDateTime, formatVnd } from '@/lib/format';
import type { CommissionRow, LedgerStatus } from '@/types/admin';

const statusLabel: Record<LedgerStatus, string> = {
  PENDING: 'Chờ chia',
  SETTLED: 'Đã chia',
  CANCELLED: 'Đã huỷ',
};

const statusBadge: Record<LedgerStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  SETTLED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const gatewayLabel: Record<string, string> = {
  PAYOS: 'PayOS',
  WALLET: 'Ví FlexTrip',
  VNPAY: 'VNPay',
};

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);

function SplitBar({ platform, staff, provider }: { platform: number; staff: number; provider: number }) {
  const total = platform + staff + provider;
  if (total <= 0) return <div className="h-3 w-full rounded-full bg-slate-100" />;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Tỷ lệ chia tiền">
      <div className="bg-violet-500" style={{ width: `${pct(platform, total)}%` }} title="Nền tảng" />
      <div className="bg-amber-400" style={{ width: `${pct(staff, total)}%` }} title="Staff" />
      <div className="bg-emerald-500" style={{ width: `${pct(provider, total)}%` }} title="Provider" />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-violet-500" />Nền tảng</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber-400" />Staff</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500" />Provider</span>
    </div>
  );
}

function BreakdownLine({ color, label, note, amount, percent }: { color: string; label: string; note: string; amount: number; percent: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`size-3 rounded-full ${color}`} />
        <div>
          <p className="text-sm font-semibold text-slate-900">{label} <span className="font-normal text-slate-500">· {percent}%</span></p>
          <p className="text-xs text-slate-500">{note}</p>
        </div>
      </div>
      <p className="text-base font-bold tabular-nums text-slate-900">{formatVnd(amount)}</p>
    </div>
  );
}

function CommissionDetailDialog({ row, onClose, onViewStaff }: { row: CommissionRow | null; onClose: () => void; onViewStaff: (staffId: string) => void }) {
  const total = row ? row.platformFee + row.staffFee + row.providerNet : 0;
  const hasStaff = !!row?.staffId || (row?.staffFee ?? 0) > 0;
  return (
    <Dialog open={row !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Chi tiết chia tiền · Đơn {row?.bookingId.slice(0, 8)}</DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-5 text-sm">
            <div className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Sản phẩm</p>
                <p className="font-semibold text-slate-900">{row.listingTitle ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Khách thuê</p>
                <p className="text-slate-800">{row.travelerName ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Thời gian thuê</p>
                <p className="text-slate-800">{row.startDate ? formatDate(row.startDate) : '—'} → {row.endDate ? formatDate(row.endDate) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Thanh toán qua</p>
                <p className="text-slate-800">{row.gateway ? (gatewayLabel[row.gateway] ?? row.gateway) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Trạng thái</p>
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge[row.status]}`}>{statusLabel[row.status]}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <p className="font-semibold text-slate-900">Tiền thuê được chia</p>
                <p className="text-lg font-bold tabular-nums text-slate-900">{formatVnd(total)}</p>
              </div>
              <SplitBar platform={row.platformFee} staff={row.staffFee} provider={row.providerNet} />
              <Legend />
              <div className="space-y-2">
                <BreakdownLine
                  color="bg-violet-500"
                  label="Nền tảng FlexTrip"
                  note={hasStaff ? 'Đơn có staff nên nền tảng giữ 8%' : 'Đơn không có staff nên nền tảng giữ 10%'}
                  amount={row.platformFee}
                  percent={pct(row.platformFee, total)}
                />
                <BreakdownLine
                  color="bg-amber-400"
                  label={`Staff phụ trách${row.staffName ? `: ${row.staffName}` : ''}`}
                  note={hasStaff ? 'Staff nhận 2% khi đơn hoàn thành' : 'Đơn này không có staff phụ trách'}
                  amount={row.staffFee}
                  percent={pct(row.staffFee, total)}
                />
                <BreakdownLine
                  color="bg-emerald-500"
                  label="Provider nhận"
                  note="Cộng vào ví provider, provider có thể rút tiền"
                  amount={row.providerNet}
                  percent={pct(row.providerNet, total)}
                />
              </div>
              <p className="text-xs text-slate-500">Tiền cọc của khách không nằm trong phần chia này, được hoàn lại cho khách sau 72 giờ.</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>Tạo lúc: {formatDateTime(row.createdAt)}</span>
              <span>Chia tiền lúc: {row.settledAt ? formatDateTime(row.settledAt) : 'Chưa chia'}</span>
            </div>
            {row.staffId && (
              <button
                type="button"
                onClick={() => onViewStaff(row.staffId!)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Xem tổng hoa hồng của {row.staffName}
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StaffEarningsDialog({ staffId, period, onClose }: { staffId: string | null; period: Period; onClose: () => void }) {
  const { data, isLoading } = useStaffCommissions(staffId, period);
  return (
    <Dialog open={staffId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Hoa hồng của staff{data?.staff ? `: ${data.staff.name}` : ''}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-500">Tính theo kỳ đang chọn: {formatDate(period.from)} – {formatDate(period.to)}. Chỉ tính các đơn đã chia tiền.</p>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {data && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs text-amber-700">Tổng hoa hồng đã nhận</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-amber-800">{formatVnd(data.totalEarned)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Số đơn đã hoàn thành</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{data.bookingCount}</p>
              </div>
            </div>
            {data.staff && <p className="text-xs text-slate-500">{data.staff.email}</p>}
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2">Đơn</th>
                    <th className="px-3 py-2">Chia lúc</th>
                    <th className="px-3 py-2 text-right">Hoa hồng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.length === 0 && (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-400">Chưa có hoa hồng trong kỳ này</td></tr>
                  )}
                  {data.rows.map((r) => (
                    <tr key={r.bookingId}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-800">{r.listingTitle ?? '—'}</p>
                        <p className="text-xs text-slate-500">#{r.bookingId.slice(0, 8)}</p>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">{r.settledAt ? formatDate(r.settledAt) : '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-amber-700">{formatVnd(r.staffFee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CommissionsTab({ period }: { period: Period }) {
  const [staffId, setStaffId] = useState('ALL');
  const [status, setStatus] = useState<LedgerStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const filterKey = `${period.from}|${period.to}|${staffId}|${status}`;
  const [prevKey, setPrevKey] = useState(filterKey);
  if (filterKey !== prevKey) {
    setPrevKey(filterKey);
    setPage(1);
  }

  const [detail, setDetail] = useState<CommissionRow | null>(null);
  const [staffView, setStaffView] = useState<string | null>(null);

  const { data, isLoading } = useCommissions({ ...period, staffId, status, page });
  const { data: staffOptions } = useActiveStaffOptions();

  const rows = data?.items ?? [];
  const sum = data?.summary;
  const grand = (sum?.platformFee ?? 0) + (sum?.staffFee ?? 0) + (sum?.providerNet ?? 0);

  const cards = [
    { label: 'Số đơn đã ghi nhận', value: String(sum?.count ?? 0), hint: 'Số đơn có bản ghi chia tiền trong kỳ', color: '#0f1729' },
    { label: 'Hoa hồng nền tảng', value: formatVnd(sum?.platformFee ?? 0), hint: `${pct(sum?.platformFee ?? 0, grand)}% tổng tiền thuê`, color: '#7c3aed' },
    { label: 'Hoa hồng staff', value: formatVnd(sum?.staffFee ?? 0), hint: `${pct(sum?.staffFee ?? 0, grand)}% tổng tiền thuê`, color: '#d97706' },
    { label: 'Provider nhận', value: formatVnd(sum?.providerNet ?? 0), hint: `${pct(sum?.providerNet ?? 0, grand)}% tổng tiền thuê`, color: '#059669' },
  ];

  return (
    <div>
      <div className="mb-4 grid gap-4 sm:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
          : cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium text-slate-500">{c.label}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: c.color }}>{c.value}</p>
                <p className="mt-1 text-xs text-slate-400">{c.hint}</p>
              </div>
            ))}
      </div>

      <div className="mb-6 space-y-2 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">Tỷ lệ chia tiền toàn kỳ</p>
          <Legend />
        </div>
        <SplitBar platform={sum?.platformFee ?? 0} staff={sum?.staffFee ?? 0} provider={sum?.providerNet ?? 0} />
        <p className="text-xs text-slate-500">
          Tổng tiền thuê đã chia: <strong>{formatVnd(grand)}</strong>. Đơn có staff chia 90% / 8% / 2%, đơn không có staff chia 90% / 10% (provider / nền tảng / staff).
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
        >
          <option value="ALL">Tất cả staff</option>
          {(staffOptions?.items ?? []).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as LedgerStatus | 'ALL')}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="SETTLED">Đã chia</option>
          <option value="PENDING">Chờ chia</option>
          <option value="CANCELLED">Đã huỷ</option>
        </select>
        {staffId !== 'ALL' && (
          <button
            type="button"
            onClick={() => setStaffView(staffId)}
            className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
          >
            Xem tổng hoa hồng của staff này
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Đơn thuê</th>
              <th className="px-4 py-3">Khách</th>
              <th className="px-4 py-3">Thanh toán qua</th>
              <th className="px-4 py-3 text-right">Nền tảng</th>
              <th className="px-4 py-3 text-right">Staff</th>
              <th className="px-4 py-3 text-right">Provider nhận</th>
              <th className="px-4 py-3">Tỷ lệ chia</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr><td colSpan={9} className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8">
                  <EmptyState
                    icon={rows.length === 0 && (sum?.count ?? 0) === 0 ? Coins : Search}
                    title="Chưa có hoa hồng nào"
                    description="Tiền chỉ được chia khi đơn chuyển sang “Hoàn thành”. Hãy hoàn thành một đơn hoặc đổi khoảng thời gian, bộ lọc."
                  />
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const total = r.platformFee + r.staffFee + r.providerNet;
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="max-w-[220px] truncate font-medium text-slate-900">{r.listingTitle ?? '—'}</p>
                    <p className="text-xs text-slate-500">#{r.bookingId.slice(0, 8)}{r.startDate ? ` · ${formatDate(r.startDate)}` : ''}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.travelerName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{r.gateway ? (gatewayLabel[r.gateway] ?? r.gateway) : '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-violet-700">{formatVnd(r.platformFee)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <p className="font-semibold text-amber-700">{formatVnd(r.staffFee)}</p>
                    {r.staffName && <p className="text-xs text-slate-500">{r.staffName}</p>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">{formatVnd(r.providerNet)}</td>
                  <td className="w-40 px-4 py-3">
                    <SplitBar platform={r.platformFee} staff={r.staffFee} provider={r.providerNet} />
                    <p className="mt-1 text-[11px] text-slate-500">
                      {pct(r.providerNet, total)}% · {pct(r.platformFee, total)}% · {pct(r.staffFee, total)}%
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge[r.status]}`}>{statusLabel[r.status]}</span>
                    {r.settledAt && <p className="mt-1 text-[11px] text-slate-500">{formatDate(r.settledAt)}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setDetail(r)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
        <span>Hiển thị {rows.length} / {data?.total ?? 0}</span>
        <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
      </div>

      <CommissionDetailDialog row={detail} onClose={() => setDetail(null)} onViewStaff={(id) => { setDetail(null); setStaffView(id); }} />
      <StaffEarningsDialog staffId={staffView} period={period} onClose={() => setStaffView(null)} />
    </div>
  );
}
