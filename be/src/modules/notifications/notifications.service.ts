import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type NotificationAudience = 'TRAVELER' | 'PROVIDER';

interface BookingParties {
  travelerId: string;
  listing: { providerId: string };
}

function bookingIdOf(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const id = (data as Record<string, unknown>).bookingId;
  return typeof id === 'string' && id ? id : null;
}

// Only classified when the recipient is unambiguously one side of the booking.
export function resolveAudience(userId: string, booking?: BookingParties): NotificationAudience | null {
  if (!booking) return null;
  const isTraveler = booking.travelerId === userId;
  const isProvider = booking.listing.providerId === userId;
  if (isTraveler && !isProvider) return 'TRAVELER';
  if (isProvider && !isTraveler) return 'PROVIDER';
  return null;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    options: { limit?: string; unreadOnly?: string; type?: NotificationType },
  ) {
    const parsedLimit = Number.parseInt(options.limit ?? '20', 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 50)
      : 20;
    const unreadOnly = options.unreadOnly === 'true';

    const where = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
      ...(options.type ? { type: options.type } : {}),
    };

    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    // One query for the whole page of notifications, never one per notification.
    const bookingIds = [...new Set(items.map((n) => bookingIdOf(n.data)).filter((id): id is string => id !== null))];
    const bookings = bookingIds.length
      ? await this.prisma.booking.findMany({
          where: { id: { in: bookingIds } },
          select: { id: true, travelerId: true, listing: { select: { providerId: true } } },
        })
      : [];
    const byId = new Map(bookings.map((b) => [b.id, b]));

    return {
      items: items.map((n) => {
        const bookingId = bookingIdOf(n.data);
        return { ...n, audience: resolveAudience(userId, bookingId ? byId.get(bookingId) : undefined) };
      }),
      unreadCount,
    };
  }

  async markAsRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (!result.count) throw new NotFoundException('Thông báo không tồn tại');
    return { ok: true };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { ok: true, updated: result.count };
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { id, userId },
    });
    if (!result.count) throw new NotFoundException('Thông báo không tồn tại');
    return { ok: true };
  }
}
