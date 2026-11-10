import { useQuery } from '@tanstack/react-query';
import { paymentAiApi } from '@/lib/api/payment-ai';

export function useDepositRecommendation(listingId: string, enabled = true) {
  return useQuery({
    queryKey: ['deposit-recommendation', listingId],
    queryFn: () => paymentAiApi.getDepositRecommendation(listingId),
    enabled: !!listingId && enabled,
    staleTime: 5 * 60_000,
  });
}

export function useDisputeAssist(disputeId: string, enabled = true) {
  return useQuery({
    queryKey: ['dispute-assist', disputeId],
    queryFn: () => paymentAiApi.getDisputeAssist(disputeId),
    enabled: !!disputeId && enabled,
    staleTime: 60_000,
  });
}

export function useCashflowForecast(days: 30 | 60 | 90 = 30) {
  return useQuery({
    queryKey: ['cashflow-forecast', days],
    queryFn: () => paymentAiApi.getCashflowForecast(days),
    staleTime: 15 * 60_000,
  });
}
