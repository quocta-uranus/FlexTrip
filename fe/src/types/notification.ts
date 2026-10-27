export type NotificationType = 'BOOKING' | 'PAYMENT' | 'MESSAGE' | 'SYSTEM' | 'REVIEW';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  data: Record<string, unknown> | null;
  // Set by the backend only when the recipient is clearly the traveler or the provider of the related booking.
  audience?: 'TRAVELER' | 'PROVIDER' | null;
  createdAt: string;
}

export interface NotificationListResult {
  items: AppNotification[];
  unreadCount: number;
}
