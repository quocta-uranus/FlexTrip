import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '@/lib/api/client';
import type {
  AppealReviewPayload,
  CreateReviewPayload,
  EditReviewPayload,
  ReportReviewPayload,
  RespondToReviewPayload,
  SentimentRange,
} from '@/types/review';

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

export function useReceivedReviews() {
  return useQuery({
    queryKey: ['reviews', 'received'],
    queryFn: reviewApi.received,
  });
}

export function useSentimentDashboard(range: SentimentRange) {
  return useQuery({
    queryKey: ['reviews', 'sentiment', range],
    queryFn: () => reviewApi.sentiment(range),
  });
}

export function useRespondToReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, response }: RespondToReviewPayload) =>
      reviewApi.respond(reviewId, response),
    onSuccess: (review) => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'received'] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'mine'] });
      if (review.listingId) {
        queryClient.invalidateQueries({
          queryKey: ['reviews', 'listing', review.listingId],
        });
      }
    },
  });
}

function refreshAfterReviewChange(queryClient: ReturnType<typeof useQueryClient>, listingId: string | null) {
  queryClient.invalidateQueries({ queryKey: ['reviews', 'mine'] });
  if (listingId) {
    queryClient.invalidateQueries({ queryKey: ['reviews', 'listing', listingId] });
    queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
  }
}

export function useEditReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EditReviewPayload) => reviewApi.edit(payload),
    onSuccess: (review) => refreshAfterReviewChange(queryClient, review.listingId),
  });
}

export function useAppealReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AppealReviewPayload) => reviewApi.appeal(payload),
    onSuccess: (review) => refreshAfterReviewChange(queryClient, review.listingId),
  });
}

export function useReportReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReportReviewPayload) => reviewApi.report(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews', 'received'] }),
  });
}

export function useReviewPolicy() {
  return useQuery({
    queryKey: ['reviews', 'policy'],
    queryFn: reviewApi.policy,
    staleTime: 5 * 60_000,
  });
}
