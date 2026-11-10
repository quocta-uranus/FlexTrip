import { api, toQuery } from '@/lib/api/client';
import type { FaqPublic, MyTicketDetail, MyTicketItem, TicketStatus } from '@/types/support';
import type { Paginated } from '@/types/admin';

export const supportApi = {
  faqs: () => api.get('/support/faqs') as Promise<FaqPublic[]>,
  list: (q: { status?: TicketStatus | 'ALL'; page?: number; limit?: number }) =>
    api.get(`/support/tickets${toQuery(q)}`) as Promise<Paginated<MyTicketItem>>,
  detail: (id: string) => api.get(`/support/tickets/${id}`) as Promise<MyTicketDetail>,
  create: (body: { subject: string; description: string; bookingId?: string }) =>
    api.post('/support/tickets', body) as Promise<{ id: string }>,
  reply: (id: string, body: string) => api.post(`/support/tickets/${id}/messages`, { body }) as Promise<MyTicketDetail>,
  close: (id: string) => api.patch(`/support/tickets/${id}/close`, {}) as Promise<MyTicketDetail>,
};
