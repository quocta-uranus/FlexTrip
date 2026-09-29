import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providersApi, type ProviderProfile } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth.store';

export function useProvidersProfile() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['provider-profile'],
    queryFn: () => providersApi.me(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProviderProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProviderProfile>) =>
      (providersApi as any).updateMe?.(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-profile'] });
    },
  });
}
