import { ConflictException } from '@nestjs/common';

export const BOOKING_QUEUE = 'bookings';

export const BookingJob = {
  HOLD_EXPIRY: 'hold-expiry',
  AUTO_START: 'auto-start',
  AUTO_COMPLETE: 'auto-complete',
  REMINDER: 'reminder',
  CONTRACT_SIGN_REMINDER: 'contract-sign-reminder',
  ID_DOC_PURGE: 'id-doc-purge',
  BALANCE_EXPIRY: 'balance-expiry',
  APPROVAL_EXPIRY: 'approval-expiry',
} as const;

export const HOLD_MINUTES = 15;
export const REMINDER_DAYS_BEFORE = 3;

// Provider có 24h để duyệt hoặc từ chối đơn đã đặt cọc, quá hạn đơn tự huỷ và hoàn cọc
export const APPROVAL_WINDOW_MS = 24 * 60 * 60 * 1000;

// Traveler có 24h sau khi provider duyệt để trả nốt tiền thuê
export const BALANCE_DUE_MS = 24 * 60 * 60 * 1000;

// Once admin assigns a staff member, handover/return belong to them, not the provider
export const STAFF_ASSIGNED_MESSAGE =
  'Đơn này đã được giao cho nhân viên vận hành, nhân viên sẽ thực hiện bàn giao và nhận lại thiết bị.';

export const STAFF_REQUIRED_MESSAGE =
  'Đơn đang chờ Admin gán nhân viên vận hành. Nhân viên sẽ thực hiện bàn giao và nhận lại thiết bị.';

// Bàn giao, nhận lại và hoàn thành luôn do Staff thực hiện; Provider không được tự làm kể cả khi chưa gán Staff.
export function throwProviderHandoverBlocked(assignedStaffId: string | null | undefined): never {
  if (assignedStaffId) throw new ConflictException({ code: 'STAFF_ASSIGNED', message: STAFF_ASSIGNED_MESSAGE });
  throw new ConflictException({ code: 'STAFF_REQUIRED', message: STAFF_REQUIRED_MESSAGE });
}

export const RENTAL_UNPAID_MESSAGE = 'Khách chưa thanh toán tiền thuê còn lại nên chưa thể giao hàng';

export function isRentalSettled(payment: { rentalAmount: unknown; rentalPaidAt: Date | null }): boolean {
  return !!payment.rentalPaidAt || Number(payment.rentalAmount) <= 0;
}

// Ngày thuê lưu theo 00:00 UTC của ngày khách chọn, còn "hôm nay" phải tính theo giờ Việt Nam để 6 giờ sáng vẫn được bàn giao.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export function isBeforeRentalStart(startDate: Date, now: Date = new Date()): boolean {
  const today = new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
  return today < startDate.toISOString().slice(0, 10);
}
