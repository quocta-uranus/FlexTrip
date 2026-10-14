import { useQuery } from '@tanstack/react-query';
import { pricingApi } from '@/lib/api/pricing';

export function usePriceOptimization(listingId: string | null) {
  return useQuery({
    queryKey: ['price-optimization', listingId],
    queryFn: () => pricingApi.optimization(listingId!),
    enabled: !!listingId,
    staleTime: 60 * 60 * 1000,
  });
}
