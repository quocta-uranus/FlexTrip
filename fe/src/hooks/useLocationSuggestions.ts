import { useQuery } from '@tanstack/react-query';
import { listingApi } from '@/lib/api/client';

export function useLocationSuggestions() {
  const query = useQuery({
    queryKey: ['listing-locations'],
    queryFn: () => listingApi.locations(),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  return {
    suggestions: query.data?.items.map((item) => item.value) ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
