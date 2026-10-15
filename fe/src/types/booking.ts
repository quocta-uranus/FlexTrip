import type { Listing } from './listing';
import type { ContractStatus } from './contract';

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_APPROVAL'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'REFUNDING'
  | 'REFUNDED';

export type DeliveryMethod = 'PICKUP' | 'DELIVERY';

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PENDING_APPROVAL: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  IN_PROGRESS: 'Đang thuê',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
  DISPUTED: 'Đang khiếu nại',
  REFUNDING: 'Đang hoàn tiền',
  REFUNDED: 'Đã hoàn tiền',
};

export const BOOKING_STATUS_COLOR: Record<
  BookingStatus,
  { bg: string; text: string; border: string }
> = {
  PENDING_PAYMENT: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  PENDING_APPROVAL: { bg: '#fefce8', text: '#a16207', border: '#fef08a' },
  CONFIRMED: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  IN_PROGRESS: { bg: 'rgba(42,123,217,0.08)', text: '#1e5aa8', border: 'rgba(42,123,217,0.2)' },
  COMPLETED: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  CANCELLED: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  DISPUTED: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
  REFUNDING: { bg: '#fefce8', text: '#a16207', border: '#fef08a' },
  REFUNDED: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
};

export interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  depositAmount?: number;
  quantity: number;
  deliveryMethod?: DeliveryMethod | null;
  deliveryAddress?: string | null;
  status: BookingStatus;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  holdExpiresAt?: string | null;
  travelerId: string;
  listingId: string;
  createdAt: string;
  updatedAt: string;
  listing?: Listing;
  traveler?: { id: string; name: string; avatarUrl?: string | null };
  assignedStaff?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    email: string;
    phone?: string | null;
    staffProfile?: {
      employeeCode: string;
      phone?: string | null;
      regions: string[];
    } | null;
  } | null;
  payment?: {
    id: string;
    amount: number;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
    method: string;
    transactionId?: string | null;
  } | null;
  contract?: {
    id: string;
    status: ContractStatus;
    travelerSignedAt?: string | null;
    providerSignedAt?: string | null;
  } | null;
}

export interface CreateBookingPayload {
  listingId: string;
  startDate: string;
  endDate: string;
  quantity?: number;
  deliveryMethod?: DeliveryMethod;
  deliveryAddress?: string;
}

export interface ConfirmPaymentPayload {
  method: string;
  transactionRef?: string;
}

export interface CartItem {
  id: string;
  listingId: string;
  startDate: string;
  endDate: string;
  quantity: number;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string | null;
  unitPrice: number;
  subtotal: number;
  depositAmount: number;
  rentalDays: number;
  isHoldValid: boolean;
  holdExpiresAt?: string | null;
  listing: Listing & { provider: { id: string; name: string; avatarUrl?: string | null } };
}

export interface Cart {
  id?: string;
  items: CartItem[];
  total: number;
  depositTotal: number;
}

export type ModifyRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface ModifyRequest {
  id: string;
  bookingId: string;
  requestedById: string;
  newStartDate: string;
  newEndDate: string;
  newQuantity?: number | null;
  reason?: string | null;
  status: ModifyRequestStatus;
  respondedAt?: string | null;
  createdAt: string;
  requestedBy: { id: string; name: string; avatarUrl?: string | null };
}
