export type PaymentMethodBrand = 'visa' | 'mastercard' | 'momo' | 'zalopay';

export interface PaymentMethod {
  id: string;
  brand: PaymentMethodBrand;
  label: string;
  detail: string;
  isDefault: boolean;
}

export type WalletTransactionStatus = 'success' | 'processing';

export interface WalletTransaction {
  id: string;
  description: string;
  createdAt: string;
  amount: number;
  status: WalletTransactionStatus;
}

export interface WalletSummary {
  balance: number;
  updatedAt: string;
}
