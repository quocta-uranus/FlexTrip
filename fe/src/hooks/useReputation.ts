import { useQuery } from '@tanstack/react-query';
import { reputationApi } from '@/lib/api/client';

export function useMyReputation(enabled = true) {
  return useQuery({
    queryKey: ['reputation', 'me'],
    queryFn: reputationApi.mine,
    enabled,
  });
}

export function usePublicReputation(userId: string) {
  return useQuery({
    queryKey: ['reputation', 'user', userId],
    queryFn: () => reputationApi.publicForUser(userId),
    enabled: !!userId,
  });
}
