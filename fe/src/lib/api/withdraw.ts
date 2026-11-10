import { api } from './client';

export interface WithdrawRequest {
  id: string;
  user: { id: string; name: string; email: string; roles: { role: string }[] };
  amount: number;
  bankName: string;
  bankAccount: string;
  accountName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note: string | null;
  adminNote: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface PlatformSummary {
  escrowBalance: number;
  platformRevenue: number;
  pendingWithdrawalAmount: number;
  pendingWithdrawalCount: number;
}

export interface RequestPayoutPayload {
  amount: number;
  bankName: string;
  bankAccount: string;
  accountName: string;
  note?: string;
}

export const withdrawApi = {
  // Provider/Staff — request withdrawal
  requestPayout: (payload: RequestPayoutPayload): Promise<{ requestId: string; frozen: number; message: string }> =>
    api.post('/payments/wallet/payout', payload),

  // Admin
  listWithdrawRequests: (status?: string): Promise<{ items: WithdrawRequest[]; total: number }> =>
    api.get(`/admin/finance/withdraw-requests${status ? `?status=${status}` : ''}`),

  processWithdraw: (id: string, action: 'approve' | 'reject', transferRef?: string, adminNote?: string) =>
    api.patch(`/admin/finance/withdraw-requests/${id}`, { action, transferRef, adminNote }),

  platformSummary: (): Promise<PlatformSummary> =>
    api.get('/admin/finance/platform-summary'),
};
