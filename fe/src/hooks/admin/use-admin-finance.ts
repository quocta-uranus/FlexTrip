import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { PaymentStatus, PayoutStatus, Reconciliation } from '@/types/admin';

export interface Period { from: string; to: string }

export function useFinanceSummary(p: Period) {
  return useQuery({ queryKey: ['admin', 'finance', 'summary', p], queryFn: () => adminApi.finance.summary({ ...p }) });
}
export function useTransactions(f: Period & { status: PaymentStatus | 'ALL'; page: number }) {
  return useQuery({ queryKey: ['admin', 'finance', 'transactions', f], queryFn: () => adminApi.finance.transactions({ ...f, limit: 20 }), placeholderData: keepPreviousData });
}
export function usePayouts(f: { status: PayoutStatus | 'ALL'; reconciliation: Reconciliation | 'ALL'; page: number }) {
  return useQuery({ queryKey: ['admin', 'finance', 'payouts', f], queryFn: () => adminApi.finance.payouts({ ...f, limit: 20 }), placeholderData: keepPreviousData });
}
export function useGeneratePayouts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ periodStart, periodEnd }: { periodStart: string; periodEnd: string }) => adminApi.finance.generate(periodStart, periodEnd),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance'] }),
  });
}
export function useUpdatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: PayoutStatus; actualPaid?: number; transferRef?: string; note?: string }) =>
      adminApi.finance.updatePayout(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance'] }),
  });
}
