import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { ReviewStatus } from '@/types/admin';

export function useAdminReviews(filters: { status?: ReviewStatus; rating?: number; search: string; page: number }) {
  return useQuery({
    queryKey: ['admin', 'reviews', filters],
    queryFn: () => adminApi.reviews.list({ ...filters, limit: 12 }),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const active = query.state.data?.items.some((review) =>
        review.queueStatus === 'WAITING' ||
        review.queueStatus === 'PROCESSING' ||
        review.queueStatus === 'RETRYING',
      );
      return active ? 2_000 : false;
    },
  });
}

export function useModerateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: 'APPROVE' | 'REJECT'; note?: string }) =>
      adminApi.reviews.moderate(id, decision, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] }),
  });
}

export function useReanalyzeReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.reviews.reanalyze,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] }),
  });
}
