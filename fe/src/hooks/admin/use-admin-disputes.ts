import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { DisputePriority, DisputeStatus, DisputeType } from '@/types/admin';

export interface DisputeFilters { status: DisputeStatus | 'ALL'; type: DisputeType | 'ALL'; priority: DisputePriority | 'ALL'; search: string; page: number }

export function useAdminDisputes(f: DisputeFilters) {
  return useQuery({ queryKey: ['admin', 'disputes', f], queryFn: () => adminApi.disputes.list({ ...f, limit: 20 }), placeholderData: keepPreviousData });
}
export function useDisputeStats() {
  return useQuery({ queryKey: ['admin', 'disputes', 'stats'], queryFn: adminApi.disputes.stats });
}
export function useDisputeDetail(id: string) {
  return useQuery({ queryKey: ['admin', 'disputes', 'detail', id], queryFn: () => adminApi.disputes.detail(id) });
}

function useInvalidateDisputes() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['admin', 'disputes'] });
    qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
  };
}
export function useSetDisputeStatus() {
  const invalidate = useInvalidateDisputes();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: 'UNDER_REVIEW' | 'PENDING_INFO' | 'ESCALATED'; note?: string }) =>
      adminApi.disputes.setStatus(id, status, note),
    onSuccess: invalidate,
  });
}
export function useSetDisputePriority() {
  const invalidate = useInvalidateDisputes();
  return useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: DisputePriority }) => adminApi.disputes.setPriority(id, priority),
    onSuccess: invalidate,
  });
}
export function useResolveDispute() {
  const invalidate = useInvalidateDisputes();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; outcome: 'RESOLVED' | 'REJECTED'; resolution: string; refundAmount?: number; penaltyAmount?: number }) =>
      adminApi.disputes.resolve(id, body),
    onSuccess: invalidate,
  });
}
