import { Prisma } from '@prisma/client';
import type { ListingPreviewDto, MessageDto } from './messages.types';

export const MESSAGE_INCLUDE = {
  attachments: { orderBy: { id: 'asc' } },
  sender: { select: { id: true, name: true, avatarUrl: true } },
  replyTo: { select: { id: true, senderId: true, type: true, content: true, deletedAt: true } },
} satisfies Prisma.MessageInclude;

export type MessageRow = Prisma.MessageGetPayload<{ include: typeof MESSAGE_INCLUDE }>;

const REPLY_SNIPPET_LENGTH = 120;

export function toMessageDto(m: MessageRow, previews: ListingPreviewDto[] = []): MessageDto {
  const deleted = m.deletedAt !== null;
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    type: m.type,
    content: deleted ? null : m.content,
    isRead: m.isRead,
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
    deletedAt: m.deletedAt?.toISOString() ?? null,
    latitude: deleted ? null : m.latitude,
    longitude: deleted ? null : m.longitude,
    locationLabel: deleted ? null : m.locationLabel,
    attachments: deleted
      ? []
      : m.attachments.map(({ id, url, name, mimeType, size }) => ({ id, url, name, mimeType, size })),
    replyTo: m.replyTo
      ? {
          id: m.replyTo.id,
          senderId: m.replyTo.senderId,
          type: m.replyTo.type,
          content: m.replyTo.deletedAt ? null : m.replyTo.content.slice(0, REPLY_SNIPPET_LENGTH),
          deleted: m.replyTo.deletedAt !== null,
        }
      : null,
    listingPreviews: deleted ? [] : previews,
    sender: m.sender,
  };
}
