'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLoyalty, useLoyaltyRewards, useLoyaltyTransactions, useRedeemReward } from '@/hooks/useLoyalty';
import type { LoyaltyReward, RedeemResult } from '@/types/loyalty';

const describe = (r: LoyaltyReward) =>
  r.voucherType === 'FIXED'
    ? `Giảm ${r.voucherValue.toLocaleString('vi-VN')} ₫`
    : `Giảm ${r.voucherValue}%${r.maxDiscount ? `, tối đa ${r.maxDiscount.toLocaleString('vi-VN')} ₫` : ''}`;

export default function LoyaltyPage() {
  const { data: me, isLoading } = useLoyalty();
  const { data: rewards } = useLoyaltyRewards();
  const [page, setPage] = useState(1);
  const { data: history } = useLoyaltyTransactions(page);
  const redeem = useRedeemReward();
  const [confirming, setConfirming] = useState<LoyaltyReward | null>(null);
  const [done, setDone] = useState<RedeemResult | null>(null);

  const next = me?.nextReward;
  const progress = next ? Math.min(((next.pointsCost - next.pointsNeeded) / next.pointsCost) * 100, 100) : 100;

  function confirmRedeem(reward: LoyaltyReward) {
    redeem.mutate(reward.id, {
      onSuccess: (result) => { setDone(result); setConfirming(null); },
    });
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Điểm thưởng</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mỗi đơn thuê hoàn thành được {me?.pointsPerOrder ?? 1} điểm. Đổi điểm lấy voucher giảm giá tiền thuê.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        {isLoading ? <Skeleton className="h-20 w-full" /> : (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Điểm hiện có</p>
                <p className="text-4xl font-extrabold text-foreground">{(me?.balance ?? 0).toLocaleString('vi-VN')}</p>
              </div>
              <p className="text-xs text-muted-foreground">Tổng đã tích: {(me?.lifetimePoints ?? 0).toLocaleString('vi-VN')} điểm</p>
            </div>
            <div className="mt-5">
              <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {next
                  ? `Còn ${next.pointsNeeded} điểm nữa để đổi "${next.name}"`
                  : (rewards?.length ?? 0) > 0 ? 'Bạn đã đủ điểm cho mọi phần thưởng hiện có' : 'Chưa có phần thưởng nào để đổi'}
              </p>
            </div>
          </>
        )}
      </section>

      {done && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          <p className="flex items-center gap-2 font-semibold"><Sparkles className="size-4" /> Đổi thành công! Mã của bạn: <span className="font-mono">{done.voucher.code}</span></p>
          <p className="mt-1">Hạn dùng đến {new Date(done.voucher.endsAt).toLocaleDateString('vi-VN')}. Điểm không được hoàn lại nếu voucher hết hạn chưa dùng.</p>
          <Link href="/profile/vouchers" className="mt-2 inline-block font-semibold underline">Xem voucher của tôi</Link>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-foreground">Đổi thưởng</h2>
        {(rewards?.length ?? 0) === 0 ? (
          <EmptyState icon={Gift} title="Chưa có phần thưởng" description="Các mốc đổi điểm sẽ xuất hiện ở đây khi được thiết lập." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rewards?.map((r) => {
              const enough = (me?.balance ?? 0) >= r.pointsCost;
              return (
                <li key={r.id} className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4">
                  <div>
                    <p className="font-semibold text-foreground">{r.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{describe(r)} · dùng trong {r.validDays} ngày</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">{r.pointsCost} điểm</span>
                    <Button size="sm" disabled={!enough || redeem.isPending} onClick={() => { redeem.reset(); setConfirming(r); }}>
                      {enough ? 'Đổi' : 'Chưa đủ điểm'}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {confirming && (
        <div role="dialog" aria-modal="true" aria-label="Xác nhận đổi điểm" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">Đổi {confirming.pointsCost} điểm?</h3>
            <p className="mt-2 text-sm text-muted-foreground">Bạn sẽ nhận voucher &quot;{confirming.name}&quot; ({describe(confirming)}), dùng trong {confirming.validDays} ngày.</p>
            {redeem.error && <p role="alert" className="mt-3 text-sm text-red-600">{redeem.error.message}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(null)} disabled={redeem.isPending}>Huỷ</Button>
              <Button onClick={() => confirmRedeem(confirming)} disabled={redeem.isPending}>{redeem.isPending ? 'Đang đổi…' : 'Xác nhận'}</Button>
            </div>
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-foreground">Lịch sử điểm</h2>
        {(history?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có giao dịch điểm nào.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {history?.items.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.note ?? (t.points > 0 ? 'Cộng điểm' : 'Trừ điểm')}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString('vi-VN')} · còn {t.balanceAfter} điểm</p>
                  </div>
                  <span className={t.points > 0 ? 'font-bold text-emerald-600' : 'font-bold text-foreground'}>{t.points > 0 ? '+' : ''}{t.points}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {history && history.totalPages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-3 text-sm">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
            <span className="text-muted-foreground">{page} / {history.totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= history.totalPages} onClick={() => setPage((p) => p + 1)}>Sau</Button>
          </div>
        )}
      </section>
    </>
  );
}
