export interface MessageSender {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface Message {
  id: string;
  content: string;
  isRead: boolean;
  senderId: string;
  conversationId: string;
  createdAt: string;
  sender?: MessageSender;
}

export interface ConversationMember {
  userId: string;
  joinedAt: string;
  user: MessageSender;
}

export interface Conversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  members: ConversationMember[];
  messages?: Message[];
  lastMessage?: Message | null;
  unreadCount?: number;
}
