import { api } from './client';
import type { InitiatePaymentRequest, InitiatePaymentResult, TopupRequest, TopupResult, PayoutRequest, PayoutResult, DepositRecommendation } from '@/types/payment';
import type { WalletSummary, WalletTransactionsResult } from '@/types/wallet';

export const paymentsApi = {
  initiatePayment: (bookingId: string, dto: InitiatePaymentRequest): Promise<InitiatePaymentResult> =>
    api.post(`/payments/bookings/${bookingId}/initiate`, dto),

  // Re-checks with PayOS in case the webhook could not reach the BE (e.g. localhost)
  confirmTopupReturn: (orderCode: string): Promise<{ status: string; amount: number; availableBalance: number }> =>
    api.post('/payments/wallet/topup/confirm', { orderCode }),

  payRental: (bookingId: string, dto: InitiatePaymentRequest): Promise<InitiatePaymentResult> =>
    api.post(`/payments/bookings/${bookingId}/pay-rental`, dto),

  getWallet: (): Promise<WalletSummary> =>
    api.get('/payments/wallet'),

  getTransactions: (page = 1, limit = 20): Promise<WalletTransactionsResult> =>
    api.get(`/payments/wallet/transactions?page=${page}&limit=${limit}`),

  topup: (dto: TopupRequest): Promise<TopupResult> =>
    api.post('/payments/wallet/topup', dto),

  requestPayout: (dto: PayoutRequest): Promise<PayoutResult> =>
    api.post('/payments/wallet/payout', dto),

  // Re-checks with PayOS in case the webhook could not reach the BE (e.g. localhost)
  confirmPayosReturn: (orderCode: string): Promise<{ bookingId: string; status: string }> =>
    api.post('/payments/payos/confirm', { orderCode }),

  getInvoice: (bookingId: string): Promise<import('@/types/invoice').Invoice> =>
    api.get(`/payments/invoices/${bookingId}`),

  getDepositRecommendation: (listingId: string): Promise<DepositRecommendation> =>
    api.get(`/payments/listings/${listingId}/deposit-recommendation`),
};
