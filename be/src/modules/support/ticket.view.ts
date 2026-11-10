import { Prisma } from '@prisma/client';

export const TICKET_LIST_INCLUDE = {
  requester: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true } },
  _count: { select: { messages: true } },
} satisfies Prisma.SupportTicketInclude;

export const TICKET_DETAIL_INCLUDE = {
  ...TICKET_LIST_INCLUDE,
  booking: { select: { id: true, status: true, listing: { select: { title: true } } } },
  messages: {
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { id: true, name: true } } },
  },
} satisfies Prisma.SupportTicketInclude;

export type TicketListRow = Prisma.SupportTicketGetPayload<{ include: typeof TICKET_LIST_INCLUDE }>;
export type TicketDetailRow = Prisma.SupportTicketGetPayload<{ include: typeof TICKET_DETAIL_INCLUDE }>;

export function toTicketItem(t: TicketListRow) {
  return {
    id: t.id,
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status,
    triageSource: t.triageSource,
    requester: t.requester,
    assignedTo: t.assignedTo,
    messageCount: t._count.messages,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export function toTicketDetail(t: TicketDetailRow) {
  return {
    ...toTicketItem(t),
    description: t.description,
    triageReason: t.triageReason,
    resolvedAt: t.resolvedAt,
    booking: t.booking ? { id: t.booking.id, status: t.booking.status, title: t.booking.listing.title } : null,
    messages: t.messages.map((m) => ({
      id: m.id, body: m.body, isStaff: m.isStaff, authorName: m.author.name, createdAt: m.createdAt,
    })),
  };
}

/** Travelers/providers only see the outcome of triage, never the internal priority or reasoning. */
export function toRequesterView(t: TicketDetailRow) {
  return {
    id: t.id,
    subject: t.subject,
    description: t.description,
    category: t.category,
    status: t.status,
    messageCount: t._count.messages,
    booking: t.booking ? { id: t.booking.id, status: t.booking.status, title: t.booking.listing.title } : null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    messages: t.messages.map((m) => ({
      id: m.id,
      body: m.body,
      isStaff: m.isStaff,
      authorName: m.isStaff ? 'Hỗ trợ FlexTrip' : m.author.name,
      createdAt: m.createdAt,
    })),
  };
}
