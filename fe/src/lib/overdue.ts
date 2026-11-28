export interface OverdueInput {
  status: string;
  startDate: string;
  endDate: string;
}

export interface Overdue {
  kind: 'handover' | 'return';
  days: number;
  label: string;
}

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

// Rental dates are stored as 00:00 UTC of the chosen day, while "today" is the Vietnamese calendar day
export function getOverdue({ status, startDate, endDate }: OverdueInput, now: Date = new Date()): Overdue | null {
  const kind = status === 'CONFIRMED' ? 'handover' : status === 'IN_PROGRESS' ? 'return' : null;
  if (!kind) return null;

  const today = Date.parse(new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10));
  const due = Date.parse((kind === 'handover' ? startDate : endDate).slice(0, 10));
  const days = Math.round((today - due) / DAY_MS);
  if (days <= 0) return null;

  return { kind, days, label: `Quá hạn ${kind === 'handover' ? 'bàn giao' : 'trả'} ${days} ngày` };
}
