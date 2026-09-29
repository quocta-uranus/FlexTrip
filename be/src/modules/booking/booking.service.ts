import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { BookingStatus, CancelledBy, DeliveryMethod, NotificationType, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { paginate, skipTake } from '../../common/dto/pagination.dto';
import {
  CancelBookingDto, ConfirmPaymentDto, CreateBookingDto,
  DeclineBookingDto, ListBookingsQueryDto,
} from './dto/booking.dto';
import { BOOKING_QUEUE, BookingJob, HOLD_MINUTES, REMINDER_DAYS_BEFORE } from './booking.constants';

const BOOKING_INCLUDE = {
  listing: {
    select: {
      id: true, title: true, imageUrls: true, location: true,
      price: true, currency: true, providerId: true,
      provider: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
  traveler: { select: { id: true, name: true, avatarUrl: true, email: true } },
  payment: { select: { id: true, status: true, method: true, amount: true, transactionId: true } },
} satisfies Prisma.BookingInclude;

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilitySvc: AvailabilityService,
    @InjectQueue(BOOKING_QUEUE) private readonly bookingQueue: Queue,
  ) {}

  // ─── BOOK-01: Create booking → PENDING_PAYMENT ───────────────────────────

  async create(travelerId: string, dto: CreateBookingDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate)
      throw new BadRequestException('endDate phải sau startDate');
    if (startDate < new Date(new Date().toDateString()))
      throw new BadRequestException('Không thể đặt ngày trong quá khứ');

    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: {
        id: true, title: true, status: true, price: true,
        currency: true, providerId: true, quantity: true, depositRate: true,
      },
    });
    if (!listing) throw new NotFoundException('Listing không tồn tại');
    if (listing.status !== 'ACTIVE')
      throw new BadRequestException('Listing không còn hoạt động');
    if (listing.providerId === travelerId)
      throw new BadRequestException('Không thể đặt listing của chính mình');

    const qty = dto.quantity ?? 1;
    const check = await this.availabilitySvc.checkAvailability(
      dto.listingId, startDate, endDate, qty,
    );
    if (!check.available) {
      const msg: Record<string, string> = {
        BLOCKED_DATE: 'Listing không nhận đặt trong khoảng ngày này',
        INSUFFICIENT_STOCK: 'Không đủ số lượng trong khoảng ngày đã chọn',
        MIN_RENTAL_DAYS: 'Số ngày thuê chưa đạt tối thiểu',
        MAX_RENTAL_DAYS: 'Số ngày thuê vượt quá giới hạn tối đa',
      };
      throw new BadRequestException(msg[check.reason!] ?? 'Không khả dụng');
    }

    const rentalDays =
      Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    const unitPrice = listing.price.toNumber();
    const totalPrice = unitPrice * qty * rentalDays;
    const depositAmount = totalPrice * listing.depositRate.toNumber();
    const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);

    const booking = await this.prisma.booking.create({
      data: {
        travelerId,
        listingId: dto.listingId,
        startDate,
        endDate,
        quantity: qty,
        totalPrice,
        depositAmount,
        deliveryMethod: dto.deliveryMethod ?? DeliveryMethod.PICKUP,
        deliveryAddress: dto.deliveryAddress,
        notes: dto.notes,
        status: BookingStatus.PENDING_PAYMENT,
        holdExpiresAt,
      },
      include: BOOKING_INCLUDE,
    });

    // Schedule hold expiry job
    await this.bookingQueue.add(
      BookingJob.HOLD_EXPIRY,
      { bookingId: booking.id },
      { delay: HOLD_MINUTES * 60_000, jobId: `hold-${booking.id}`, removeOnComplete: true },
    );

    return {
      ...booking,
      summary: { rentalDays, unitPrice, totalPrice, depositAmount, holdExpiresAt, holdMinutes: HOLD_MINUTES },
    };
  }

  // ─── BOOK-01: Confirm payment → PENDING_APPROVAL ─────────────────────────

  async confirmPayment(bookingId: string, travelerId: string, dto: ConfirmPaymentDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: { select: { id: true, title: true, providerId: true } }, payment: true },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.travelerId !== travelerId) throw new ForbiddenException();
    if (booking.status !== BookingStatus.PENDING_PAYMENT)
      throw new BadRequestException('Booking không ở trạng thái chờ thanh toán');
    if (booking.holdExpiresAt && booking.holdExpiresAt < new Date())
      throw new BadRequestException('Thời gian giữ chỗ đã hết, vui lòng đặt lại');

    // Remove hold expiry job — không cần cancel nữa
    await this.bookingQueue.remove(`hold-${bookingId}`);

    const [updated] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.PENDING_APPROVAL, holdExpiresAt: null },
        include: BOOKING_INCLUDE,
      }),
      this.prisma.payment.upsert({
        where: { bookingId },
        create: {
          bookingId,
          amount: booking.totalPrice,
          currency: 'VND',
          method: dto.method,
          transactionId: dto.transactionRef ?? null,
          status: 'PAID',
        },
        update: { method: dto.method, transactionId: dto.transactionRef ?? null, status: 'PAID' },
      }),
      this.notify(
        booking.listing.providerId,
        NotificationType.BOOKING,
        'Yêu cầu đặt chỗ mới',
        `Traveler vừa đặt "${booking.listing.title}". Vui lòng duyệt hoặc từ chối.`,
        { bookingId },
      ),
    ]);

    return updated;
  }

  // ─── BOOK-06: List bookings ───────────────────────────────────────────────

  async findAll(userId: string, query: ListBookingsQueryDto) {
    const { page, limit, status, as } = query;
    const { skip, take } = skipTake({ page, limit });

    const where: Prisma.BookingWhereInput = {
      ...(status ? { status } : {}),
      ...(as === 'provider'
        ? { listing: { providerId: userId } }
        : { travelerId: userId }),
    };

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({ where, include: BOOKING_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.booking.count({ where }),
    ]);

    return paginate(items, total, { page, limit });
  }

  // ─── BOOK-06: Single booking ──────────────────────────────────────────────

  async findOne(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        ...BOOKING_INCLUDE,
        modifyRequests: { orderBy: { createdAt: 'desc' }, take: 5 },
        disputes: { select: { id: true, status: true, type: true, createdAt: true } },
        contract: { select: { id: true, status: true, signedAt: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');

    const isOwner =
      booking.travelerId === userId || booking.listing.providerId === userId;
    if (!isOwner) throw new ForbiddenException();

    return booking;
  }

  // ─── BOOK-04: Provider approve → CONFIRMED ───────────────────────────────

  async approve(bookingId: string, providerId: string) {
    const booking = await this.assertProviderOwns(bookingId, providerId);

    if (booking.status !== BookingStatus.PENDING_APPROVAL)
      throw new BadRequestException('Chỉ có thể duyệt booking đang chờ xác nhận');

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
      include: BOOKING_INCLUDE,
    });

    // Schedule reminder 3 ngày trước startDate nếu còn kịp
    const msUntilStart = new Date(booking.startDate).getTime() - Date.now();
    const msUntilReminder = msUntilStart - REMINDER_DAYS_BEFORE * 86_400_000;
    if (msUntilReminder > 0) {
      await this.bookingQueue.add(
        BookingJob.REMINDER,
        { bookingId },
        { delay: msUntilReminder, jobId: `reminder-${bookingId}`, removeOnComplete: true },
      );
    }

    await this.notify(
      booking.travelerId,
      NotificationType.BOOKING,
      'Đặt chỗ đã được xác nhận!',
      `Provider đã duyệt đơn thuê "${booking.listing.title}". Chúc bạn có chuyến đi vui vẻ!`,
      { bookingId },
    );

    return updated;
  }

  // ─── BOOK-04: Provider decline → CANCELLED + hoàn tiền ───────────────────

  async decline(bookingId: string, providerId: string, dto: DeclineBookingDto) {
    const booking = await this.assertProviderOwns(bookingId, providerId);

    if (booking.status !== BookingStatus.PENDING_APPROVAL)
      throw new BadRequestException('Chỉ có thể từ chối booking đang chờ xác nhận');

    await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledBy: CancelledBy.PROVIDER,
          cancellationReason: dto.reason,
          cancelledAt: new Date(),
        },
      }),
      ...(booking.payment
        ? [this.prisma.payment.update({ where: { bookingId }, data: { status: 'REFUNDED' } })]
        : []),
      this.notify(
        booking.travelerId,
        NotificationType.BOOKING,
        'Đặt chỗ bị từ chối',
        `Provider từ chối đơn thuê "${booking.listing.title}": ${dto.reason}. Tiền sẽ được hoàn trong 3–5 ngày.`,
        { bookingId },
      ),
    ]);

    return { message: 'Đã từ chối và hoàn tiền cho Traveler' };
  }

  // ─── Provider: CONFIRMED → IN_PROGRESS (bắt đầu cho thuê) ───────────────

  async start(bookingId: string, providerId: string) {
    const booking = await this.assertProviderOwns(bookingId, providerId);

    if (booking.status !== BookingStatus.CONFIRMED)
      throw new BadRequestException('Chỉ có thể bắt đầu booking đang ở trạng thái CONFIRMED');

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.IN_PROGRESS },
      include: BOOKING_INCLUDE,
    });

    await Promise.all([
      this.notify(
        booking.travelerId,
        NotificationType.BOOKING,
        'Chuyến thuê đã bắt đầu!',
        `Provider đã xác nhận giao đồ "${booking.listing.title}". Chúc bạn có chuyến đi vui!`,
        { bookingId },
      ),
    ]);

    return updated;
  }

  // ─── Provider: IN_PROGRESS → COMPLETED (hoàn thành cho thuê) ────────────

  async complete(bookingId: string, providerId: string) {
    const booking = await this.assertProviderOwns(bookingId, providerId);

    if (booking.status !== BookingStatus.IN_PROGRESS)
      throw new BadRequestException('Chỉ có thể hoàn thành booking đang ở trạng thái IN_PROGRESS');

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.COMPLETED },
      include: BOOKING_INCLUDE,
    });

    await this.notify(
      booking.travelerId,
      NotificationType.BOOKING,
      'Chuyến thuê đã hoàn thành',
      `Đơn thuê "${booking.listing.title}" đã được hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ!`,
      { bookingId },
    );

    return updated;
  }

  // ─── BOOK-07: Cancel booking ──────────────────────────────────────────────

  async cancel(bookingId: string, userId: string, dto: CancelBookingDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: { select: { id: true, title: true, providerId: true } }, payment: true },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');

    const isTraveler = booking.travelerId === userId;
    const isProvider = booking.listing.providerId === userId;
    if (!isTraveler && !isProvider) throw new ForbiddenException();

    const cancelledBy = isProvider ? CancelledBy.PROVIDER : CancelledBy.TRAVELER;

    switch (booking.status) {
      case BookingStatus.PENDING_PAYMENT: {
        if (!isTraveler)
          throw new BadRequestException('Chỉ Traveler có thể huỷ khi chưa thanh toán');
        await this.bookingQueue.remove(`hold-${bookingId}`);
        await this.prisma.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.CANCELLED, cancelledBy, cancellationReason: dto.reason, cancelledAt: new Date() },
        });
        return { message: 'Đã huỷ booking', refundAmount: 0 };
      }

      case BookingStatus.PENDING_APPROVAL: {
        await this.cancelWithRefund(bookingId, !!booking.payment, cancelledBy, dto.reason, true);
        const notifyId = isTraveler ? booking.listing.providerId : booking.travelerId;
        await this.notify(notifyId, NotificationType.BOOKING, 'Booking đã bị huỷ',
          `${isTraveler ? 'Traveler' : 'Provider'} đã huỷ "${booking.listing.title}". Tiền hoàn 100%.`,
          { bookingId });
        return { message: 'Đã huỷ, hoàn tiền 100%', refundAmount: Number(booking.depositAmount) };
      }

      case BookingStatus.CONFIRMED: {
        if (isProvider) {
          await this.removeScheduledJobs(bookingId);
          await this.cancelWithRefund(bookingId, !!booking.payment, cancelledBy, dto.reason, true);
          await this.notify(booking.travelerId, NotificationType.BOOKING, 'Provider huỷ booking',
            `Provider huỷ "${booking.listing.title}". Bạn sẽ được hoàn 100%.`, { bookingId });
          return { message: 'Đã huỷ, hoàn tiền 100%', refundAmount: Number(booking.depositAmount) };
        }
        const daysUntilStart = Math.ceil(
          (new Date(booking.startDate).getTime() - Date.now()) / 86_400_000,
        );
        const fullRefund = daysUntilStart >= REMINDER_DAYS_BEFORE;
        await this.removeScheduledJobs(bookingId);
        await this.cancelWithRefund(bookingId, !!booking.payment, cancelledBy, dto.reason, fullRefund);
        await this.notify(booking.listing.providerId, NotificationType.BOOKING, 'Traveler huỷ booking',
          `Traveler huỷ "${booking.listing.title}" (còn ${daysUntilStart} ngày). ${fullRefund ? 'Hoàn 100%.' : 'Deposit được giữ lại.'}`,
          { bookingId });
        return {
          message: fullRefund ? 'Đã huỷ, hoàn tiền 100%' : 'Đã huỷ, deposit không được hoàn do huỷ trong vòng 3 ngày',
          refundAmount: fullRefund ? Number(booking.depositAmount) : 0,
        };
      }

      case BookingStatus.IN_PROGRESS:
      case BookingStatus.COMPLETED:
        throw new BadRequestException('Không thể huỷ đơn đang thuê hoặc đã hoàn tất');

      default:
        throw new BadRequestException('Trạng thái không cho phép huỷ');
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async cancelWithRefund(
    bookingId: string,
    hasPayment: boolean,
    cancelledBy: CancelledBy,
    reason: string | null | undefined,
    doRefund: boolean,
  ) {
    await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED, cancelledBy, cancellationReason: reason, cancelledAt: new Date() },
      }),
      ...(hasPayment && doRefund
        ? [this.prisma.payment.update({ where: { bookingId }, data: { status: 'REFUNDED' } })]
        : []),
    ]);
  }

  private async removeScheduledJobs(bookingId: string) {
    await Promise.allSettled([
      this.bookingQueue.remove(`autostart-${bookingId}`),
      this.bookingQueue.remove(`reminder-${bookingId}`),
    ]);
  }

  private async assertProviderOwns(bookingId: string, providerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: { select: { id: true, title: true, providerId: true } },
        payment: { select: { id: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.listing.providerId !== providerId)
      throw new ForbiddenException('Bạn không phải provider của listing này');
    return booking;
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
