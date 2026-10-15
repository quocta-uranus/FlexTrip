import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/lib/api/client';

export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.get(),
    staleTime: 30_000,
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      listingId: string; startDate: string; endDate: string;
      quantity?: number; deliveryMethod?: string; deliveryAddress?: string;
    }) => cartApi.addItem(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: {
      itemId: string;
      data: { startDate?: string; endDate?: string; quantity?: number; deliveryMethod?: string; deliveryAddress?: string };
    }) => cartApi.updateItem(itemId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useCartCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { paymentMethod: string; transactionRef?: string }) =>
      cartApi.checkout(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });
}
