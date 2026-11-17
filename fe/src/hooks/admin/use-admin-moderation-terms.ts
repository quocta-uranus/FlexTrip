import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { ModerationTermCategory } from '@/types/admin';

const KEY = ['admin', 'moderation-terms'];

export function useModerationTerms() {
  return useQuery({ queryKey: KEY, queryFn: adminApi.moderationTerms.list });
}

export function useAddModerationTerm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ term, category }: { term: string; category: ModerationTermCategory }) =>
      adminApi.moderationTerms.add(term, category),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRemoveModerationTerm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.moderationTerms.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useToggleBuiltInTerm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      term,
      category,
      disabled,
    }: {
      term: string;
      category: ModerationTermCategory;
      disabled: boolean;
    }) => adminApi.moderationTerms.toggleBuiltIn(term, category, disabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useTestModerationText() {
  return useMutation({ mutationFn: adminApi.moderationTerms.test });
}
