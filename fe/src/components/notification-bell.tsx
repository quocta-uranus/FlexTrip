'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications';
import type { AppNotification, NotificationType } from '@/types/notification';

const TYPE_META: Record<NotificationType, { icon: string; background: string }> = {
  BOOKING: { icon: '📋', background: '#e8f2ff' },
  PAYMENT: { icon: '💳', background: '#ecfdf5' },
  MESSAGE: { icon: '💬', background: '#f3e8ff' },
  SYSTEM: { icon: '🔔', background: '#fff7ed' },
  REVIEW: { icon: '⭐', background: '#fefce8' },
};

export function getNotificationHref(notification: AppNotification, isProvider: boolean) {
  const data = notification.data ?? {};
  const bookingId = typeof data.bookingId === 'string' ? data.bookingId : null;
  const conversationId = typeof data.conversationId === 'string' ? data.conversationId : null;

  if (notification.type === 'BOOKING') {
    return isProvider ? '/dashboard/bookings' : bookingId ? `/bookings/${bookingId}` : '/bookings';
  }
  if (notification.type === 'MESSAGE') {
    return conversationId ? `/messages?conversation=${conversationId}` : '/messages';
  }
  if (notification.type === 'PAYMENT') return '/profile/payments';
  if (notification.type === 'REVIEW') return isProvider ? '/profile/shop' : '/profile';
  return '/profile';
}

export function formatNotificationTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(value));
}

export function NotificationTypeIcon({ type }: { type: NotificationType }) {
  const meta = TYPE_META[type];
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
      style={{ background: meta.background }}
    >
      {meta.icon}
    </span>
  );
}

export function NotificationBell({ isProvider }: { isProvider: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useNotifications(10);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const removeNotification = useDeleteNotification();
  const unreadCount = data?.unreadCount ?? 0;

  const openNotification = (notification: AppNotification) => {
    if (!notification.isRead) markRead.mutate(notification.id);
    setOpen(false);
    router.push(getNotificationHref(notification, isProvider));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[#f1f5fa]"
        aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ''}`}
        title="Thông báo"
      >
        <svg className="h-5 w-5 text-[#5a6b85]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} />
          <div className="fixed left-3 right-3 top-[4.5rem] z-[60] overflow-hidden rounded-2xl border border-[#d9e8f5] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.20)] sm:left-auto sm:right-6 sm:w-[420px]">
            <div className="flex items-center justify-between gap-4 border-b border-[#e6eef6] bg-gradient-to-r from-[#f8fbff] to-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#0f1729]">Thông báo</h2>
                <p className="mt-0.5 text-xs text-[#718096]">
                  {unreadCount ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã xem tất cả'}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  className="shrink-0 rounded-lg bg-[#eaf3ff] px-3 py-2 text-xs font-semibold text-[#2374d1] transition-colors hover:bg-[#dcecff]"
                >
                  Đọc tất cả
                </button>
              )}
            </div>

            <div className="max-h-[min(32rem,calc(100vh-10rem))] overflow-y-auto overscroll-contain">
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
                </div>
              ) : !data?.items.length ? (
                <div className="px-6 py-10 text-center">
                  <div className="mb-2 text-3xl">🔔</div>
                  <p className="text-sm font-semibold text-[#0f1729]">Chưa có thông báo</p>
                  <p className="mt-1 text-xs text-[#8694ad]">Cập nhật về đơn thuê sẽ xuất hiện tại đây.</p>
                </div>
              ) : (
                data.items.map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => openNotification(notification)}
                    className="group flex w-full gap-3.5 border-b border-slate-100 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-[#f5f9ff]"
                    style={{ background: notification.isRead ? undefined : 'rgba(42,123,217,0.05)' }}
                  >
                    <NotificationTypeIcon type={notification.type} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="pr-2 text-sm font-semibold leading-5 text-[#0f1729]">{notification.title}</span>
                        {!notification.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2a7bd9]" />}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[13px] leading-5 text-[#5a6b85]">{notification.body}</span>
                      <span className="mt-2 flex items-center justify-between text-[11px] font-medium text-[#8a98ad]">
                        {formatNotificationTime(notification.createdAt)}
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label="Xóa thông báo"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeNotification.mutate(notification.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.stopPropagation();
                              removeNotification.mutate(notification.id);
                            }
                          }}
                          className="rounded-md px-2 py-1 text-[#9aa7b8] opacity-100 transition-colors hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          Xóa
                        </span>
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-[#e6eef6] bg-[#fbfdff] px-4 py-3.5 text-center text-sm font-semibold text-[#2a7bd9] transition-colors hover:bg-[#f1f7ff]"
            >
              Xem tất cả thông báo
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
