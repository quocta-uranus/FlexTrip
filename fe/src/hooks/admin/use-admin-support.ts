import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { AdminTicketDetail } from '@/types/admin';
import type { TicketCategory, TicketPriority, TicketStatus } from '@/types/support';

export interface TicketFilters {
  status: TicketStatus | 'ALL';
  category: TicketCategory | 'ALL';
  priority: TicketPriority | 'ALL';
  search: string;
  page: number;
}

export function useAdminTickets(f: TicketFilters) {
  return useQuery({
    queryKey: ['admin', 'tickets', 'list', f],
    queryFn: () => adminApi.tickets.list({ ...f, limit: 20 }),
    placeholderData: keepPreviousData,
  });
}
export function useTicketStats() {
  return useQuery({ queryKey: ['admin', 'tickets', 'stats'], queryFn: adminApi.tickets.stats });
}
export function useTicketDetail(id: string) {
  return useQuery({ queryKey: ['admin', 'tickets', 'detail', id], queryFn: () => adminApi.tickets.detail(id) });
}

function useRefreshTicket(id: string) {
  const qc = useQueryClient();
  return (data: AdminTicketDetail) => {
    qc.setQueryData(['admin', 'tickets', 'detail', id], data);
    qc.invalidateQueries({ queryKey: ['admin', 'tickets', 'list'] });
    qc.invalidateQueries({ queryKey: ['admin', 'tickets', 'stats'] });
  };
}
export function useReplyTicketAdmin(id: string) {
  const refresh = useRefreshTicket(id);
  return useMutation({
    mutationFn: (body: { body: string; nextStatus?: 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' }) => adminApi.tickets.reply(id, body),
    onSuccess: refresh,
  });
}
export function useUpdateTicket(id: string) {
  const refresh = useRefreshTicket(id);
  return useMutation({
    mutationFn: (body: Parameters<typeof adminApi.tickets.update>[1]) => adminApi.tickets.update(id, body),
    onSuccess: refresh,
  });
}
export function useRetriageTicket(id: string) {
  const refresh = useRefreshTicket(id);
  return useMutation({ mutationFn: () => adminApi.tickets.retriage(id), onSuccess: refresh });
}

export function useAdminFaqs() {
  return useQuery({ queryKey: ['admin', 'faqs', 'list'], queryFn: adminApi.faqs.list });
}
export function useFaqSuggestions(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'faqs', 'suggestions'],
    queryFn: adminApi.faqs.suggestions,
    enabled,
    staleTime: 5 * 60_000,
  });
}
export function useSaveFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string; question: string; answer: string; category: TicketCategory; isPublished?: boolean }) =>
      id ? adminApi.faqs.update(id, body) : adminApi.faqs.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'faqs'] }),
  });
}
export function useDeleteFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.faqs.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'faqs'] }),
  });
}
