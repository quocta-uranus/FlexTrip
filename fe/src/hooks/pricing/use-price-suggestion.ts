import { useQuery } from '@tanstack/react-query';
import { pricingApi } from '@/lib/api/pricing';

type Params = {
  category: string;
  location: string;
  title?: string;
  currentPrice?: number;
  listingId?: string;
};

export function usePriceSuggestion(params: Params | null) {
  return useQuery({
    queryKey: ['price-suggestion', params],
    queryFn: () => pricingApi.suggest(params!),
    enabled: !!(params?.category && params?.location),
    staleTime: 6 * 60 * 60 * 1000, // 6h cache
    retry: 1,
  });
}
