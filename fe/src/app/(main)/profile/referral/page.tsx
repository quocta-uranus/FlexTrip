'use client';

import { useState } from 'react';
import { Check, Copy, Users } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useReferral, useReferralList } from '@/hooks/useReferrals';
import type { ReferralStatus } from '@/types/referral';

const vnd = (n: number) => `${n.toLocaleString('vi-VN')} ₫`;
const STATUS: Record<ReferralStatus, string> = {
  REGISTERED: 'Chờ đơn đầu tiên',
  QUALIFIED: 'Đang cấp thưởng',
  REWARDED: 'Đã nhận thưởng',
  REJECTED: 'Chờ đơn đầu tiên',
};

export default function ReferralPage() {
  const { data: me, isLoading } = useReferral();
  const [page, setPage] = useState(1);
  const { data: list } = useReferralList(page);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const link = me ? `${typeof window === 'undefined' ? '' : window.location.origin}/register?ref=${me.code}` : '';

  async function copy(kind: 'code' | 'link') {
    if (!me) return;
    try {
      await navigator.clipboard.writeText(kind === 'code' ? me.code : link);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Trình duyệt chặn clipboard: người dùng vẫn có thể bôi đen mã đang hiển thị
    }
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Giới thiệu bạn bè</h1>
        {me && (
          <p className="mt-1 text-sm text-muted-foreground">
            Bạn bè đăng ký bằng mã của bạn nhận {vnd(me.rewards.refereeVoucherVnd)}. Khi họ hoàn thành đơn thuê đầu tiên, bạn nhận {vnd(me.rewards.referrerVoucherVnd)} (tối đa {me.rewards.monthlyCap} lượt/tháng).
          </p>
        )}
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        {isLoading || !me ? <Skeleton className="h-20 w-full" /> : (
          <>
            <p className="text-sm text-muted-foreground">Mã giới thiệu của bạn</p>
            <p className="mt-1 font-mono text-3xl font-extrabold tracking-widest text-foreground">{me.code}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => copy('code')}>{copied === 'code' ? <Check className="size-4" /> : <Copy className="size-4" />} Sao chép mã</Button>
              <Button size="sm" variant="outline" onClick={() => copy('link')}>{copied === 'link' ? <Check className="size-4" /> : <Copy className="size-4" />} Sao chép liên kết</Button>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">Đã đăng ký</dt><dd className="text-xl font-bold">{me.stats.registered + me.stats.rewarded + me.stats.rejected}</dd></div>
              <div className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">Đã nhận thưởng</dt><dd className="text-xl font-bold text-emerald-600">{me.stats.rewarded}</dd></div>
            </dl>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-foreground">Bạn bè đã mời</h2>
        {(list?.items.length ?? 0) === 0 ? (
          <EmptyState icon={Users} title="Chưa có ai đăng ký" description="Chia sẻ mã hoặc liên kết để bắt đầu nhận thưởng." />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {list?.items.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.refereeName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
                <span className={r.status === 'REWARDED' ? 'text-sm font-semibold text-emerald-600' : 'text-sm text-muted-foreground'}>{STATUS[r.status]}</span>
              </li>
            ))}
          </ul>
        )}
        {list && list.totalPages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-3 text-sm">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
            <span className="text-muted-foreground">{page} / {list.totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= list.totalPages} onClick={() => setPage((p) => p + 1)}>Sau</Button>
          </div>
        )}
      </section>
    </>
  );
}
