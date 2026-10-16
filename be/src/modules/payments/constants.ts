export const PAYMENT_QUEUE = 'payment';

export const PaymentJob = {
  COMMISSION_SPLIT: 'commission-split',
  DEPOSIT_RELEASE: 'deposit-release',
  AUTO_REFUND: 'auto-refund',
  PAYOUT_REMINDER: 'payout-reminder',
} as const;

export const COMMISSION_RATES = {
  PLATFORM_BASE: 0.08,
  STAFF_SHARE: 0.02,
  PLATFORM_NO_STAFF: 0.10,
  PROVIDER_SHARE: 0.90,
} as const;

// 72 hours in ms — deposit held after booking COMPLETED before releasing to traveler
export const DEPOSIT_HOLD_MS = 72 * 60 * 60 * 1000;
