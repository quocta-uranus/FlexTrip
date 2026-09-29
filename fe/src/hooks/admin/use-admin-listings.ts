import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { ListingTab, ModerateAction } from '@/types/admin';

export function useAdminListings(f: { tab: ListingTab; search: string; page: number }) {
  return useQuery({ queryKey: ['admin', 'listings', f], queryFn: () => adminApi.listings.list({ ...f, limit: 12 }), placeholderData: keepPreviousData });
}
export function useListingModerationStats() {
  return useQuery({ queryKey: ['admin', 'listings', 'stats'], queryFn: adminApi.listings.stats });
}
export function useListingFlags(id: string | null) {
  return useQuery({ queryKey: ['admin', 'listings', 'flags', id], queryFn: () => adminApi.listings.flags(id!), enabled: !!id });
}
export function useModerateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: ModerateAction; note?: string }) => adminApi.listings.moderate(id, action, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'listings'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}
