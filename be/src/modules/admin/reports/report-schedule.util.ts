import { ReportFrequency } from '@prisma/client';

const HOUR = 3600_000;
const DAY = 24 * HOUR;
// Vietnam has no DST, so wall-clock time is a fixed +7h shift.
const VN_OFFSET = 7 * HOUR;
const RUN_HOUR_VN = 8;

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Weekly reports go out Monday 08:00 (VN), monthly reports on the 1st at 08:00 (VN). */
export function nextRunAfter(frequency: ReportFrequency, after: Date): Date {
  const vn = new Date(after.getTime() + VN_OFFSET);
  let candidate: Date;
  if (frequency === ReportFrequency.WEEKLY) {
    const daysToMonday = (8 - vn.getUTCDay()) % 7;
    candidate = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() + daysToMonday, RUN_HOUR_VN));
    if (candidate <= vn) candidate = new Date(candidate.getTime() + 7 * DAY);
  } else {
    candidate = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), 1, RUN_HOUR_VN));
    if (candidate <= vn) candidate = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth() + 1, 1, RUN_HOUR_VN));
  }
  return new Date(candidate.getTime() - VN_OFFSET);
}

/** Inclusive VN calendar days covered by the report sent at `runAt`: last 7 full days, or the previous month. */
export function reportPeriod(frequency: ReportFrequency, runAt: Date): { from: string; to: string } {
  const vn = new Date(runAt.getTime() + VN_OFFSET);
  const today = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate());
  if (frequency === ReportFrequency.WEEKLY) {
    return { from: isoDay(new Date(today - 7 * DAY)), to: isoDay(new Date(today - DAY)) };
  }
  const firstOfThisMonth = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), 1);
  return {
    from: isoDay(new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth() - 1, 1))),
    to: isoDay(new Date(firstOfThisMonth - DAY)),
  };
}
