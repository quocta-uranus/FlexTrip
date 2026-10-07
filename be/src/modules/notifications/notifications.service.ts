import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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

    return { items, unreadCount };
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
