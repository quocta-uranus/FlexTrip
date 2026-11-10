import type { Message } from '@/types/message';

export function makeMessage(over: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    conversationId: 'c1',
    senderId: 'u1',
    type: 'TEXT',
    content: 'xin chào',
    isRead: false,
    createdAt: '2026-10-14T03:00:00.000Z',
    editedAt: null,
    deletedAt: null,
    latitude: null,
    longitude: null,
    locationLabel: null,
    attachments: [],
    replyTo: null,
    listingPreviews: [],
    sender: { id: 'u1', name: 'An', avatarUrl: null },
    ...over,
  };
}
