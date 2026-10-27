import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { BookingStatus, CancelledBy, DeliveryMethod, NotificationType, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { ContractsService } from '../contracts/contracts.service';
import { paginate, skipTake } from '../../common/dto/pagination.dto';
import {
  CancelBookingDto, ConfirmPaymentDto, CreateBookingDto,
  DeclineBookingDto, ListBookingsQueryDto,
} from './dto/booking.dto';
import {
  BOOKING_QUEUE, BookingJob, HOLD_MINUTES, REMINDER_DAYS_BEFORE, RENTAL_UNPAID_MESSAGE, STAFF_ASSIGNED_MESSAGE, isRentalSettled,
} from './booking.constants';
import { PaymentsService } from '../payments/payments.service';

const BOOKING_INCLUDE = {
  listing: {
    select: {
      id: true, title: true, imageUrls: true, location: true,
      price: true, currency: true, providerId: true,
      provider: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
  traveler: { select: { id: true, name: true, avatarUrl: true, email: true } },
  payment: { select: { id: true, status: true, gateway: true, totalAmount: true, gatewayTransId: true, rentalAmount: true, depositAmount: true, rentalPaidAt: true } },
  assignedStaff: {
    select: {
      id: true, name: true, avatarUrl: true, email: true, phone: true,
      staffProfile: { select: { employeeCode: true, phone: true, regions: true } },
    },
  },
} satisfies Prisma.BookingInclude;

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilitySvc: AvailabilityService,
    private readonly contractsSvc: ContractsService,
    @InjectQueue(BOOKING_QUEUE) private readonly bookingQueue: Queue,
    @Optional() private readonly paymentsSvc?: PaymentsService,
  ) {}

  // ─── BOOK-01: Create booking → PENDING_PAYMENT ───────────────────────────

  async create(travelerId: string, dto: CreateBookingDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate > endDate)
      throw new BadRequestException('endDate không được trước startDate');
    if (startDate < new Date(new Date().toDateString()))
      throw new BadRequestException('Không thể đặt ngày trong quá khứ');

    const qty = dto.quantity ?? 1;
    const rentalDays =
      Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;

    const { booking, summary } = await this.prisma.$transaction(async (tx) => {
      // Row lock on Listing to serialize concurrent direct bookings
      await tx.$queryRaw`SELECT "id" FROM "Listing" WHERE "id" = ${dto.listingId} FOR UPDATE`;

      const listing = await tx.listing.findUnique({
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
        throw new BadRequestException({ code: 'OWN_LISTING', message: 'Không thể đặt listing của chính mình' });

      const check = await this.availabilitySvc.checkAvailability(
        dto.listingId, startDate, endDate, qty, undefined, tx,
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

      const unitPrice = listing.price.toNumber();
      const totalPrice = unitPrice * qty * rentalDays;
      const depositAmount = totalPrice * listing.depositRate.toNumber();
      const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);

      const createdBooking = await tx.booking.create({
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

      return {
        booking: createdBooking,
        summary: { rentalDays, unitPrice, totalPrice, depositAmount, holdExpiresAt, holdMinutes: HOLD_MINUTES },
      };
    });

    // Schedule hold expiry job (outside transaction)
    await this.bookingQueue.add(
      BookingJob.HOLD_EXPIRY,
      { bookingId: booking.id },
      { delay: HOLD_MINUTES * 60_000, jobId: `hold-${booking.id}`, removeOnComplete: true },
    );

    return {
      ...booking,
      summary,
    };
  }

  // ─── BOOK-01: Confirm payment → PENDING_APPROVAL ─────────────────────────

  async confirmPayment(bookingId: string, travelerId: string, dto: ConfirmPaymentDto) {
    const initialBooking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, travelerId: true, listingId: true, status: true },
    });
    if (!initialBooking) throw new NotFoundException('Booking không tồn tại');
    if (initialBooking.travelerId !== travelerId) throw new ForbiddenException();

    // Remove hold expiry job
    await this.bookingQueue.remove(`hold-${bookingId}`);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Row lock on Listing
      await tx.$queryRaw`SELECT "id" FROM "Listing" WHERE "id" = ${initialBooking.listingId} FOR UPDATE`;

      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { listing: { select: { id: true, title: true, providerId: true } }, payment: true },
      });
      if (!booking) throw new NotFoundException('Booking không tồn tại');
      if (booking.status !== BookingStatus.PENDING_PAYMENT)
        throw new BadRequestException('Booking không ở trạng thái chờ thanh toán');
      if (booking.holdExpiresAt && booking.holdExpiresAt < new Date())
        throw new BadRequestException('Thời gian giữ chỗ đã hết, vui lòng đặt lại');

      // Verify availability excluding this booking to ensure stock is still reserved
      const check = await this.availabilitySvc.checkAvailabilityExcludingBooking(
        bookingId,
        new Date(booking.startDate),
        new Date(booking.endDate),
        booking.quantity,
        tx,
      );
      if (!check.available) {
        throw new BadRequestException('Khoảng ngày đã chọn không còn khả dụng để xác nhận thanh toán');
      }

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.PENDING_APPROVAL, holdExpiresAt: null },
        include: BOOKING_INCLUDE,
      });

      const depositAmt = Number(booking.depositAmount);
      const totalAmt = Number(booking.totalPrice);
      await tx.payment.upsert({
        where: { bookingId },
        create: {
          bookingId,
          totalAmount: booking.totalPrice,
          rentalAmount: totalAmt - depositAmt,
          depositAmount: booking.depositAmount,
          currency: 'VND',
          gatewayTransId: dto.transactionRef ?? null,
          status: 'PAID',
          rentalPaidAt: new Date(),
        },
        update: { gatewayTransId: dto.transactionRef ?? null, status: 'PAID' },
      });

      return updatedBooking;
    });

    // Notify provider outside transaction
    await this.notify(
      updated.listing.providerId,
      NotificationType.BOOKING,
      'Yêu cầu đặt chỗ mới',
      `Traveler vừa đặt "${updated.listing.title}". Vui lòng duyệt hoặc từ chối.`,
      { bookingId },
    );

    // Auto-generate contract + traveler signs (atomic với payment confirmation)
    await this.contractsSvc.generate(bookingId);

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
        contract: { select: { id: true, status: true, travelerSignedAt: true, providerSignedAt: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');

    const isOwner =
      booking.travelerId === userId || booking.listing.providerId === userId;
    if (!isOwner) throw new ForbiddenException();

    return booking;
  }

  // ─── BOOK-04: Provider approve → ký hợp đồng → CONFIRMED ───────────────────

  async approve(bookingId: string, providerId: string) {
    const booking = await this.assertProviderOwns(bookingId, providerId);

    if (booking.status !== BookingStatus.PENDING_APPROVAL)
      throw new BadRequestException('Chỉ có thể duyệt booking đang chờ xác nhận');

    // Ký hợp đồng + chuyển booking sang CONFIRMED (trong 1 transaction ở contractsSvc)
    await this.contractsSvc.providerSign(bookingId, providerId);

    return this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: BOOKING_INCLUDE,
    });
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
        `Provider từ chối đơn thuê "${booking.listing.title}": ${dto.reason}. Tiền đã được hoàn về ví FlexTrip của bạn.`,
        { bookingId },
      ),
    ]);

    // The status flip above does not move money; the refund job credits the wallet and releases the frozen deposit
    if (booking.payment && this.paymentsSvc) {
      await this.paymentsSvc.onBookingCancelled(bookingId, CancelledBy.PROVIDER, BookingStatus.PENDING_APPROVAL);
    }

    return { message: 'Đã từ chối và hoàn tiền cho Traveler' };
  }

  // ─── Provider: CONFIRMED → IN_PROGRESS (bắt đầu cho thuê) ───────────────

  async start(bookingId: string, providerId: string) {
    const booking = await this.assertProviderOwns(bookingId, providerId);

    if (booking.status !== BookingStatus.CONFIRMED)
      throw new BadRequestException('Chỉ có thể bắt đầu booking đang ở trạng thái CONFIRMED');
    if (booking.assignedStaffId)
      throw new ConflictException({ code: 'STAFF_ASSIGNED', message: STAFF_ASSIGNED_MESSAGE });
    if (booking.payment && !isRentalSettled(booking.payment))
      throw new BadRequestException(RENTAL_UNPAID_MESSAGE);

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
    if (booking.assignedStaffId)
      throw new ConflictException({ code: 'STAFF_ASSIGNED', message: STAFF_ASSIGNED_MESSAGE });

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

    // Trigger commission split + deposit release timer
    await this.paymentsSvc?.onBookingCompleted(bookingId);

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
          // Ghi strike cho provider — 3 strikes/tháng → tạm khóa listing (Phase 2)
          await this.prisma.providerProfile.updateMany({
            where: { userId: booking.listing.providerId },
            data: { cancellationStrikes: { increment: 1 } },
          }).catch(() => null); // non-critical: don't fail cancel if profile missing
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
    preCancelStatus?: BookingStatus,
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

    if (hasPayment && doRefund && this.paymentsSvc) {
      await this.paymentsSvc.onBookingCancelled(
        bookingId,
        cancelledBy,
        preCancelStatus ?? BookingStatus.CONFIRMED,
      );
    }
  }

  private async removeScheduledJobs(bookingId: string) {
    await Promise.allSettled([
      this.bookingQueue.remove(`autostart-${bookingId}`),
      this.bookingQueue.remove(`reminder-${bookingId}`),
      this.bookingQueue.remove(`balance-${bookingId}`),
    ]);
  }

  private async assertProviderOwns(bookingId: string, providerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: { select: { id: true, title: true, providerId: true } },
        payment: { select: { id: true, rentalAmount: true, rentalPaidAt: true } },
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
