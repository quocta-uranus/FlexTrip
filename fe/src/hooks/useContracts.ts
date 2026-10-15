import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsApi } from '@/lib/api/contracts';

export function useContractPreview(bookingId: string, enabled = true) {
  return useQuery({
    queryKey: ['contract-preview', bookingId],
    queryFn: () => contractsApi.preview(bookingId),
    enabled: !!bookingId && enabled,
  });
}

export function useContract(bookingId: string, enabled = true) {
  return useQuery({
    queryKey: ['contract', bookingId],
    queryFn: () => contractsApi.getByBooking(bookingId),
    enabled: !!bookingId && enabled,
    staleTime: 0,
  });
}

export function useProviderSignContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => contractsApi.providerSign(bookingId),
    onSuccess: (_data, bookingId) => {
      qc.invalidateQueries({ queryKey: ['contract', bookingId] });
      qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
