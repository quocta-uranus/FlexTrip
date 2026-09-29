import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modifyBookingApi } from '@/lib/api/client';

export function useModifyRequests(bookingId: string) {
  return useQuery({
    queryKey: ['modify-requests', bookingId],
    queryFn: () => modifyBookingApi.list(bookingId),
    enabled: !!bookingId,
  });
}

export function useCreateModifyRequest(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      newStartDate: string; newEndDate: string;
      newQuantity?: number; reason?: string;
    }) => modifyBookingApi.create(bookingId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modify-requests', bookingId] }),
  });
}

export function useAcceptModifyRequest(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) =>
      modifyBookingApi.accept(bookingId, requestId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modify-requests', bookingId] });
      qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      qc.invalidateQueries({ queryKey: ['provider-bookings'] });
    },
  });
}

export function useRejectModifyRequest(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) =>
      modifyBookingApi.reject(bookingId, requestId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['modify-requests', bookingId] }),
  });
}
