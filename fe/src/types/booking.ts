import type { Listing } from './listing';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'REFUNDING'
  | 'REFUNDED';

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã huỷ',
  COMPLETED: 'Hoàn thành',
  REFUNDING: 'Đang hoàn tiền',
  REFUNDED: 'Đã hoàn tiền',
};

export const BOOKING_STATUS_COLOR: Record<
  BookingStatus,
  { bg: string; text: string; border: string }
> = {
  PENDING: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  CONFIRMED: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  CANCELLED: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  COMPLETED: { bg: 'rgba(42,123,217,0.08)', text: '#1e5aa8', border: 'rgba(42,123,217,0.2)' },
  REFUNDING: { bg: '#fefce8', text: '#a16207', border: '#fef08a' },
  REFUNDED: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
};

export interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: BookingStatus;
  notes?: string | null;
  travelerId: string;
  listingId: string;
  createdAt: string;
  updatedAt: string;
  listing?: Listing;
  payment?: {
    id: string;
    amount: number;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
    method: string;
    transactionId?: string | null;
  } | null;
  contract?: {
    id: string;
    status: 'PENDING' | 'SIGNED' | 'ACTIVE' | 'CLOSED' | 'DISPUTED';
    terms: string;
    signedAt?: string | null;
  } | null;
}

export interface CreateBookingPayload {
  listingId: string;
  startDate: string;
  endDate: string;
  notes?: string;
  paymentMethodId?: string;
}
