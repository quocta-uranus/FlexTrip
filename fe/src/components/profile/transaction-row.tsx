import { Minus, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from 'cn';
import { formatDateTime, formatVnd } from '@/lib/format';
import type { WalletTransaction } from '@/types/wallet';

export function TransactionRow({ transaction }: { transaction: WalletTransaction }) {
  const isIncoming = transaction.amount > 0;

  return (
    <div className="flex items-center gap-3.5 px-4 py-4">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          isIncoming ? 'bg-sec-50 text-sec-600' : 'bg-slate-bg text-slate-fg',
        )}
      >
        {isIncoming ? <Plus className="size-4" strokeWidth={2.4} /> : <Minus className="size-4" strokeWidth={2.4} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{transaction.description}</p>
        <p className="text-xs text-muted-foreground">{formatDateTime(transaction.createdAt)}</p>
      </div>
      <span className={cn('text-sm font-bold', isIncoming ? 'text-sec-600' : 'text-muted-foreground')}>
        {formatVnd(transaction.amount)}
      </span>
      <Badge
        className={cn(
          transaction.status === 'success'
            ? 'bg-secondary text-secondary-foreground'
            : 'bg-sec-50 text-sec-300 ring-1 ring-inset ring-sec-200',
        )}
      >
        {transaction.status === 'success' ? 'Thành công' : 'Đang xử lý'}
      </Badge>
    </div>
  );
}
