import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '@/lib/api/client';
import type { CreateReviewPayload } from '@/types/review';

export function useListingReviews(listingId: string) {
  return useQuery({
    queryKey: ['reviews', 'listing', listingId],
    queryFn: () => reviewApi.forListing(listingId),
    enabled: !!listingId,
  });
}

export function useMyReviews(enabled = true) {
  return useQuery({ queryKey: ['reviews', 'mine'], queryFn: reviewApi.mine, enabled });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReviewPayload) => reviewApi.create(payload),
    onSuccess: (review, payload) => {
      queryClient.invalidateQueries({ queryKey: ['booking', payload.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'mine'] });
      if (review.listingId) {
        queryClient.invalidateQueries({ queryKey: ['reviews', 'listing', review.listingId] });
        queryClient.invalidateQueries({ queryKey: ['listing', review.listingId] });
      }
    },
  });
}
