'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import {
  formatNotificationTime,
  getNotificationHref,
  NotificationTypeIcon,
} from '@/components/notification-bell';
import type { AppNotification } from '@/types/notification';

export default function NotificationsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isProvider = user?.roles.includes('PROVIDER') ?? false;
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading } = useNotifications(50, unreadOnly);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const removeNotification = useDeleteNotification();

  const openNotification = (notification: AppNotification) => {
    if (!notification.isRead) markRead.mutate(notification.id);
    router.push(getNotificationHref(notification, isProvider));
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#2a7bd9]">
            {isProvider ? 'Provider' : 'Traveler'}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#0f1729]">Thông báo của bạn</h1>
          <p className="mt-1 text-sm text-[#5a6b85]">Theo dõi đơn thuê, thanh toán và tin nhắn mới nhất.</p>
        </div>
        {(data?.unreadCount ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            className="rounded-xl border border-[#b9dafa] bg-white px-4 py-2 text-sm font-semibold text-[#2a7bd9] hover:bg-[#f1f8ff]"
          >
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        {[
          { label: 'Tất cả', value: false },
          { label: `Chưa đọc${data?.unreadCount ? ` (${data.unreadCount})` : ''}`, value: true },
        ].map((filter) => (
          <button
            type="button"
            key={filter.label}
            onClick={() => setUnreadOnly(filter.value)}
            className="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              color: unreadOnly === filter.value ? '#fff' : '#5a6b85',
              background: unreadOnly === filter.value ? '#2a7bd9' : '#fff',
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#DCEFFB] bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : !data?.items.length ? (
          <div className="px-6 py-16 text-center">
            <div className="mb-3 text-4xl">🔔</div>
            <h2 className="font-bold text-[#0f1729]">Không có thông báo</h2>
            <p className="mt-1 text-sm text-[#8694ad]">
              {unreadOnly ? 'Bạn không còn thông báo chưa đọc.' : 'Thông báo mới sẽ xuất hiện tại đây.'}
            </p>
          </div>
        ) : (
          data.items.map((notification) => (
            <article
              key={notification.id}
              className="flex items-start gap-4 border-b border-slate-100 p-4 last:border-0 sm:p-5"
              style={{ background: notification.isRead ? undefined : 'rgba(42,123,217,0.04)' }}
            >
              <NotificationTypeIcon type={notification.type} />
              <button type="button" onClick={() => openNotification(notification)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-[#0f1729]">{notification.title}</h2>
                  {!notification.isRead && <span className="h-2 w-2 rounded-full bg-[#2a7bd9]" />}
                </div>
                <p className="mt-1 text-sm leading-6 text-[#5a6b85]">{notification.body}</p>
                <p className="mt-1 text-xs text-[#8694ad]">{formatNotificationTime(notification.createdAt)}</p>
              </button>
              <button
                type="button"
                onClick={() => removeNotification.mutate(notification.id)}
                className="rounded-lg px-2 py-1 text-xs text-[#8694ad] hover:bg-red-50 hover:text-red-600"
              >
                Xóa
              </button>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
