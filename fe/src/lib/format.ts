export function formatVnd(amount: number): string {
  const sign = amount < 0 ? '−' : amount > 0 ? '+' : '';
  return `${sign}${formatVndAbs(amount)}`;
}

export function formatVndAbs(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.abs(amount))} ₫`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

export function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: sameYear ? undefined : 'numeric',
  }).format(start);
  const endFmt = formatDate(endIso);
  return `${startFmt} – ${endFmt}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${date} · ${time}`;
}
