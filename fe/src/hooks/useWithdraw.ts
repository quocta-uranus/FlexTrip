import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { withdrawApi, type RequestPayoutPayload } from '@/lib/api/withdraw';

export function useWithdrawRequests(status?: string) {
  return useQuery({
    queryKey: ['admin-withdraw-requests', status],
    queryFn: () => withdrawApi.listWithdrawRequests(status),
    staleTime: 60_000,
  });
}

export function usePlatformSummary() {
  return useQuery({
    queryKey: ['admin-platform-summary'],
    queryFn: () => withdrawApi.platformSummary(),
    staleTime: 30_000,
  });
}

export function useProcessWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, transferRef, adminNote }: {
      id: string;
      action: 'approve' | 'reject';
      transferRef?: string;
      adminNote?: string;
    }) => withdrawApi.processWithdraw(id, action, transferRef, adminNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-withdraw-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-platform-summary'] });
    },
  });
}

export function useRequestPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RequestPayoutPayload) => withdrawApi.requestPayout(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet-balance'] });
      qc.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
  });
}
