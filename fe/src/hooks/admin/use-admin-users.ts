import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { Role, UserStatus } from '@/types/admin';

export interface UserFilters { search: string; role: Role | 'ALL'; status: UserStatus | 'ALL'; page: number }

export function useAdminUsers(f: UserFilters) {
  return useQuery({
    queryKey: ['admin', 'users', f],
    queryFn: () => adminApi.users.list({ ...f, limit: 20 }),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUserStats() {
  return useQuery({ queryKey: ['admin', 'users', 'stats'], queryFn: adminApi.users.stats });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.users.suspend(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUnsuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => adminApi.users.unsuspend(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}
