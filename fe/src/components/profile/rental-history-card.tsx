import { CalendarDays, MapPin } from 'lucide-react';
import { RentalStatusBadge } from '@/components/profile/rental-status-badge';
import { formatDateRange, formatVndAbs } from '@/lib/format';
import type { RentalHistoryItem } from '@/types/rental-history';

const THUMBNAIL_GRADIENTS = [
  'from-sec-300 to-sec-600',
  'from-brand-from to-brand-to',
  'from-sec-200 to-sec-300',
  'from-primary to-brand-from',
  'from-sec-100 to-sec-200',
];

export function RentalHistoryCard({ item, index }: { item: RentalHistoryItem; index: number }) {
  const gradient = THUMBNAIL_GRADIENTS[index % THUMBNAIL_GRADIENTS.length];

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className={`flex h-40 items-center justify-center bg-gradient-to-br ${gradient}`}>
        <MapPin className="size-10 text-white/90" strokeWidth={1.6} />
      </div>
      <div className="flex flex-col gap-2 p-4">
        <p className="font-heading text-[15px] font-semibold text-foreground">{item.title}</p>
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <MapPin className="size-3.5" strokeWidth={1.8} />
          <span>{item.location}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <CalendarDays className="size-3.5" strokeWidth={1.8} />
          <span>{formatDateRange(item.startDate, item.endDate)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[15px] font-bold text-foreground">{formatVndAbs(item.totalPrice)}</span>
          <RentalStatusBadge status={item.status} />
        </div>
      </div>
    </div>
  );
}
