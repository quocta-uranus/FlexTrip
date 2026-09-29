import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { BookingStatus, CancelledBy, NotificationType, Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { BOOKING_QUEUE, BookingJob } from './booking.constants';

@Processor(BOOKING_QUEUE)
export class BookingProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ bookingId: string }>): Promise<void> {
    const { bookingId } = job.data;

    switch (job.name) {
      case BookingJob.HOLD_EXPIRY:
        await this.handleHoldExpiry(bookingId);
        break;
      case BookingJob.AUTO_START:
        await this.handleAutoStart(bookingId);
        break;
      case BookingJob.REMINDER:
        await this.handleReminder(bookingId);
        break;
      default:
        this.logger.warn(`Unknown job: ${job.name}`);
    }
  }

  // ─── Hold expiry: PENDING_PAYMENT → CANCELLED sau 15 phút ────────────────

  private async handleHoldExpiry(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, travelerId: true },
    });
    if (!booking || booking.status !== BookingStatus.PENDING_PAYMENT) return;

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledBy: CancelledBy.SYSTEM,
        cancellationReason: 'Hết thời gian giữ chỗ (15 phút)',
        cancelledAt: new Date(),
      },
    });

    await this.notify(
      booking.travelerId,
      NotificationType.BOOKING,
      'Booking đã hết hạn giữ chỗ',
      'Bạn chưa hoàn tất thanh toán trong 15 phút. Booking đã bị huỷ tự động.',
      { bookingId },
    );

    this.logger.log(`Hold expired → CANCELLED: ${bookingId}`);
  }

  // ─── Auto-start: CONFIRMED → IN_PROGRESS khi đến startDate ───────────────

  private async handleAutoStart(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, travelerId: true, listing: { select: { title: true, providerId: true } } },
    });
    if (!booking || booking.status !== BookingStatus.CONFIRMED) return;

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.IN_PROGRESS },
    });

    await Promise.all([
      this.notify(
        booking.travelerId,
        NotificationType.BOOKING,
        'Chuyến thuê đã bắt đầu!',
        `Đơn thuê "${booking.listing.title}" của bạn đã bắt đầu hôm nay.`,
        { bookingId },
      ),
      this.notify(
        booking.listing.providerId,
        NotificationType.BOOKING,
        'Chuyến thuê đã bắt đầu',
        `Đơn thuê "${booking.listing.title}" đã bắt đầu hôm nay.`,
        { bookingId },
      ),
    ]);

    this.logger.log(`Auto-start → IN_PROGRESS: ${bookingId}`);
  }

  // ─── Reminder: notification 3 ngày trước startDate ───────────────────────

  private async handleReminder(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true, status: true, startDate: true, travelerId: true,
        listing: { select: { title: true, providerId: true } },
      },
    });
    if (!booking || booking.status !== BookingStatus.CONFIRMED) return;

    const startStr = new Date(booking.startDate).toLocaleDateString('vi-VN');

    await Promise.all([
      this.notify(
        booking.travelerId,
        NotificationType.BOOKING,
        'Nhắc nhở: sắp đến ngày thuê',
        `Đơn thuê "${booking.listing.title}" sẽ bắt đầu vào ${startStr}. Lưu ý: huỷ sau thời điểm này sẽ mất deposit.`,
        { bookingId },
      ),
      this.notify(
        booking.listing.providerId,
        NotificationType.BOOKING,
        'Nhắc nhở: đơn thuê sắp bắt đầu',
        `Đơn thuê "${booking.listing.title}" sẽ bắt đầu vào ${startStr}.`,
        { bookingId },
      ),
    ]);

    this.logger.log(`Reminder sent: ${bookingId}`);
  }

  private notify(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title, body, data: (data ?? null) as Prisma.InputJsonValue },
    });
  }
}
