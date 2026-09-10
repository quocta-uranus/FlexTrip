import { Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTime, formatVndAbs } from '@/lib/format';
import type { WalletSummary } from '@/types/wallet';

export function WalletBalanceCard({ summary }: { summary: WalletSummary }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-from to-brand-to p-8 text-white shadow-[0_12px_32px_-12px_rgba(42,123,217,0.45)]">
      <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute right-20 -bottom-24 size-40 rounded-full bg-white/[0.08]" />

      <div className="relative flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/85">Số dư ví FlexTrip</span>
        <span className="flex size-11 items-center justify-center rounded-full bg-white/20">
          <Wallet className="size-5" strokeWidth={1.8} />
        </span>
      </div>

      <p className="relative mt-4 font-heading text-4xl font-extrabold tracking-tight">{formatVndAbs(summary.balance)}</p>
      <p className="relative mt-1.5 text-sm text-white/85">Cập nhật lúc {formatDateTime(summary.updatedAt)}</p>

      <div className="relative mt-6 flex gap-3">
        <Button className="rounded-full bg-white px-5 h-10 text-sec-600 hover:bg-white/90">
          <Plus className="size-4" strokeWidth={2.2} />
          Nạp tiền
        </Button>
        <Button variant="outline" className="rounded-full h-10 px-5 border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white">
          Rút tiền
        </Button>
      </div>
    </div>
  );
}
