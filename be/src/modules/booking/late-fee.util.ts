import { rentalDaysBetween } from './booking-price.util';
import { daysPast } from './overdue.util';

/** Suggested compensation for a late return: days late × the daily price the traveler agreed to. */
export function suggestLateFee(booking: {
  startDate: Date;
  endDate: Date;
  totalPrice: unknown;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
}) {
  const lateDays = booking.checkedInAt ? daysPast(booking.endDate, booking.checkedOutAt ?? new Date()) : 0;
  if (lateDays === 0) return null;
  const dailyPrice = Math.round(Number(booking.totalPrice) / rentalDaysBetween(booking.startDate, booking.endDate));
  return { lateDays, dailyPrice, amount: lateDays * dailyPrice, returned: !!booking.checkedOutAt };
}
