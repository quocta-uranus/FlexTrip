import { useQuery } from '@tanstack/react-query';
import { pricingApi } from '@/lib/api/pricing';

export function useBenchmark(listingId: string | null) {
  return useQuery({
    queryKey: ['price-benchmark', listingId],
    queryFn: () => pricingApi.benchmark(listingId!),
    enabled: !!listingId,
    staleTime: 60 * 60 * 1000, // 1h
  });
}
