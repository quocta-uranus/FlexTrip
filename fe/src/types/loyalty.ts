import type { VoucherType } from '@/types/voucher';

export interface LoyaltySummary {
  balance: number;
  lifetimePoints: number;
  pointsPerOrder: number;
  nextReward: { id: string; name: string; pointsCost: number; pointsNeeded: number } | null;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  pointsCost: number;
  voucherType: VoucherType;
  voucherValue: number;
  maxDiscount: number | null;
  validDays: number;
}

export type LoyaltyTxType = 'EARN' | 'REDEEM' | 'EXPIRE' | 'ADJUST';

export interface LoyaltyTransaction {
  id: string;
  type: LoyaltyTxType;
  points: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
}

export interface RedeemResult {
  balance: number;
  voucher: { id: string; code: string; name: string; endsAt: string };
}

export interface AdminLoyaltyReward {
  id: string;
  name: string;
  pointsCost: number;
  voucherType: VoucherType;
  voucherValue: string;
  maxDiscount: string | null;
  validDays: number;
  isActive: boolean;
  sortOrder: number;
}

export interface LoyaltyStats {
  pointsIssued: number;
  pointsRedeemed: number;
  pointsOutstanding: number;
  accounts: number;
  vouchersIssued: number;
}
