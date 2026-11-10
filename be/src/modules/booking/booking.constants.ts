export const BOOKING_QUEUE = 'bookings';

export const BookingJob = {
  HOLD_EXPIRY: 'hold-expiry',
  AUTO_START: 'auto-start',
  AUTO_COMPLETE: 'auto-complete',
  REMINDER: 'reminder',
  CONTRACT_SIGN_REMINDER: 'contract-sign-reminder',
  ID_DOC_PURGE: 'id-doc-purge',
  BALANCE_EXPIRY: 'balance-expiry',
} as const;

export const HOLD_MINUTES = 15;
export const REMINDER_DAYS_BEFORE = 3;

// Traveler có 24h sau khi provider duyệt để trả nốt tiền thuê
export const BALANCE_DUE_MS = 24 * 60 * 60 * 1000;

// Once admin assigns a staff member, handover/return belong to them, not the provider
export const STAFF_ASSIGNED_MESSAGE =
  'Đơn này đã được giao cho nhân viên vận hành, nhân viên sẽ thực hiện bàn giao và nhận lại thiết bị.';

export const RENTAL_UNPAID_MESSAGE = 'Khách chưa thanh toán tiền thuê còn lại nên chưa thể giao hàng';

export function isRentalSettled(payment: { rentalAmount: unknown; rentalPaidAt: Date | null }): boolean {
  return !!payment.rentalPaidAt || Number(payment.rentalAmount) <= 0;
}
