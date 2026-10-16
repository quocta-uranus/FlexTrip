import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Optional } from '@nestjs/common';
import { BookingStatus, CancelledBy, NotificationType, Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { BOOKING_QUEUE, BookingJob, isRentalSettled } from './booking.constants';

@Processor(BOOKING_QUEUE)
export class BookingProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly paymentsSvc?: PaymentsService,
  ) {
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
      case BookingJob.CONTRACT_SIGN_REMINDER:
        await this.handleContractSignReminder(bookingId);
        break;
      case BookingJob.AUTO_COMPLETE:
        await this.handleAutoComplete(bookingId);
        break;
      case BookingJob.ID_DOC_PURGE:
        await this.handleIdDocPurge(bookingId);
        break;
      case BookingJob.BALANCE_EXPIRY:
        await this.handleBalanceExpiry(bookingId);
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

  // ─── Balance expiry: CONFIRMED → CANCELLED nếu 24h sau khi duyệt vẫn chưa trả nốt ──

  private async handleBalanceExpiry(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true, status: true, travelerId: true,
        listing: { select: { title: true, providerId: true } },
        payment: { select: { rentalAmount: true, rentalPaidAt: true } },
      },
    });
    if (!booking || booking.status !== BookingStatus.CONFIRMED) return;
    if (!booking.payment || isRentalSettled(booking.payment)) return;

    await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledBy: CancelledBy.SYSTEM,
          cancellationReason: 'Quá hạn thanh toán tiền thuê (24 giờ sau khi provider duyệt)',
          cancelledAt: new Date(),
          balanceDueAt: null,
        },
      }),
      this.prisma.payment.update({ where: { bookingId }, data: { status: 'REFUNDED' } }),
    ]);
    // Huỷ do hệ thống → hoàn lại phần cọc đã trả
    await this.paymentsSvc?.onBookingCancelled(bookingId, CancelledBy.SYSTEM, BookingStatus.CONFIRMED);

    await Promise.all([
      this.notify(booking.travelerId, NotificationType.BOOKING, 'Đơn thuê đã bị huỷ',
        `Bạn chưa thanh toán tiền thuê "${booking.listing.title}" trong 24 giờ nên đơn đã bị huỷ. Tiền cọc được hoàn vào ví.`,
        { bookingId }),
      this.notify(booking.listing.providerId, NotificationType.BOOKING, 'Đơn thuê đã bị huỷ',
        `Khách không thanh toán tiền thuê "${booking.listing.title}" đúng hạn nên đơn đã bị huỷ.`,
        { bookingId }),
    ]);

    this.logger.log(`Balance expired → CANCELLED: ${bookingId}`);
  }

  // ─── Auto-start: CONFIRMED → IN_PROGRESS khi đến startDate ───────────────

  private async handleAutoStart(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true, status: true, travelerId: true,
        listing: { select: { title: true, providerId: true } },
        payment: { select: { rentalAmount: true, rentalPaidAt: true } },
      },
    });
    if (!booking || booking.status !== BookingStatus.CONFIRMED) return;
    // Chưa trả nốt thì giữ CONFIRMED; job balance-expiry sẽ huỷ khi hết hạn
    if (booking.payment && !isRentalSettled(booking.payment)) return;

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

  // ─── Contract sign reminder: nhắc provider sau 24h chưa ký ─────────────────

  private async handleContractSignReminder(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        status: true,
        listing: { select: { providerId: true, title: true } },
        contract: { select: { status: true } },
      },
    });
    if (!booking || booking.status !== 'PENDING_APPROVAL') return;
    if (booking.contract?.status !== 'TRAVELER_SIGNED') return;

    await this.notify(
      booking.listing.providerId,
      NotificationType.BOOKING,
      'Nhắc nhở: hợp đồng chờ ký',
      `Đơn thuê "${booking.listing.title}" đang chờ bạn ký hợp đồng để xác nhận.`,
      { bookingId },
    );

    this.logger.log(`Contract sign reminder sent: ${bookingId}`);
  }

  // ─── Auto-complete: IN_PROGRESS → COMPLETED sau endDate + 48h ───────────────

  private async handleAutoComplete(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true, status: true, travelerId: true,
        listing: { select: { title: true, providerId: true } },
      },
    });
    if (!booking || booking.status !== 'IN_PROGRESS') return;

    await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'COMPLETED' },
      }),
      this.prisma.contract.update({
        where: { bookingId },
        data: { status: 'CLOSED' },
      }),
    ]);

    await Promise.all([
      this.notify(booking.travelerId, NotificationType.BOOKING, 'Chuyến thuê đã hoàn thành (tự động)',
        `Đơn thuê "${booking.listing.title}" đã được tự động đánh dấu hoàn thành sau 48 giờ.`, { bookingId }),
      this.notify(booking.listing.providerId, NotificationType.BOOKING, 'Chuyến thuê đã hoàn thành (tự động)',
        `Đơn thuê "${booking.listing.title}" đã được tự động hoàn thành.`, { bookingId }),
    ]);

    // Trigger commission split + deposit release timer (same as manual complete)
    await this.paymentsSvc?.onBookingCompleted(bookingId);

    this.logger.log(`Auto-complete → COMPLETED: ${bookingId}`);
  }

  // ─── ID doc purge: xóa idDocumentUrl sau 90 ngày ─────────────────────────────

  private async handleIdDocPurge(bookingId: string) {
    await this.prisma.contract.update({
      where: { bookingId },
      data: { idDocumentUrl: null, idDocumentType: null },
    }).catch(() => null);
    this.logger.log(`ID doc purged: ${bookingId}`);
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
