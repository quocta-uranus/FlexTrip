import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

export function useAdminDashboard() {
  return useQuery({ queryKey: ['admin', 'dashboard'], queryFn: adminApi.dashboard, refetchInterval: 60_000 });
}
