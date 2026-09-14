import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, authApi, type UpdateMePayload } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth.store';

export function useMe() {
  const { isAuthenticated, setUser } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await userApi.me();
      setUser(user);
      return user;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  const { setUser } = useAuthStore();
  return useMutation({
    mutationFn: (data: UpdateMePayload) => userApi.updateMe(data),
    onSuccess: (user) => {
      qc.setQueryData(['me'], user);
      setUser(user);
    },
  });
}

export function usePreferences() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['preferences'],
    queryFn: () => userApi.getPreferences(),
    enabled: isAuthenticated,
  });
}

export function useSessions() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => authApi.sessions(),
    enabled: isAuthenticated,
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authApi.revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useRevokeOtherSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.revokeOtherSessions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}
