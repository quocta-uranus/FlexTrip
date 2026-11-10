import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '@/lib/api/client';
import type { ConfirmPaymentPayload, CreateBookingPayload } from '@/types/booking';

export function useMyBookings(params?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ['my-bookings', params],
    queryFn: () => bookingApi.myBookings(params),
  });
}

export function useProviderBookings(params?: { status?: string; limit?: number }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['provider-bookings', params],
    queryFn: () => bookingApi.providerBookings(params),
    enabled: options?.enabled ?? true,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bookings'] }),
  });
}

export function useConfirmPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConfirmPaymentPayload }) =>
      bookingApi.confirmPayment(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });
}

export function useApproveBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingApi.approve(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['provider-bookings'] });
    },
  });
}

export function useDeclineBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      bookingApi.decline(id, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['provider-bookings'] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      bookingApi.cancel(id, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });
}

export function useStartBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingApi.start(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['provider-bookings'] });
    },
  });
}

export function useCompleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bookingApi.complete(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['provider-bookings'] });
    },
  });
}
