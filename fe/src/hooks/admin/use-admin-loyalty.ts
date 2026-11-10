import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminLoyaltyApi } from '@/lib/api/loyalty';
import type { RewardInput } from '@/lib/validators/loyalty.schema';

export function useLoyaltyStats() {
  return useQuery({ queryKey: ['admin', 'loyalty', 'stats'], queryFn: adminLoyaltyApi.stats });
}

export function useAdminRewards() {
  return useQuery({ queryKey: ['admin', 'loyalty', 'rewards'], queryFn: adminLoyaltyApi.rewards });
}

export function useSaveReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string } & Partial<RewardInput> & { isActive?: boolean }) =>
      id ? adminLoyaltyApi.updateReward(id, body) : adminLoyaltyApi.createReward(body as RewardInput),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'loyalty'] }),
  });
}
