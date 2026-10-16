import { ArrowDownLeft, ArrowUpRight, Lock, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from 'cn';
import { formatDateTime, formatVndAbs } from '@/lib/format';
import type { WalletTransaction, WalletTxType } from '@/types/wallet';

const TX_LABEL: Record<WalletTxType, string> = {
  CREDIT: 'Nhận tiền',
  DEBIT: 'Thanh toán',
  FREEZE: 'Giữ cọc',
  UNFREEZE: 'Hoàn cọc',
  FORFEIT: 'Mất cọc',
  PAYOUT: 'Rút tiền',
  TOPUP: 'Nạp ví',
  REFUND: 'Hoàn tiền',
};

const INCOMING_TYPES_SET = new Set<WalletTxType>(['CREDIT', 'UNFREEZE', 'TOPUP', 'REFUND']);

export function TransactionRow({ transaction }: { transaction: WalletTransaction }) {
  const isIncoming = INCOMING_TYPES_SET.has(transaction.type);
  const label = transaction.note ?? TX_LABEL[transaction.type] ?? transaction.type;

  const Icon = transaction.type === 'FREEZE' || transaction.type === 'FORFEIT'
    ? Lock
    : transaction.type === 'UNFREEZE'
    ? Unlock
    : isIncoming ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="flex items-center gap-3.5 px-4 py-4">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          isIncoming ? 'bg-sec-50 text-sec-600' : 'bg-slate-bg text-slate-fg',
        )}
      >
        <Icon className="size-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{formatDateTime(transaction.createdAt)}</p>
      </div>
      <span className={cn('text-sm font-bold', isIncoming ? 'text-sec-600' : 'text-muted-foreground')}>
        {isIncoming ? '+' : '-'}{formatVndAbs(transaction.amount)}
      </span>
      <Badge
        className={cn(
          transaction.status === 'COMPLETED'
            ? 'bg-secondary text-secondary-foreground'
            : transaction.status === 'FAILED'
            ? 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-200'
            : 'bg-sec-50 text-sec-300 ring-1 ring-inset ring-sec-200',
        )}
      >
        {transaction.status === 'COMPLETED' ? 'Thành công' : transaction.status === 'FAILED' ? 'Thất bại' : 'Đang xử lý'}
      </Badge>
    </div>
  );
}
