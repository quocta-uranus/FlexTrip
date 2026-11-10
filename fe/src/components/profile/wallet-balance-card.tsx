import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import type { WalletSummary } from '@/types/wallet';

type Props = {
  summary: WalletSummary;
  onTopup?: () => void;
  onPayout?: () => void;
};

export function WalletBalanceCard({ summary, onTopup, onPayout }: Props) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl p-8 text-white"
      style={{
        background: 'linear-gradient(135deg, #1a6dd4 0%, #2a7bd9 45%, #1e90c8 100%)',
        boxShadow: '0 12px 32px -8px rgba(42,123,217,0.45)',
      }}
    >
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-8 -top-12 h-52 w-52 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="pointer-events-none absolute -bottom-16 right-24 h-36 w-36 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="pointer-events-none absolute -left-6 bottom-4 h-24 w-24 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />

      <div className="relative">
        {/* Label row */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Ví FlexTrip
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }}>
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
        </div>

        {/* Balance */}
        <p className="mt-5 text-4xl font-extrabold tracking-tight text-white">
          {summary.availableBalance.toLocaleString('vi-VN')}
          <span className="ml-1 text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>₫</span>
        </p>
        <p className="mt-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Số dư khả dụng</p>

        {/* Sub-balances */}
        {(summary.frozenBalance > 0 || summary.pendingBalance > 0) && (
          <div className="mt-3 flex gap-5 text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {summary.frozenBalance > 0 && (
              <span>🔒 Cọc: {summary.frozenBalance.toLocaleString('vi-VN')}₫</span>
            )}
            {summary.pendingBalance > 0 && (
              <span>⏳ Đang xử lý: {summary.pendingBalance.toLocaleString('vi-VN')}₫</span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-7 flex gap-3">
          <button
            onClick={onTopup}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
            style={{ background: 'rgba(255,255,255,0.95)', color: '#1a6dd4' }}
          >
            <ArrowDownToLine className="h-4 w-4" strokeWidth={2.2} />
            Nạp tiền
          </button>
          <button
            onClick={onPayout}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}
          >
            <ArrowUpFromLine className="h-4 w-4" strokeWidth={2.2} />
            Rút tiền
          </button>
        </div>
      </div>
    </div>
  );
}
