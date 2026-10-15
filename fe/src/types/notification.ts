export type NotificationType = 'BOOKING' | 'PAYMENT' | 'MESSAGE' | 'SYSTEM' | 'REVIEW';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationListResult {
  items: AppNotification[];
  unreadCount: number;
}
