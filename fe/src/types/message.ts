export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'LOCATION';

export interface MessageUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface ListingPreview {
  id: string;
  title: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  location: string;
}

export interface MessageAttachment {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface ReplyPreview {
  id: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  deleted: boolean;
}

export interface Message {
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
  attachments: MessageAttachment[];
  replyTo: ReplyPreview | null;
  listingPreviews: ListingPreview[];
  sender: MessageUser;
}

export interface ConversationMember {
  userId: string;
  joinedAt: string;
  user: MessageUser;
}

export interface Conversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  members: ConversationMember[];
  lastMessage: Message | null;
  unreadCount: number;
}

export interface MessagePage {
  items: Message[];
  nextCursor: string | null;
}

export type AttachmentInput = Pick<MessageAttachment, 'url' | 'name' | 'mimeType' | 'size'>;

export interface SendMessageInput {
  type: MessageType;
  content?: string;
  replyToId?: string;
  attachments?: AttachmentInput[];
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
}

export type SharedKind = 'media' | 'files' | 'links';

export interface SharedAttachment extends MessageAttachment {
  messageId: string;
  createdAt: string;
}

export interface SharedLink {
  messageId: string;
  url: string;
  createdAt: string;
  listingPreview: ListingPreview | null;
}

export interface SharedPage<T> {
  items: T[];
  nextCursor: string | null;
}
