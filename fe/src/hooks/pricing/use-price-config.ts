import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pricingApi } from '@/lib/api/pricing';

export function usePriceConfig(listingId: string | null) {
  return useQuery({
    queryKey: ['price-config', listingId],
    queryFn: () => pricingApi.getConfig(listingId!),
    enabled: !!listingId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdatePriceConfig(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { autoAdjust: boolean; minPrice?: number; maxPrice?: number }) =>
      pricingApi.updateConfig(listingId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['price-config', listingId] });
    },
  });
}
