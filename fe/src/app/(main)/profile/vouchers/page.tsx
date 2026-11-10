'use client';

import { useState } from 'react';
import { Check, Copy, Ticket } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyVouchers } from '@/hooks/useVouchers';
import { cn } from '@/lib/utils';
import { REDEMPTION_STATUS_LABELS, describeVoucher, type MyVoucher } from '@/types/voucher';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

function VoucherCard({ voucher }: { voucher: MyVoucher }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard bị chặn (http hoặc trình duyệt cũ): người dùng vẫn đọc được mã trên thẻ
    }
  }

  return (
    <li className="flex items-stretch overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-primary/10 px-2 text-center text-primary">
        <Ticket className="size-6" />
        <span className="mt-1 text-[11px] font-semibold">{voucher.type === 'PERCENT' ? `${voucher.value}%` : 'Voucher'}</span>
      </div>
      <div className="min-w-0 flex-1 p-4">
        <p className="font-semibold text-foreground">{voucher.name}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{describeVoucher(voucher)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {voucher.minOrderValue > 0 && <>Đơn từ {voucher.minOrderValue.toLocaleString('vi-VN')} ₫ · </>}
          HSD {fmtDate(voucher.endsAt)}
        </p>
        <button
          type="button"
          onClick={copy}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-primary/50 px-3 py-1.5 font-mono text-xs font-semibold text-primary hover:bg-primary/5"
        >
          {voucher.code}
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </li>
  );
}

export default function MyVouchersPage() {
  const { data, isLoading, error } = useMyVouchers();
  const [tab, setTab] = useState<'available' | 'history'>('available');

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Voucher của tôi</h1>
        <p className="mt-1 text-sm text-muted-foreground">Nhập mã ở bước giỏ hàng để trừ vào tiền thuê trả sau.</p>
      </div>

      <div className="flex gap-2" role="tablist">
        {([['available', `Dùng được (${data?.available.length ?? 0})`], ['history', 'Lịch sử dùng']] as const).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-semibold transition',
              tab === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
      ) : error ? (
        <p role="alert" className="text-sm text-red-600">{error.message}</p>
      ) : tab === 'available' ? (
        (data?.available.length ?? 0) === 0 ? (
          <EmptyState icon={Ticket} title="Chưa có voucher nào dùng được" description="Voucher mới sẽ xuất hiện ở đây khi có chương trình khuyến mãi." />
        ) : (
          <ul className="space-y-3">{data?.available.map((v) => <VoucherCard key={v.id} voucher={v} />)}</ul>
        )
      ) : (data?.history.length ?? 0) === 0 ? (
        <EmptyState icon={Ticket} title="Bạn chưa dùng voucher nào" description="Các lần áp mã sẽ được ghi lại tại đây." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {data?.history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-semibold text-foreground">{h.name} <span className="font-mono text-xs text-muted-foreground">({h.code})</span></p>
                  <p className="text-xs text-muted-foreground">{fmtDate(h.createdAt)} · {REDEMPTION_STATUS_LABELS[h.status]}</p>
                </div>
                <span className="text-sm font-semibold text-foreground">-{h.discountAmount.toLocaleString('vi-VN')} ₫</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
