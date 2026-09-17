import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listingApi } from '@/lib/api/client';
import type { ListingInput } from '@/lib/validators/listing.schema';

export function useListings(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['listings', params],
    queryFn: () => listingApi.list(params),
  });
}

export function useMyListings(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['my-listings', params],
    queryFn: () => listingApi.myListings(params),
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingApi.get(id),
    enabled: !!id,
  });
}

export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ListingInput) =>
      listingApi.create({
        ...data,
        price: Number(data.price),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-listings'] });
      qc.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useUpdateListing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ListingInput>) =>
      listingApi.update(id, data as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listing', id] });
      qc.invalidateQueries({ queryKey: ['my-listings'] });
    },
  });
}

export function useDeleteListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => listingApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-listings'] });
      qc.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}
