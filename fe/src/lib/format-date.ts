const pad = (n: number) => String(n).padStart(2, '0');

// dd/MM, the Vietnamese short date (Intl would produce "22-10" here).
export function formatShortDate(iso: string) {
  const date = new Date(iso);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}
