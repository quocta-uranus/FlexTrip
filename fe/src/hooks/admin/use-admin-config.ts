import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

export function useAdminConfig() {
  return useQuery({ queryKey: ['admin', 'config'], queryFn: adminApi.config.get });
}
export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: adminApi.config.update, onSuccess: (data) => qc.setQueryData(['admin', 'config'], data) });
}
export function useResetConfig() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (keys?: string[]) => adminApi.config.reset(keys), onSuccess: (data) => qc.setQueryData(['admin', 'config'], data) });
}
