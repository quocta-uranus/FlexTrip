import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminIncentivesApi, incentivesApi } from '@/lib/api/incentives';

export function useProviderIncentive() {
  return useQuery({ queryKey: ['incentive', 'mine'], queryFn: incentivesApi.mine });
}

export function useTopRatedProviders() {
  return useQuery({ queryKey: ['admin', 'incentives'], queryFn: adminIncentivesApi.list });
}

export function useRunIncentives() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminIncentivesApi.run,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'incentives'] }),
  });
}
