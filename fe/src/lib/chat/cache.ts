import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { Message, MessagePage } from '@/types/message';

type MessagesCache = InfiniteData<MessagePage, string | undefined>;

export const messagesKey = (conversationId: string) => ['messages', conversationId] as const;

export const SOCKET_EVENTS = ['message:new', 'message:updated', 'message:deleted', 'message:read'] as const;
export type SocketEvent = (typeof SOCKET_EVENTS)[number];

function mapItems(qc: QueryClient, conversationId: string, fn: (m: Message) => Message) {
  qc.setQueryData<MessagesCache>(messagesKey(conversationId), (old) =>
    old && { ...old, pages: old.pages.map((p) => ({ ...p, items: p.items.map(fn) })) },
  );
}

export function upsertMessage(qc: QueryClient, msg: Message) {
  qc.setQueryData<MessagesCache>(messagesKey(msg.conversationId), (old) => {
    if (!old?.pages.length) return old;
    let found = false;
    const pages = old.pages.map((p) => ({
      ...p,
      items: p.items.map((m) => {
        if (m.id !== msg.id) return m;
        found = true;
        return msg;
      }),
    }));
    if (!found) pages[0] = { ...pages[0], items: [msg, ...pages[0].items] };
    return { ...old, pages };
  });
}

export function markDeleted(qc: QueryClient, p: { id: string; conversationId: string; deletedAt: string }) {
  mapItems(qc, p.conversationId, (m) => {
    if (m.id === p.id) {
      return {
        ...m, content: null, attachments: [], latitude: null, longitude: null, locationLabel: null,
        listingPreviews: [], deletedAt: p.deletedAt,
      };
    }
    if (m.replyTo?.id === p.id) return { ...m, replyTo: { ...m.replyTo, content: null, deleted: true } };
    return m;
  });
}

export function markRead(qc: QueryClient, p: { conversationId: string; readerId: string }) {
  mapItems(qc, p.conversationId, (m) => (m.senderId !== p.readerId && !m.isRead ? { ...m, isRead: true } : m));
}

export function applySocketEvent(qc: QueryClient, event: SocketEvent, payload: unknown) {
  const { conversationId } = payload as { conversationId: string };
  if (event === 'message:new' || event === 'message:updated') upsertMessage(qc, payload as Message);
  else if (event === 'message:deleted') markDeleted(qc, payload as { id: string; conversationId: string; deletedAt: string });
  else markRead(qc, payload as { conversationId: string; readerId: string });
  qc.invalidateQueries({ queryKey: ['conversations'] });
  qc.invalidateQueries({ queryKey: ['shared', conversationId] });
}
