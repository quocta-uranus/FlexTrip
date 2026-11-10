export type PaymentGateway = 'PAYOS' | 'WALLET';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export interface InitiatePaymentRequest {
  gateway: PaymentGateway;
  returnUrl?: string;
  cancelUrl?: string;
}

export type InitiatePaymentResult =
  | { gateway: 'PAYOS'; redirectUrl: string; orderCode: string }
  | { gateway: 'WALLET'; status: 'PAID'; orderCode: string };

export interface TopupRequest {
  amount: number;
  gateway: PaymentGateway;
  returnUrl?: string;
}

export interface TopupResult {
  redirectUrl: string;
  orderCode: string;
}

export interface PayoutRequest {
  amount: number;
  bankName: string;
  bankAccount: string;
  accountName: string;
  note?: string;
}

export interface PayoutResult {
  requestId: string;
  frozen: number;
  message: string;
}

export interface DepositRecommendation {
  recommendedRate: number;  // 0.10 – 0.60
  minRate: number;
  maxRate: number;
  reasoning: string;
  confidence: number;
}
