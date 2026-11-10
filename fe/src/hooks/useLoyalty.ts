import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loyaltyApi } from '@/lib/api/loyalty';

export function useLoyalty() {
  return useQuery({ queryKey: ['loyalty', 'me'], queryFn: loyaltyApi.me });
}

export function useLoyaltyRewards() {
  return useQuery({ queryKey: ['loyalty', 'rewards'], queryFn: loyaltyApi.rewards });
}

export function useLoyaltyTransactions(page: number) {
  return useQuery({
    queryKey: ['loyalty', 'transactions', page],
    queryFn: () => loyaltyApi.transactions({ page, limit: 10 }),
    placeholderData: keepPreviousData,
  });
}

export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: loyaltyApi.redeem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    },
  });
}
