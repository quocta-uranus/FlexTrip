import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { BookingStatus, NotificationType } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { BOOKING_QUEUE, BookingJob } from './booking.constants';
import { daysPast, overdueWhere } from './overdue.util';

// Days overdue from which admins are asked to act
export const HANDOVER_ADMIN_DAYS = 2;
export const LATE_RETURN_DISPUTE_DAYS = 3;

@Injectable()
export class OverdueService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OverdueService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(BOOKING_QUEUE) private readonly queue: Queue,
  ) {}

  async onApplicationBootstrap() {
    await this.queue.upsertJobScheduler(
      'overdue-scan-daily',
      { pattern: '0 8 * * *', tz: 'Asia/Ho_Chi_Minh' },
      { name: BookingJob.OVERDUE_SCAN, data: {}, opts: { removeOnComplete: true } },
    );
  }

  // Only notifies: who is at fault is unknown, so money and status stay with a human
  async scan(now: Date = new Date()) {
    const bookings = await this.prisma.booking.findMany({
      where: overdueWhere(now),
      select: {
        id: true, status: true, startDate: true, endDate: true, travelerId: true, assignedStaffId: true,
        listing: { select: { title: true, providerId: true } },
      },
    });
    if (!bookings.length) return;

    const admins = await this.prisma.user.findMany({
      where: { roles: { some: { role: 'ADMIN' } }, status: 'ACTIVE' },
      select: { id: true },
    });
    const adminIds = admins.map((a) => a.id);

    for (const b of bookings) {
      const handover = b.status === BookingStatus.CONFIRMED;
      const days = daysPast(handover ? b.startDate : b.endDate, now);
      const parties = [b.travelerId, b.listing.providerId, ...(b.assignedStaffId ? [b.assignedStaffId] : [])];
      const title = b.listing.title;

      await this.notifyOnce(
        b.id,
        handover ? 'handover' : 'return',
        [...parties, ...adminIds],
        handover ? 'Đơn thuê quá hạn bàn giao' : 'Đơn thuê quá hạn trả',
        handover
          ? `Đơn thuê "${title}" đã qua ngày bắt đầu nhưng chưa được bàn giao. Nhân viên FlexTrip sẽ liên hệ các bên.`
          : `Đơn thuê "${title}" đã quá ngày trả. Vui lòng trả thiết bị sớm; trả trễ có thể phải bồi thường.`,
      );

      if (days >= (handover ? HANDOVER_ADMIN_DAYS : LATE_RETURN_DISPUTE_DAYS)) {
        await this.notifyOnce(
          b.id,
          handover ? 'handover-admin' : 'return-admin',
          adminIds,
          handover ? 'Cần xử lý đơn quá hạn bàn giao' : 'Cần mở tranh chấp trả trễ',
          `Đơn thuê "${title}" đã quá hạn ${days} ngày. Vui lòng xử lý trong mục Quản lý Booking.`,
        );
      }
    }
    this.logger.log(`Overdue scan: ${bookings.length} booking(s)`);
  }

  // A missed or repeated run must neither skip nor duplicate a notice
  private async notifyOnce(bookingId: string, kind: string, userIds: string[], title: string, body: string) {
    if (!userIds.length) return;
    const overdueKey = `${kind}:${bookingId}`;
    const sent = await this.prisma.notification.findFirst({
      where: { data: { path: ['overdueKey'], equals: overdueKey } },
      select: { id: true },
    });
    if (sent) return;
    await this.prisma.notification.createMany({
      data: [...new Set(userIds)].map((userId) => ({
        userId, type: NotificationType.BOOKING, title, body, data: { bookingId, overdueKey },
      })),
    });
  }
}
