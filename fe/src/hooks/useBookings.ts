import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '@/lib/api/client';
import type { CreateBookingPayload } from '@/types/booking';

export function useMyBookings(params?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['my-bookings', params],
    queryFn: () => bookingApi.myBookings(params),
  });
}

export function useProviderBookings(params?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['provider-bookings', params],
    queryFn: () => bookingApi.providerBookings(params),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingApi.get(id),
    enabled: !!id,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBookingPayload) => bookingApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingApi.cancel(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });
}

export function useConfirmBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingApi.confirm(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['provider-bookings'] });
    },
  });
}
