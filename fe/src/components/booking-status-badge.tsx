import type { BookingStatus } from '@/types/booking';
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_COLOR } from '@/types/booking';

interface BookingStatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

export function BookingStatusBadge({ status, className = '' }: BookingStatusBadgeProps) {
  const colors = BOOKING_STATUS_COLOR[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${className}`}
      style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors.text }} />
      {BOOKING_STATUS_LABEL[status]}
    </span>
  );
}
