import { BookingStatus, Prisma } from '@prisma/client';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

// Rental dates are stored as 00:00 UTC of the chosen day, while "today" is the Vietnamese calendar day
export function vietnamToday(now: Date = new Date()): Date {
  return new Date(new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10));
}

export function daysPast(due: Date, now: Date = new Date()): number {
  return Math.max(0, Math.round((vietnamToday(now).getTime() - due.getTime()) / DAY_MS));
}

export function overdueWhere(now: Date = new Date()): Prisma.BookingWhereInput {
  const today = vietnamToday(now);
  return {
    OR: [
      { status: BookingStatus.CONFIRMED, startDate: { lt: today } },
      { status: BookingStatus.IN_PROGRESS, endDate: { lt: today } },
    ],
  };
}
