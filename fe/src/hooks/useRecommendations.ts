import { useQuery } from '@tanstack/react-query';
import { recommendationsApi } from '@/lib/api/recommendations';

export function useSimilarListings(listingId: string) {
  return useQuery({
    queryKey: ['recommendations', 'similar', listingId],
    queryFn: () => recommendationsApi.similar(listingId),
    enabled: !!listingId,
    staleTime: 5 * 60_000,
  });
}

export function useForYouListings(enabled: boolean) {
  return useQuery({
    queryKey: ['recommendations', 'for-you'],
    queryFn: () => recommendationsApi.forYou(),
    enabled,
    staleTime: 5 * 60_000,
  });
}
