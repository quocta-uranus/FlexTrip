import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MessageType, Prisma, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { safeFileName, validateAttachment } from './attachment-validator';
import { ChatStorage } from './chat-storage.service';
import { LinkPreviewService } from './link-preview.service';
import { extractLinks } from './links.util';
import { MESSAGE_INCLUDE, MessageRow, toMessageDto } from './message.mapper';
import { validateSendShape } from './message-shape';
import { MessagesGateway } from './messages.gateway';
import type { SendMessageDto } from './messages.dto';
import type {
  ConversationDto, MessageDto, MessagePage, SharedAttachmentDto, SharedLinkDto, SharedPage, UploadedAttachmentDto,
} from './messages.types';

const MEMBER_USER = { select: { id: true, name: true, avatarUrl: true } } as const;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly previews: LinkPreviewService,
    private readonly gateway: MessagesGateway,
    private readonly storage: ChatStorage,
  ) {}

  private async memberIds(conversationId: string): Promise<string[]> {
    const rows = await this.prisma.conversationMember.findMany({ where: { conversationId }, select: { userId: true } });
    return rows.map((r) => r.userId);
  }

  async requireMember(userId: string, conversationId: string): Promise<string[]> {
    const ids = await this.memberIds(conversationId);
    if (!ids.includes(userId)) throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');
    return ids;
  }

  private async hydrate(rows: MessageRow[]): Promise<MessageDto[]> {
    const previews = await this.previews.forMessages(rows);
    return rows.map((r) => toMessageDto(r, previews.get(r.id)));
  }

  private async loadConversations(userId: string, where: Prisma.ConversationWhereInput): Promise<ConversationDto[]> {
    const rows = await this.prisma.conversation.findMany({
      where: { members: { some: { userId } }, ...where },
      orderBy: { updatedAt: 'desc' },
      include: {
        members: { include: { user: MEMBER_USER } },
        messages: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1, include: MESSAGE_INCLUDE },
      },
    });
    const unread = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: rows.map((r) => r.id) },
        senderId: { not: userId },
        isRead: false,
        deletedAt: null,
      },
      _count: { _all: true },
    });
    const unreadBy = new Map(unread.map((u) => [u.conversationId, u._count._all]));
    const lastBy = new Map((await this.hydrate(rows.flatMap((r) => r.messages))).map((m) => [m.conversationId, m]));
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      members: r.members.map((m) => ({ userId: m.userId, joinedAt: m.joinedAt.toISOString(), user: m.user })),
      lastMessage: lastBy.get(r.id) ?? null,
      unreadCount: unreadBy.get(r.id) ?? 0,
    }));
  }

  async startConversation(userId: string, targetUserId: string): Promise<ConversationDto> {
    if (userId === targetUserId) throw new BadRequestException('Không thể chat với chính mình');
    const users = await this.prisma.user.findMany({
      where: { id: { in: [userId, targetUserId] } },
      select: { id: true, status: true, roles: { select: { role: true } } },
    });
    if (users.length !== 2) throw new NotFoundException('Người dùng không tồn tại');
    if (users.some((u) => u.status !== UserStatus.ACTIVE)) throw new BadRequestException('Tài khoản không khả dụng');
    const providers = users.filter((u) => u.roles.some((r) => r.role === Role.PROVIDER));
    if (providers.length !== 1) throw new BadRequestException('Chỉ có thể chat giữa traveler và provider');

    const pairKey = [userId, targetUserId].sort().join(':');
    const { id } = await this.prisma.conversation.upsert({
      where: { pairKey },
      update: {},
      create: { pairKey, members: { create: [{ userId }, { userId: targetUserId }] } },
      select: { id: true },
    });
    return this.conversationInfo(userId, id);
  }

  listConversations(userId: string): Promise<ConversationDto[]> {
    return this.loadConversations(userId, { messages: { some: {} } });
  }

  async conversationInfo(userId: string, conversationId: string): Promise<ConversationDto> {
    const [conversation] = await this.loadConversations(userId, { id: conversationId });
    if (!conversation) throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');
    return conversation;
  }

  async listMessages(
    userId: string,
    conversationId: string,
    q: { cursor?: string; limit: number },
  ): Promise<MessagePage> {
    await this.requireMember(userId, conversationId);
    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      include: MESSAGE_INCLUDE,
    });
    const hasMore = rows.length > q.limit;
    const page = hasMore ? rows.slice(0, q.limit) : rows;
    return { items: await this.hydrate(page), nextCursor: hasMore ? page[page.length - 1].id : null };
  }

  async send(userId: string, conversationId: string, dto: SendMessageDto): Promise<MessageDto> {
    const memberIds = await this.requireMember(userId, conversationId);
    validateSendShape(dto);
    const attachments = dto.attachments ?? [];
    if (attachments.some((a) => !this.storage.isOwnUrl(a.url))) {
      throw new BadRequestException('File đính kèm không hợp lệ');
    }
    if (dto.replyToId) {
      const target = await this.prisma.message.findUnique({ where: { id: dto.replyToId }, select: { conversationId: true } });
      if (target?.conversationId !== conversationId) {
        throw new BadRequestException('Tin nhắn được trả lời không thuộc cuộc trò chuyện này');
      }
    }
    const content = dto.content?.trim() ?? '';
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          type: dto.type,
          content,
          replyToId: dto.replyToId,
          links: extractLinks(content),
          latitude: dto.type === MessageType.LOCATION ? dto.latitude : undefined,
          longitude: dto.type === MessageType.LOCATION ? dto.longitude : undefined,
          locationLabel: dto.type === MessageType.LOCATION ? dto.locationLabel : undefined,
          attachments: { create: attachments.map(({ url, name, mimeType, size }) => ({ url, name, mimeType, size })) },
        },
        include: MESSAGE_INCLUDE,
      });
      await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return created;
    });
    const [message] = await this.hydrate([row]);
    this.gateway.emitToUsers(memberIds, 'message:new', message);
    return message;
  }

  async markRead(userId: string, conversationId: string): Promise<{ ok: true }> {
    const memberIds = await this.requireMember(userId, conversationId);
    const { count } = await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });
    if (count) this.gateway.emitToUsers(memberIds, 'message:read', { conversationId, readerId: userId });
    return { ok: true };
  }

  private async ownMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, type: true, deletedAt: true, conversationId: true },
    });
    if (!message) throw new NotFoundException('Tin nhắn không tồn tại');
    if (message.senderId !== userId) throw new ForbiddenException('Bạn chỉ có thể thao tác với tin nhắn của mình');
    return message;
  }

  async edit(userId: string, messageId: string, content: string): Promise<MessageDto> {
    const existing = await this.ownMessage(userId, messageId);
    const notEditable = new BadRequestException('Chỉ có thể sửa tin nhắn văn bản chưa bị thu hồi');
    if (existing.deletedAt || existing.type !== MessageType.TEXT) throw notEditable;
    // deletedAt in the filter closes the race with a concurrent recall.
    const { count } = await this.prisma.message.updateMany({
      where: { id: messageId, deletedAt: null },
      data: { content, editedAt: new Date(), links: extractLinks(content) },
    });
    if (!count) throw notEditable;
    const row = await this.prisma.message.findUniqueOrThrow({ where: { id: messageId }, include: MESSAGE_INCLUDE });
    const [message] = await this.hydrate([row]);
    this.gateway.emitToUsers(await this.memberIds(existing.conversationId), 'message:updated', message);
    return message;
  }

  async remove(userId: string, messageId: string): Promise<{ ok: true }> {
    const existing = await this.ownMessage(userId, messageId);
    const deletedAt = new Date();
    const { count } = await this.prisma.message.updateMany({
      where: { id: messageId, deletedAt: null },
      data: { deletedAt },
    });
    if (count) {
      this.gateway.emitToUsers(await this.memberIds(existing.conversationId), 'message:deleted', {
        id: messageId,
        conversationId: existing.conversationId,
        deletedAt: deletedAt.toISOString(),
      });
    }
    return { ok: true };
  }

  async uploadAttachments(
    userId: string,
    conversationId: string,
    files: Express.Multer.File[] | undefined,
  ): Promise<UploadedAttachmentDto[]> {
    await this.requireMember(userId, conversationId);
    if (!files?.length) throw new BadRequestException('Thiếu file đính kèm (field "files")');
    // Validate the whole batch first so a bad file never leaves orphans in storage.
    const validated = files.map((file) => ({ file, ...validateAttachment(file) }));
    return Promise.all(
      validated.map(async ({ file, mime, ext }) => ({
        url: await this.storage.upload(file.buffer, ext, mime),
        // multer decodes multipart filenames as latin1, which garbles UTF-8 names.
        name: safeFileName(Buffer.from(file.originalname, 'latin1').toString('utf8')),
        mimeType: mime,
        size: file.size,
      })),
    );
  }

  async shared(
    userId: string,
    conversationId: string,
    kind: 'media' | 'files' | 'links',
    q: { cursor?: string; limit: number },
  ): Promise<SharedPage<SharedAttachmentDto> | SharedPage<SharedLinkDto>> {
    await this.requireMember(userId, conversationId);
    return kind === 'links' ? this.sharedLinks(conversationId, q) : this.sharedAttachments(conversationId, kind, q);
  }

  private async sharedAttachments(
    conversationId: string,
    kind: 'media' | 'files',
    q: { cursor?: string; limit: number },
  ): Promise<SharedPage<SharedAttachmentDto>> {
    const rows = await this.prisma.messageAttachment.findMany({
      where: {
        message: { conversationId, deletedAt: null, type: kind === 'media' ? MessageType.IMAGE : MessageType.FILE },
      },
      orderBy: [{ message: { createdAt: 'desc' } }, { message: { id: 'desc' } }, { id: 'desc' }],
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      include: { message: { select: { id: true, createdAt: true } } },
    });
    const hasMore = rows.length > q.limit;
    const page = hasMore ? rows.slice(0, q.limit) : rows;
    return {
      items: page.map((a) => ({
        id: a.id, url: a.url, name: a.name, mimeType: a.mimeType, size: a.size,
        messageId: a.message.id, createdAt: a.message.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  // Cursor is a message id: one page = up to `limit` messages, each expanded into its links.
  private async sharedLinks(
    conversationId: string,
    q: { cursor?: string; limit: number },
  ): Promise<SharedPage<SharedLinkDto>> {
    const rows = await this.prisma.message.findMany({
      where: { conversationId, deletedAt: null, links: { isEmpty: false } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      select: { id: true, links: true, createdAt: true },
    });
    const hasMore = rows.length > q.limit;
    const page = hasMore ? rows.slice(0, q.limit) : rows;
    const previews = await this.previews.forUrls([...new Set(page.flatMap((m) => m.links))]);
    return {
      items: page.flatMap((m) =>
        m.links.map((url) => ({
          messageId: m.id, url, createdAt: m.createdAt.toISOString(), listingPreview: previews.get(url) ?? null,
        })),
      ),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }
}
