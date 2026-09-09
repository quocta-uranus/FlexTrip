import { Badge } from '@/components/ui/badge';
import { cn } from 'cn';
import type { RentalStatus } from '@/types/rental-history';

const STATUS_CONFIG: Record<RentalStatus, { label: string; className: string }> = {
  completed: { label: 'Hoàn thành', className: 'bg-sec-100 text-sec-600' },
  upcoming: { label: 'Sắp diễn ra', className: 'bg-sec-50 text-sec-600 ring-1 ring-inset ring-sec-200' },
  ongoing: { label: 'Đang diễn ra', className: 'bg-sec-600 text-white' },
  cancelled: { label: 'Đã huỷ', className: 'bg-slate-bg text-slate-fg' },
};

export function RentalStatusBadge({ status }: { status: RentalStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge className={cn('rounded-full px-2.5', config.className)}>{config.label}</Badge>;
}
