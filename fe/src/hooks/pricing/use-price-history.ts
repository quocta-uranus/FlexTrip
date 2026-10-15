import { useQuery } from '@tanstack/react-query';
import { pricingApi } from '@/lib/api/pricing';

export function usePriceHistory(listingId: string | null, limit = 20) {
  return useQuery({
    queryKey: ['price-history', listingId, limit],
    queryFn: () => pricingApi.history(listingId!, limit),
    enabled: !!listingId,
    staleTime: 60_000,
  });
}
