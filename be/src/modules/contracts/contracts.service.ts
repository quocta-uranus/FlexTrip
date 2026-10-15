import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ContractStatus, NotificationType, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ContractParams, renderContract } from './contracts.templates';
import { PenaltyRule } from './dto/contract.dto';
import { BOOKING_QUEUE, BookingJob } from '../booking/booking.constants';

const HIGH_VALUE_THRESHOLD = 5_000_000;

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(BOOKING_QUEUE) private readonly bookingQueue: Queue,
  ) {}

  // ─── CONTR-01: Auto-generate khi traveler thanh toán ────────────────────────

  async generate(bookingId: string): Promise<void> {
    const existing = await this.prisma.contract.findUnique({ where: { bookingId } });
    if (existing) return; // idempotent

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        traveler: { select: { id: true, name: true, email: true } },
        listing: {
          select: {
            id: true, title: true, category: true, location: true,
            price: true, depositRate: true, penaltyRules: true,
            conditionNote: true, isHighValue: true, marketValue: true,
            provider: { select: { id: true, name: true, providerProfile: { select: { shopName: true } } } },
          },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');

    const rentalDays =
      Math.round(
        (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / 86_400_000,
      ) + 1;

    const penaltyRules = ((booking.listing.penaltyRules ?? []) as unknown) as PenaltyRule[];
    const isHighValue = booking.listing.isHighValue;
    const marketValue = booking.listing.marketValue
      ? Number(booking.listing.marketValue)
      : undefined;

    const params: ContractParams = {
      contractId: bookingId,
      bookingId,
      travelerName: booking.traveler.name,
      travelerEmail: booking.traveler.email,
      providerName: booking.listing.provider.name,
      providerShopName:
        booking.listing.provider.providerProfile?.shopName ?? booking.listing.provider.name,
      listingTitle: booking.listing.title,
      listingCategory: booking.listing.category,
      listingLocation: booking.listing.location,
      quantity: booking.quantity,
      startDate: new Date(booking.startDate),
      endDate: new Date(booking.endDate),
      rentalDays,
      unitPrice: Number(booking.listing.price),
      totalPrice: Number(booking.totalPrice),
      depositAmount: Number(booking.depositAmount),
      depositRate: Number(booking.listing.depositRate),
      deliveryMethod: booking.deliveryMethod,
      deliveryAddress: booking.deliveryAddress ?? undefined,
      penaltyRules,
      productConditionNote: booking.listing.conditionNote ?? undefined,
      isHighValue,
      marketValue,
    };

    const templateType = isHighValue ? 'HIGH_VALUE' : 'STANDARD';

    await this.prisma.contract.create({
      data: {
        bookingId,
        templateType,
        terms: renderContract(params),
        penaltyRules: (penaltyRules as unknown) as Prisma.InputJsonValue,
        productConditionNote: booking.listing.conditionNote,
        status: ContractStatus.TRAVELER_SIGNED,
        travelerSignedAt: new Date(),
        insuranceOptIn: isHighValue,
      },
    });

    // Nhắc provider ký sau 24h nếu chưa sign
    await this.bookingQueue.add(
      BookingJob.CONTRACT_SIGN_REMINDER,
      { bookingId },
      {
        delay: 24 * 60 * 60 * 1000,
        jobId: `contract-reminder-${bookingId}`,
        removeOnComplete: true,
      },
    );
  }

  // ─── CONTR-01: Lấy hợp đồng ─────────────────────────────────────────────────

  async getByBooking(bookingId: string, userId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { bookingId },
      include: {
        booking: {
          select: {
            travelerId: true,
            listing: { select: { providerId: true } },
          },
        },
      },
    });
    if (!contract) throw new NotFoundException('Hợp đồng chưa được tạo');

    const isParty =
      contract.booking.travelerId === userId ||
      contract.booking.listing.providerId === userId;
    if (!isParty) throw new ForbiddenException();

    return contract;
  }

  // ─── Preview template trước khi thanh toán ───────────────────────────────────

  async preview(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        traveler: { select: { id: true, name: true, email: true } },
        listing: {
          select: {
            id: true, title: true, category: true, location: true,
            price: true, depositRate: true, penaltyRules: true,
            conditionNote: true, isHighValue: true, marketValue: true,
            provider: { select: { name: true, providerProfile: { select: { shopName: true } } } },
          },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.travelerId !== userId) throw new ForbiddenException();

    const rentalDays =
      Math.round(
        (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / 86_400_000,
      ) + 1;

    const penaltyRules = ((booking.listing.penaltyRules ?? []) as unknown) as PenaltyRule[];
    const isHighValue = booking.listing.isHighValue;

    const params: ContractParams = {
      contractId: bookingId,
      bookingId,
      travelerName: booking.traveler.name,
      travelerEmail: booking.traveler.email,
      providerName: booking.listing.provider.name,
      providerShopName:
        booking.listing.provider.providerProfile?.shopName ?? booking.listing.provider.name,
      listingTitle: booking.listing.title,
      listingCategory: booking.listing.category,
      listingLocation: booking.listing.location,
      quantity: booking.quantity,
      startDate: new Date(booking.startDate),
      endDate: new Date(booking.endDate),
      rentalDays,
      unitPrice: Number(booking.listing.price),
      totalPrice: Number(booking.totalPrice),
      depositAmount: Number(booking.depositAmount),
      depositRate: Number(booking.listing.depositRate),
      deliveryMethod: booking.deliveryMethod,
      deliveryAddress: booking.deliveryAddress ?? undefined,
      penaltyRules,
      productConditionNote: booking.listing.conditionNote ?? undefined,
      isHighValue,
      marketValue: booking.listing.marketValue ? Number(booking.listing.marketValue) : undefined,
    };

    return {
      terms: renderContract(params),
      penaltyRules,
      isHighValue,
      productConditionNote: booking.listing.conditionNote,
    };
  }

  // ─── CONTR-01: Provider ký hợp đồng → Contract SIGNED + Booking CONFIRMED ──

  async providerSign(bookingId: string, providerId: string): Promise<void> {
    const contract = await this.prisma.contract.findUnique({
      where: { bookingId },
      include: {
        booking: {
          select: {
            status: true,
            travelerId: true,
            startDate: true,
            listing: { select: { providerId: true, title: true } },
          },
        },
      },
    });

    if (!contract) throw new NotFoundException('Hợp đồng chưa được tạo');
    if (contract.booking.listing.providerId !== providerId) throw new ForbiddenException();
    if (contract.status !== ContractStatus.TRAVELER_SIGNED)
      throw new BadRequestException('Hợp đồng chưa được traveler ký hoặc đã ký rồi');

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.contract.update({
        where: { bookingId },
        data: { status: ContractStatus.SIGNED, providerSignedAt: now },
      }),
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      }),
      this.notify(
        contract.booking.travelerId,
        NotificationType.BOOKING,
        'Đặt chỗ đã được xác nhận!',
        `Provider đã ký hợp đồng và xác nhận đơn thuê "${contract.booking.listing.title}".`,
        { bookingId },
      ),
    ]);

    // Hủy job nhắc ký (không còn cần)
    await this.bookingQueue.remove(`contract-reminder-${bookingId}`).catch(() => null);

    // Schedule nhắc nhở trước startDate 3 ngày
    const msUntilStart = new Date(contract.booking.startDate).getTime() - Date.now();
    const msUntilReminder = msUntilStart - 3 * 86_400_000;
    if (msUntilReminder > 0) {
      await this.bookingQueue.add(
        BookingJob.REMINDER,
        { bookingId },
        { delay: msUntilReminder, jobId: `reminder-${bookingId}`, removeOnComplete: true },
      );
    }
  }

  async getStatusOnly(bookingId: string) {
    return this.prisma.contract.findUnique({
      where: { bookingId },
      select: { status: true },
    });
  }

  // ─── Activate contract khi checkin ──────────────────────────────────────────

  async activate(bookingId: string): Promise<void> {
    await this.prisma.contract.update({
      where: { bookingId },
      data: { status: ContractStatus.ACTIVE },
    });
  }

  // ─── Close contract khi checkout ────────────────────────────────────────────

  async close(bookingId: string): Promise<void> {
    await this.prisma.contract.update({
      where: { bookingId },
      data: { status: ContractStatus.CLOSED },
    });
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
