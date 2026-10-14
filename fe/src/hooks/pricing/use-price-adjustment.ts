import { useQuery } from '@tanstack/react-query';
import { pricingApi } from '@/lib/api/pricing';

export function usePriceAdjustment(listingId: string | null) {
  return useQuery({
    queryKey: ['price-adjustment', listingId],
    queryFn: () => pricingApi.adjustment(listingId!),
    enabled: !!listingId,
    staleTime: 6 * 60 * 60 * 1000,
  });
}
