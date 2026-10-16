export type PaymentMethodBrand = 'visa' | 'mastercard' | 'momo' | 'zalopay';

export interface PaymentMethod {
  id: string;
  brand: PaymentMethodBrand;
  label: string;
  detail: string;
  isDefault: boolean;
}

export type WalletTxType = 'CREDIT' | 'DEBIT' | 'FREEZE' | 'UNFREEZE' | 'FORFEIT' | 'PAYOUT' | 'TOPUP' | 'REFUND' | 'COMMISSION_SPLIT';
export type WalletTxStatus = 'SETTLED' | 'COMPLETED' | 'PENDING' | 'FAILED';

export interface WalletTransaction {
  id: string;
  type: WalletTxType;
  amount: number;
  note?: string | null;
  refType?: string | null;
  refId?: string | null;
  status: WalletTxStatus;
  balanceAfter?: number | null;
  createdAt: string;
}

export interface WalletSummary {
  availableBalance: number;
  frozenBalance: number;
  pendingBalance: number;
  updatedAt?: string;
}

export interface WalletTransactionsResult {
  items: WalletTransaction[];
  data?: WalletTransaction[];
  total: number;
  page: number;
  limit: number;
}
