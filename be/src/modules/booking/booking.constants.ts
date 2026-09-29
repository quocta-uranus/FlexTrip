export const BOOKING_QUEUE = 'bookings';

export const BookingJob = {
  HOLD_EXPIRY: 'hold-expiry',
  AUTO_START: 'auto-start',
  REMINDER: 'reminder',
} as const;

export const HOLD_MINUTES = 15;
export const REMINDER_DAYS_BEFORE = 3;
