import { useQuery } from '@tanstack/react-query';
import { pricingApi } from '@/lib/api/pricing';

export function useDemandForecast(params: {
  region: string;
  category: string;
  days?: 30 | 60 | 90;
} | null) {
  return useQuery({
    queryKey: ['demand-forecast', params],
    queryFn: () => pricingApi.forecast(params!),
    enabled: !!(params?.region && params?.category),
    staleTime: 24 * 60 * 60 * 1000, // 24h — recalc daily
  });
}
