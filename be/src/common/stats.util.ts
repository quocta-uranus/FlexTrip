/** Percent change rounded to 1 decimal; null when previous is 0 but current is not (undefined growth). */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
