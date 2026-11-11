export type VoucherType = 'PERCENT' | 'FIXED';
export type VoucherStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';
export type VoucherSource = 'ADMIN' | 'POINTS' | 'REFERRAL';
export type VoucherAudience = 'ALL' | 'NEW_USER' | 'PERSONAL';
export type RedemptionStatus = 'RESERVED' | 'APPLIED' | 'FORFEITED' | 'RELEASED';

export interface MyVoucher {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: VoucherType;
  value: number;
  maxDiscount: number | null;
  minOrderValue: number;
  category: string | null;
  audience: VoucherAudience;
  endsAt: string;
}

export interface VoucherHistoryItem {
  id: string;
  code: string;
  name: string;
  bookingId: string;
  discountAmount: number;
  status: RedemptionStatus;
  createdAt: string;
}

export interface MyVouchers {
  available: MyVoucher[];
  history: VoucherHistoryItem[];
}

export interface VoucherPreview {
  code: string;
  name: string;
  discountAmount: number;
  totalPrice: number;
  depositAmount: number;
  rentalAmount: number;
  payableRental: number;
}

export interface AdminVoucher {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: VoucherType;
  value: string;
  maxDiscount: string | null;
  minOrderValue: string;
  category: string | null;
  audience: VoucherAudience;
  source: VoucherSource;
  status: VoucherStatus;
  startsAt: string;
  endsAt: string;
  totalQuota: number | null;
  usedCount: number;
  perUserLimit: number;
  budgetId: string;
  budget: { id: string; name: string };
}

export interface AdminVoucherRedemption {
  id: string;
  status: RedemptionStatus;
  discountAmount: string;
  bookingId: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface PromoBudget {
  id: string;
  name: string;
  isActive: boolean;
  totalAmount: number;
  spentAmount: number;
  reservedAmount: number;
  remainingAmount: number;
  voucherCount: number;
  createdAt: string;
}

export const VOUCHER_STATUS_LABELS: Record<VoucherStatus, string> = {
  DRAFT: 'Nháp',
  ACTIVE: 'Đang chạy',
  PAUSED: 'Tạm dừng',
  EXPIRED: 'Hết hạn',
};

export const REDEMPTION_STATUS_LABELS: Record<RedemptionStatus, string> = {
  RESERVED: 'Đang giữ chỗ',
  APPLIED: 'Đã áp dụng',
  FORFEITED: 'Đã mất lượt',
  RELEASED: 'Đã hoàn lượt',
};

export function describeVoucher(v: Pick<MyVoucher, 'type' | 'value' | 'maxDiscount'>): string {
  if (v.type === 'FIXED') return `Giảm ${v.value.toLocaleString('vi-VN')} ₫`;
  const cap = v.maxDiscount ? `, tối đa ${v.maxDiscount.toLocaleString('vi-VN')} ₫` : '';
  return `Giảm ${v.value}%${cap}`;
}
