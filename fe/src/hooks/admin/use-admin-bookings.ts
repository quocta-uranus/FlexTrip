import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { HandoverFault } from '@/types/admin';

type Q = Record<string, string | number | boolean | null | undefined>;

const KEY = ['admin-bookings'] as const;

export function useAdminBookingStats() {
  return useQuery({ queryKey: [...KEY, 'stats'], queryFn: () => adminApi.bookings.stats(), staleTime: 30_000 });
}

export function useAdminBookingList(params: Q) {
  return useQuery({
    queryKey: [...KEY, 'list', params],
    queryFn: () => adminApi.bookings.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useAdminBookingDetail(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'detail', id],
    queryFn: () => adminApi.bookings.detail(id!),
    enabled: !!id,
  });
}

export function useResolveOverdueHandover(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { fault: HandoverFault; note?: string }) => adminApi.bookings.resolveOverdueHandover(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useOpenLateReturnDispute(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.bookings.openLateReturnDispute(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
