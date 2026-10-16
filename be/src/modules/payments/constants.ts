export const PAYMENT_QUEUE = 'payment';

export const PaymentJob = {
  COMMISSION_SPLIT: 'commission-split',
  AUTO_REFUND: 'auto-refund',
  PAYOUT_REMINDER: 'payout-reminder',
} as const;

export const COMMISSION_RATES = {
  PLATFORM_BASE: 0.08,
  STAFF_SHARE: 0.02,
  PLATFORM_NO_STAFF: 0.10,
  PROVIDER_SHARE: 0.90,
} as const;
