import { MessageType } from '@prisma/client';

export interface ListingPreviewDto {
  id: string;
  title: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  location: string;
}

export interface MessageAttachmentDto {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface ReplyPreviewDto {
  id: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  deleted: boolean;
}

export interface MessageUserDto {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  isRead: boolean;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  attachments: MessageAttachmentDto[];
  replyTo: ReplyPreviewDto | null;
  listingPreviews: ListingPreviewDto[];
  sender: MessageUserDto;
}

export interface ConversationDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  members: { userId: string; joinedAt: string; user: MessageUserDto }[];
  lastMessage: MessageDto | null;
  unreadCount: number;
}

export interface MessagePage {
  items: MessageDto[];
  nextCursor: string | null;
}

export interface SharedAttachmentDto extends MessageAttachmentDto {
  messageId: string;
  createdAt: string;
}

export interface SharedLinkDto {
  messageId: string;
  url: string;
  createdAt: string;
  listingPreview: ListingPreviewDto | null;
}

export interface SharedPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface UploadedAttachmentDto {
  url: string;
  name: string;
  mimeType: string;
  size: number;
}
