import { useQuery } from '@tanstack/react-query';
import { pricingApi } from '@/lib/api/pricing';

export function useDemandCalendar(
  listingId: string | null,
  year: number,
  month: number,
) {
  return useQuery({
    queryKey: ['demand-calendar', listingId, year, month],
    queryFn: () => pricingApi.calendar(listingId!, year, month),
    enabled: !!listingId,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
