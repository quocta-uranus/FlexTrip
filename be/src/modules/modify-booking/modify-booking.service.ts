import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { BookingStatus, ModifyRequestStatus, NotificationType, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { BOOKING_QUEUE, BookingJob, REMINDER_DAYS_BEFORE } from '../booking/booking.constants';
import { CreateModifyRequestDto, RespondModifyRequestDto } from './dto/modify-booking.dto';

@Injectable()
export class ModifyBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilitySvc: AvailabilityService,
    @InjectQueue(BOOKING_QUEUE) private readonly bookingQueue: Queue,
  ) {}

  // ─── BOOK-05: Traveler yêu cầu thay đổi booking ──────────────────────────

  async createRequest(bookingId: string, travelerId: string, dto: CreateModifyRequestDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, travelerId: true, status: true, quantity: true },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.travelerId !== travelerId) throw new ForbiddenException();
    if (booking.status !== BookingStatus.CONFIRMED)
      throw new BadRequestException('Chỉ có thể yêu cầu thay đổi booking đang ở trạng thái CONFIRMED');

    // Kiểm tra không có request đang PENDING
    const existing = await this.prisma.bookingModifyRequest.findFirst({
      where: { bookingId, status: ModifyRequestStatus.PENDING },
    });
    if (existing)
      throw new BadRequestException('Đã có yêu cầu thay đổi đang chờ xử lý');

    const newStartDate = new Date(dto.newStartDate);
    const newEndDate = new Date(dto.newEndDate);

    if (newStartDate >= newEndDate)
      throw new BadRequestException('newEndDate phải sau newStartDate');

    const newQty = dto.newQuantity ?? booking.quantity;

    // Kiểm tra availability cho ngày mới (bỏ qua booking hiện tại)
    const check = await this.availabilitySvc.checkAvailabilityExcludingBooking(
      booking.id, newStartDate, newEndDate, newQty,
    );
    if (!check.available) {
      const msg: Record<string, string> = {
        BLOCKED_DATE: 'Ngày mới bị chặn bởi provider',
        INSUFFICIENT_STOCK: 'Không đủ số lượng cho ngày mới',
        MIN_RENTAL_DAYS: 'Số ngày thuê mới chưa đạt tối thiểu',
        MAX_RENTAL_DAYS: 'Số ngày thuê mới vượt quá giới hạn',
      };
      throw new BadRequestException(msg[check.reason!] ?? 'Ngày mới không khả dụng');
    }

    const request = await this.prisma.bookingModifyRequest.create({
      data: {
        bookingId,
        requestedById: travelerId,
        newStartDate,
        newEndDate,
        newQuantity: dto.newQuantity,
        reason: dto.reason,
      },
      include: { requestedBy: { select: { id: true, name: true, avatarUrl: true } } },
    });

    // Notify provider
    const fullBooking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { listing: { select: { title: true, providerId: true } } },
    });
    if (fullBooking) {
      await this.prisma.notification.create({
        data: {
          userId: fullBooking.listing.providerId,
          type: NotificationType.BOOKING,
          title: 'Yêu cầu thay đổi booking',
          body: `Traveler yêu cầu đổi ngày thuê "${fullBooking.listing.title}".`,
          data: { bookingId, requestId: request.id } as Prisma.InputJsonValue,
        },
      });
    }

    return request;
  }

  // ─── Lấy danh sách requests của booking ──────────────────────────────────

  async listRequests(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { travelerId: true, listing: { select: { providerId: true } } },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');

    const isParticipant =
      booking.travelerId === userId || booking.listing.providerId === userId;
    if (!isParticipant) throw new ForbiddenException();

    return this.prisma.bookingModifyRequest.findMany({
      where: { bookingId },
      include: { requestedBy: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── BOOK-05: Provider chấp nhận → cập nhật booking ─────────────────────

  async acceptRequest(requestId: string, providerId: string, dto: RespondModifyRequestDto) {
    const request = await this.assertProviderOwnsRequest(requestId, providerId);
    if (request.status !== ModifyRequestStatus.PENDING)
      throw new BadRequestException('Request không còn ở trạng thái chờ');

    const booking = request.booking;

    const newStartDate = new Date(request.newStartDate);
    const newEndDate = new Date(request.newEndDate);
    const newQty = request.newQuantity ?? booking.quantity;

    const rentalDays =
      Math.round((newEndDate.getTime() - newStartDate.getTime()) / 86_400_000) + 1;

    // Lấy giá từ listing
    const listing = await this.prisma.listing.findUnique({
      where: { id: booking.listingId },
      select: { price: true, depositRate: true },
    });
    if (!listing) throw new NotFoundException('Listing không tồn tại');

    const unitPrice = listing.price.toNumber();
    const totalPrice = unitPrice * newQty * rentalDays;
    const depositAmount = totalPrice * listing.depositRate.toNumber();

    // Cập nhật request + booking trong 1 transaction có lock Listing
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Listing" WHERE "id" = ${booking.listingId} FOR UPDATE`;

      const check = await this.availabilitySvc.checkAvailabilityExcludingBooking(
        booking.id,
        newStartDate,
        newEndDate,
        newQty,
        tx,
      );
      if (!check.available) {
        throw new BadRequestException('Khoảng ngày hoặc số lượng mới hiện không còn khả dụng để chấp nhận thay đổi');
      }

      await tx.bookingModifyRequest.update({
        where: { id: requestId },
        data: { status: ModifyRequestStatus.ACCEPTED, respondedAt: new Date() },
      });
      await tx.bookingModifyRequest.updateMany({
        where: { bookingId: booking.id, status: ModifyRequestStatus.PENDING, id: { not: requestId } },
        data: { status: ModifyRequestStatus.REJECTED, respondedAt: new Date() },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: { startDate: newStartDate, endDate: newEndDate, quantity: newQty, totalPrice, depositAmount },
      });
    });

    // Reschedule BullMQ jobs với ngày mới
    await this.rescheduleJobs(booking.id, newStartDate);

    // Notify traveler
    await this.prisma.notification.create({
      data: {
        userId: booking.travelerId,
        type: NotificationType.BOOKING,
        title: 'Yêu cầu thay đổi được chấp nhận',
        body: `Provider đã chấp nhận đổi ngày thuê của bạn.`,
        data: { bookingId: booking.id, requestId } as Prisma.InputJsonValue,
      },
    });

    return { message: 'Đã chấp nhận yêu cầu thay đổi booking' };
  }

  // ─── BOOK-05: Provider từ chối request ───────────────────────────────────

  async rejectRequest(requestId: string, providerId: string, dto: RespondModifyRequestDto) {
    const request = await this.assertProviderOwnsRequest(requestId, providerId);
    if (request.status !== ModifyRequestStatus.PENDING)
      throw new BadRequestException('Request không còn ở trạng thái chờ');

    await this.prisma.bookingModifyRequest.update({
      where: { id: requestId },
      data: { status: ModifyRequestStatus.REJECTED, respondedAt: new Date() },
    });

    // Notify traveler
    await this.prisma.notification.create({
      data: {
        userId: request.booking.travelerId,
        type: NotificationType.BOOKING,
        title: 'Yêu cầu thay đổi bị từ chối',
        body: dto.reason
          ? `Provider từ chối: ${dto.reason}`
          : 'Provider đã từ chối yêu cầu thay đổi ngày thuê.',
        data: { bookingId: request.booking.id, requestId } as Prisma.InputJsonValue,
      },
    });

    return { message: 'Đã từ chối yêu cầu thay đổi booking' };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async assertProviderOwnsRequest(requestId: string, providerId: string) {
    const request = await this.prisma.bookingModifyRequest.findUnique({
      where: { id: requestId },
      include: {
        booking: {
          select: {
            id: true, travelerId: true, status: true, quantity: true,
            listingId: true, startDate: true, endDate: true,
            listing: { select: { providerId: true } },
          },
        },
      },
    });
    if (!request) throw new NotFoundException('Request không tồn tại');
    if (request.booking.listing.providerId !== providerId) throw new ForbiddenException();
    return request;
  }

  private async rescheduleJobs(bookingId: string, newStartDate: Date) {
    // Xoá job cũ
    await Promise.allSettled([
      this.bookingQueue.remove(`autostart-${bookingId}`),
      this.bookingQueue.remove(`reminder-${bookingId}`),
    ]);

    const msUntilStart = newStartDate.getTime() - Date.now();
    if (msUntilStart > 0) {
      await this.bookingQueue.add(
        BookingJob.AUTO_START,
        { bookingId },
        { delay: msUntilStart, jobId: `autostart-${bookingId}`, removeOnComplete: true },
      );
    }

    const msUntilReminder = msUntilStart - REMINDER_DAYS_BEFORE * 86_400_000;
    if (msUntilReminder > 0) {
      await this.bookingQueue.add(
        BookingJob.REMINDER,
        { bookingId },
        { delay: msUntilReminder, jobId: `reminder-${bookingId}`, removeOnComplete: true },
      );
    }
  }
}
