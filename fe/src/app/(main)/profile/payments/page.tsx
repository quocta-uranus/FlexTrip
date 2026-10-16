'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TransactionRow } from '@/components/profile/transaction-row';
import { WalletBalanceCard } from '@/components/profile/wallet-balance-card';
import { useWallet, useWalletTransactions, useTopup, useRequestPayout } from '@/hooks/usePayments';
import type { PayoutRequest } from '@/types/payment';
import type { WalletTxType } from '@/types/wallet';

const MIN_TOPUP = 10_000;
const MIN_PAYOUT = 500_000;
const PAGE_SIZE = 20;

const FILTER_TABS: { label: string; types: WalletTxType[] | null }[] = [
  { label: 'Tất cả', types: null },
  { label: 'Nạp tiền', types: ['TOPUP'] },
  { label: 'Thanh toán', types: ['DEBIT', 'FREEZE', 'FORFEIT'] },
  { label: 'Hoàn tiền', types: ['REFUND', 'UNFREEZE', 'CREDIT'] },
  { label: 'Rút tiền', types: ['PAYOUT'] },
];

const TOPUP_PRESETS = [50_000, 100_000, 200_000, 500_000];

function TopupModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const topup = useTopup();

  const handleSubmit = async () => {
    const n = parseInt(amount.replace(/\D/g, ''), 10);
    if (!n || n < MIN_TOPUP) return;
    const result = await topup.mutateAsync({
      amount: n,
      gateway: 'PAYOS',
      returnUrl: `${window.location.origin}/payment/topup/return`,
    });
    window.location.href = result.redirectUrl;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-base font-semibold" style={{ color: '#0f1729' }}>Nạp tiền vào ví</h3>
        <p className="mb-4 text-xs" style={{ color: '#8694ad' }}>Thanh toán qua PayOS — hỗ trợ chuyển khoản, ATM, VISA/Master.</p>

        <div className="mb-3 grid grid-cols-4 gap-2">
          {TOPUP_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className="rounded-lg border py-2 text-xs font-semibold transition hover:border-[#2a7bd9] hover:text-[#2a7bd9]"
              style={{
                borderColor: amount === String(preset) ? '#2a7bd9' : '#d0dce8',
                color: amount === String(preset) ? '#2a7bd9' : '#5a6b85',
                background: amount === String(preset) ? '#eff6ff' : 'white',
              }}
            >
              {(preset / 1000).toLocaleString('vi-VN')}k
            </button>
          ))}
        </div>

        <label className="mb-1.5 block text-xs font-medium" style={{ color: '#5a6b85' }}>Hoặc nhập số tiền (VNĐ)</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Nhập số tiền..."
          value={amount ? parseInt(amount, 10).toLocaleString('vi-VN') : ''}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
          style={{ borderColor: '#d0dce8' }}
        />
        <p className="mt-1 text-xs" style={{ color: '#8694ad' }}>Tối thiểu {MIN_TOPUP.toLocaleString('vi-VN')} VNĐ</p>

        {topup.isError && (
          <p className="mt-2 text-xs text-red-500">{(topup.error as Error)?.message ?? 'Đã xảy ra lỗi'}</p>
        )}
        <div className="mt-5 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Huỷ</Button>
          <Button
            className="flex-1"
            disabled={topup.isPending || !amount || parseInt(amount, 10) < MIN_TOPUP}
            onClick={handleSubmit}
          >
            {topup.isPending ? 'Đang xử lý…' : 'Nạp qua PayOS'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PayoutModal({ maxAmount, onClose }: { maxAmount: number; onClose: () => void }) {
  const [form, setForm] = useState<PayoutRequest>({
    amount: 0,
    bankName: '',
    bankAccount: '',
    accountName: '',
    note: '',
  });
  const payout = useRequestPayout();

  const handleSubmit = async () => {
    await payout.mutateAsync(form);
    onClose();
  };

  const set = (k: keyof PayoutRequest, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid = form.amount >= MIN_PAYOUT && form.amount <= maxAmount
    && form.bankName && form.bankAccount && form.accountName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-base font-semibold" style={{ color: '#0f1729' }}>Rút tiền về ngân hàng</h3>
        <p className="mb-4 text-xs" style={{ color: '#8694ad' }}>Admin sẽ xử lý trong 1–3 ngày làm việc.</p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: '#5a6b85' }}>Số tiền (VNĐ)</label>
            <input
              type="number"
              min={MIN_PAYOUT}
              max={maxAmount}
              value={form.amount || ''}
              onChange={(e) => set('amount', parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
              style={{ borderColor: '#d0dce8' }}
            />
            <p className="mt-0.5 text-xs" style={{ color: '#8694ad' }}>
              Tối thiểu {MIN_PAYOUT.toLocaleString('vi-VN')} · Số dư: {maxAmount.toLocaleString('vi-VN')} VNĐ
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: '#5a6b85' }}>Ngân hàng</label>
            <input
              type="text"
              placeholder="VD: VCB, TCB, MB..."
              value={form.bankName}
              onChange={(e) => set('bankName', e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
              style={{ borderColor: '#d0dce8' }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: '#5a6b85' }}>Số tài khoản</label>
            <input
              type="text"
              value={form.bankAccount}
              onChange={(e) => set('bankAccount', e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
              style={{ borderColor: '#d0dce8' }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: '#5a6b85' }}>Tên chủ tài khoản</label>
            <input
              type="text"
              value={form.accountName}
              onChange={(e) => set('accountName', e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
              style={{ borderColor: '#d0dce8' }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: '#5a6b85' }}>Ghi chú (tuỳ chọn)</label>
            <input
              type="text"
              placeholder="Lý do rút tiền..."
              value={form.note ?? ''}
              onChange={(e) => set('note', e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
              style={{ borderColor: '#d0dce8' }}
            />
          </div>
        </div>
        {payout.isError && (
          <p className="mt-2 text-xs text-red-500">{(payout.error as Error)?.message ?? 'Đã xảy ra lỗi'}</p>
        )}
        {payout.isSuccess && (
          <p className="mt-2 text-xs" style={{ color: '#15803d' }}>Yêu cầu rút tiền đã được ghi nhận!</p>
        )}
        <div className="mt-5 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Huỷ</Button>
          <Button className="flex-1" disabled={!valid || payout.isPending} onClick={handleSubmit}>
            {payout.isPending ? 'Đang xử lý…' : 'Gửi yêu cầu'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [activeFilter, setActiveFilter] = useState(0);
  const { data: txResult, isLoading: txLoading } = useWalletTransactions(1, limit);
  const [showTopup, setShowTopup] = useState(false);
  const [showPayout, setShowPayout] = useState(false);

  const walletSummary = wallet ?? { availableBalance: 0, frozenBalance: 0, pendingBalance: 0, updatedAt: new Date().toISOString() };

  const filterTypes = FILTER_TABS[activeFilter].types;
  const allTx = txResult?.items ?? txResult?.data ?? [];
  const filteredTx = filterTypes
    ? allTx.filter((tx) => filterTypes.includes(tx.type))
    : allTx;

  const totalCount = txResult?.total ?? 0;
  const hasMore = allTx.length < totalCount;

  return (
    <>
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">Ví FlexTrip</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Quản lý số dư, nạp tiền và theo dõi lịch sử giao dịch của bạn.
        </p>
      </div>

      {walletLoading ? (
        <div className="h-52 animate-pulse rounded-3xl bg-[#e2e8f3]" />
      ) : (
        <WalletBalanceCard
          summary={walletSummary}
          onTopup={() => setShowTopup(true)}
          onPayout={() => setShowPayout(true)}
        />
      )}

      {/* Balance breakdown */}
      {(walletSummary.frozenBalance > 0 || walletSummary.pendingBalance > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4" style={{ borderColor: '#DCEFFB' }}>
            <p className="text-xs font-medium" style={{ color: '#8694ad' }}>Số dư khả dụng</p>
            <p className="mt-1 text-lg font-bold" style={{ color: '#0f1729' }}>
              {walletSummary.availableBalance.toLocaleString('vi-VN')}₫
            </p>
          </div>
          {walletSummary.frozenBalance > 0 && (
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: '#DCEFFB' }}>
              <p className="text-xs font-medium" style={{ color: '#8694ad' }}>Đang giữ cọc</p>
              <p className="mt-1 text-lg font-bold" style={{ color: '#f59e0b' }}>
                {walletSummary.frozenBalance.toLocaleString('vi-VN')}₫
              </p>
            </div>
          )}
          {walletSummary.pendingBalance > 0 && (
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: '#DCEFFB' }}>
              <p className="text-xs font-medium" style={{ color: '#8694ad' }}>Đang xử lý</p>
              <p className="mt-1 text-lg font-bold" style={{ color: '#8694ad' }}>
                {walletSummary.pendingBalance.toLocaleString('vi-VN')}₫
              </p>
            </div>
          )}
        </div>
      )}

      {/* Transaction history */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-bold text-foreground">Lịch sử giao dịch</h2>
          {totalCount > 0 && (
            <span className="text-xs" style={{ color: '#8694ad' }}>{totalCount} giao dịch</span>
          )}
        </div>

        {/* Filter tabs */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab, i) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setActiveFilter(i)}
              className="shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition"
              style={{
                background: activeFilter === i ? '#2a7bd9' : '#f6fbfe',
                color: activeFilter === i ? '#fff' : '#5a6b85',
                border: `1px solid ${activeFilter === i ? '#2a7bd9' : '#DCEFFB'}`,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {txLoading ? (
            <div className="space-y-px">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3.5 px-4 py-4">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-[#e2e8f3]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-32 animate-pulse rounded bg-[#e2e8f3]" />
                    <div className="h-3 w-20 animate-pulse rounded bg-[#e2e8f3]" />
                  </div>
                  <div className="h-4 w-20 animate-pulse rounded bg-[#e2e8f3]" />
                </div>
              ))}
            </div>
          ) : filteredTx.length ? (
            <>
              {filteredTx.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
              {hasMore && filterTypes === null && (
                <div className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + PAGE_SIZE)}
                    className="text-xs font-semibold"
                    style={{ color: '#2a7bd9' }}
                  >
                    Xem thêm {Math.min(PAGE_SIZE, totalCount - allTx.length)} giao dịch
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: '#f6fbfe' }}>
                <svg className="h-6 w-6" style={{ color: '#8694ad' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: '#0f1729' }}>Chưa có giao dịch</p>
              <p className="mt-1 text-xs" style={{ color: '#8694ad' }}>
                {activeFilter === 0 ? 'Nạp tiền để bắt đầu sử dụng ví FlexTrip.' : 'Không có giao dịch thuộc loại này.'}
              </p>
              {activeFilter === 0 && (
                <button
                  type="button"
                  onClick={() => setShowTopup(true)}
                  className="mt-4 rounded-full px-5 py-2 text-xs font-semibold text-white"
                  style={{ background: '#2a7bd9' }}
                >
                  Nạp tiền ngay
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {showTopup && <TopupModal onClose={() => setShowTopup(false)} />}
      {showPayout && wallet && (
        <PayoutModal maxAmount={wallet.availableBalance} onClose={() => setShowPayout(false)} />
      )}
    </>
  );
}
