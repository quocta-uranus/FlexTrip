import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api/payments';
import type { InitiatePaymentRequest, PayoutRequest, TopupRequest } from '@/types/payment';

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: () => paymentsApi.getWallet(),
    staleTime: 30_000,
  });
}

export function useWalletTransactions(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['wallet-transactions', page, limit],
    queryFn: () => paymentsApi.getTransactions(page, limit),
  });
}

export function useInitiatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, dto }: { bookingId: string; dto: InitiatePaymentRequest }) =>
      paymentsApi.initiatePayment(bookingId, dto),
    throwOnError: false,
    onSuccess: (_data, { bookingId }) => {
      qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function usePayRental() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, dto }: { bookingId: string; dto: InitiatePaymentRequest }) =>
      paymentsApi.payRental(bookingId, dto),
    throwOnError: false,
    onSuccess: (_data, { bookingId }) => {
      qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useTopup() {
  return useMutation({
    mutationFn: (dto: TopupRequest) => paymentsApi.topup(dto),
  });
}

export function useInvoice(bookingId: string) {
  return useQuery({
    queryKey: ['invoice', bookingId],
    queryFn: () => paymentsApi.getInvoice(bookingId),
    enabled: !!bookingId,
    staleTime: 60_000,
  });
}

export function useRequestPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: PayoutRequest) => paymentsApi.requestPayout(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
  });
}
