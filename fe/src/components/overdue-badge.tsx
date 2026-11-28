import { AlertTriangle } from 'lucide-react';
import { getOverdue, type OverdueInput } from '@/lib/overdue';
import { cn } from 'cn';

export function OverdueBadge({ booking, className }: { booking: OverdueInput; className?: string }) {
  const overdue = getOverdue(booking);
  if (!overdue) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600',
        className,
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      {overdue.label}
    </span>
  );
}
