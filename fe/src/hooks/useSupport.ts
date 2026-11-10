import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '@/lib/api/support';
import type { TicketStatus } from '@/types/support';

export function useFaqs() {
  return useQuery({ queryKey: ['support', 'faqs'], queryFn: supportApi.faqs, staleTime: 5 * 60_000 });
}

export function useMyTickets(status: TicketStatus | 'ALL', page: number) {
  return useQuery({
    queryKey: ['support', 'tickets', { status, page }],
    queryFn: () => supportApi.list({ status, page, limit: 10 }),
    placeholderData: keepPreviousData,
  });
}

export function useMyTicket(id: string) {
  return useQuery({ queryKey: ['support', 'ticket', id], queryFn: () => supportApi.detail(id) });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: supportApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support', 'tickets'] }),
  });
}

export function useReplyTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => supportApi.reply(id, body),
    onSuccess: (data) => {
      qc.setQueryData(['support', 'ticket', id], data);
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });
}

export function useCloseTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => supportApi.close(id),
    onSuccess: (data) => {
      qc.setQueryData(['support', 'ticket', id], data);
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });
}
