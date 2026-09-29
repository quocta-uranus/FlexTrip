import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { availabilityApi } from '@/lib/api/client';

export function useAvailability(listingId: string, from: string, to: string) {
  return useQuery({
    queryKey: ['availability', listingId, from, to],
    queryFn: () => availabilityApi.get(listingId, from, to),
    enabled: !!listingId && !!from && !!to,
    staleTime: 30_000,
  });
}

export function useRentalConfig(listingId: string) {
  return useQuery({
    queryKey: ['rental-config', listingId],
    queryFn: () => availabilityApi.getRentalConfig(listingId),
    enabled: !!listingId,
  });
}

export function useBlockDates(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dates, note }: { dates: string[]; note?: string }) =>
      availabilityApi.block(listingId, dates, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability', listingId] }),
  });
}

export function useUnblockDates(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dates: string[]) => availabilityApi.unblock(listingId, dates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability', listingId] }),
  });
}

export function useUpdateRentalConfig(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { minRentalDays: number; maxRentalDays?: number | null; depositRate?: number }) =>
      availabilityApi.updateRentalConfig(listingId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rental-config', listingId] });
      qc.invalidateQueries({ queryKey: ['listing', listingId] });
    },
  });
}
