import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { ContractStatus, NotificationType, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { ContractParams, renderContract } from './contracts.templates';
import { CheckinDto, CheckoutDto, PenaltyRule } from './dto/contract.dto';
import {
  BALANCE_DUE_MS, BOOKING_QUEUE, BookingJob, throwProviderHandoverBlocked,
} from '../booking/booking.constants';
import { DEPOSIT_RATE, rentalDaysBetween } from '../booking/booking-price.util';


@Injectable()
export class ContractsService {
  private readonly encKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(BOOKING_QUEUE) private readonly bookingQueue: Queue,
    @Optional() private readonly paymentsSvc?: PaymentsService,
  ) {
    const secret = this.config.get<string>('CONTRACT_ID_KEY') ?? 'default-contract-id-key-32bytes!!';
    this.encKey = scryptSync(secret, 'flextrip-contract-salt', 32);
  }

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

    const rentalDays = rentalDaysBetween(booking.startDate, booking.endDate);

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
      depositRate: DEPOSIT_RATE,
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

  // ─── CONTR-01: Traveler ký hợp đồng trước khi thanh toán ───────────────────

  async travelerSign(bookingId: string, travelerId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, travelerId: true, status: true },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');
    if (booking.travelerId !== travelerId) throw new ForbiddenException();
    if (booking.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Chỉ có thể ký hợp đồng khi booking ở trạng thái chờ thanh toán');
    }
    await this.generate(bookingId);
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

    const rentalDays = rentalDaysBetween(booking.startDate, booking.endDate);

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
      depositRate: DEPOSIT_RATE,
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
            discountAmount: true,
            listing: { select: { providerId: true, title: true } },
            payment: { select: { rentalAmount: true, rentalPaidAt: true } },
          },
        },
      },
    });

    if (!contract) throw new NotFoundException('Hợp đồng chưa được tạo');
    if (contract.booking.listing.providerId !== providerId) throw new ForbiddenException();
    if (contract.status !== ContractStatus.TRAVELER_SIGNED)
      throw new BadRequestException('Hợp đồng chưa được traveler ký hoặc đã ký rồi');

    const now = new Date();
    const pay = contract.booking.payment;
    const needsBalance = !!pay && !pay.rentalPaidAt && Number(pay.rentalAmount) > 0;
    const balanceDueAt = needsBalance ? new Date(now.getTime() + BALANCE_DUE_MS) : null;

    await this.prisma.$transaction([
      this.prisma.contract.update({
        where: { bookingId },
        data: { status: ContractStatus.SIGNED, providerSignedAt: now },
      }),
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED', balanceDueAt },
      }),
      this.notify(
        contract.booking.travelerId,
        NotificationType.BOOKING,
        'Đặt chỗ đã được xác nhận!',
        needsBalance
          ? `Provider đã xác nhận đơn thuê "${contract.booking.listing.title}". Vui lòng thanh toán tiền thuê còn lại trong 24 giờ, nếu không đơn sẽ bị huỷ.`
          : `Provider đã ký hợp đồng và xác nhận đơn thuê "${contract.booking.listing.title}".`,
        { bookingId },
      ),
    ]);

    await this.bookingQueue.remove(`approval-${bookingId}`).catch(() => null);

    // Staff bắt buộc: Admin cần biết ngay để gán nhân viên cho đơn vừa được xác nhận
    const admins = await this.prisma.user.findMany({
      where: { roles: { some: { role: 'ADMIN' } }, status: 'ACTIVE' },
      select: { id: true },
    });
    if (admins.length) {
      await this.prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: NotificationType.BOOKING,
          title: 'Đơn cần gán nhân viên',
          body: `Provider đã xác nhận đơn "${contract.booking.listing.title}". Vui lòng gán nhân viên vận hành.`,
          data: { bookingId },
        })),
      });
    }

    // Voucher giảm hết tiền thuê thì không có bước trả nốt, nên chốt luôn tại đây để ngân sách khuyến mãi và escrow khớp
    if (!needsBalance && pay && !pay.rentalPaidAt && Number(contract.booking.discountAmount) > 0) {
      await this.paymentsSvc?.settleDiscountedRental(bookingId);
    }

    if (needsBalance) {
      await this.bookingQueue.add(
        BookingJob.BALANCE_EXPIRY,
        { bookingId },
        { delay: BALANCE_DUE_MS, jobId: `balance-${bookingId}`, removeOnComplete: true },
      );
    }

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

  // ─── CONTR-03+04: Provider checkin → CCCD + ảnh + IN_PROGRESS ───────────────

  async checkin(bookingId: string, providerId: string, dto: CheckinDto): Promise<void> {
    if (dto.checkInPhotos.length < 3)
      throw new BadRequestException('Cần tải lên ít nhất 3 ảnh tình trạng sản phẩm trước khi giao');

    const contract = await this.prisma.contract.findUnique({
      where: { bookingId },
      include: {
        booking: {
          select: {
            status: true, travelerId: true, assignedStaffId: true,
            listing: { select: { providerId: true, title: true } },
            payment: { select: { rentalAmount: true, rentalPaidAt: true } },
          },
        },
      },
    });
    if (!contract) throw new NotFoundException('Hợp đồng không tồn tại');
    if (contract.booking.listing.providerId !== providerId) throw new ForbiddenException();
    if (contract.booking.status !== 'CONFIRMED')
      throw new BadRequestException('Chỉ có thể checkin khi booking đã xác nhận (CONFIRMED)');
    // Bàn giao do Staff thực hiện (kể cả khi chưa gán), Provider không tự checkin được.
    throwProviderHandoverBlocked(contract.booking.assignedStaffId);
  }

  // ─── CONTR-04: Checkout (cả hai bên upload ảnh trả đồ) ───────────────────────

  async checkout(bookingId: string, userId: string, dto: CheckoutDto): Promise<void> {
    if (dto.photos.length < 1)
      throw new BadRequestException('Cần tải lên ít nhất 1 ảnh khi trả đồ');

    const contract = await this.prisma.contract.findUnique({
      where: { bookingId },
      include: {
        booking: {
          select: {
            status: true, travelerId: true, assignedStaffId: true,
            listing: { select: { providerId: true, title: true } },
          },
        },
      },
    });
    if (!contract) throw new NotFoundException('Hợp đồng không tồn tại');

    const isProvider = contract.booking.listing.providerId === userId;
    const isTraveler = contract.booking.travelerId === userId;
    if (!isProvider && !isTraveler) throw new ForbiddenException();
    if (contract.booking.status !== 'IN_PROGRESS')
      throw new BadRequestException('Chỉ có thể checkout khi đang trong kỳ thuê');

    if (isProvider && dto.action === 'complete') throwProviderHandoverBlocked(contract.booking.assignedStaffId);

    const role = isProvider ? 'PROVIDER' : 'TRAVELER';
    const now = new Date().toISOString();
    const existingPhotos = ((contract.checkOutPhotos ?? []) as Array<{ url: string; uploadedBy: string; uploadedAt: string }>);

    const newPhotos = [
      ...existingPhotos,
      ...dto.photos.map((url) => ({ url, uploadedBy: role, uploadedAt: now, note: dto.note })),
    ];

    // Chỉ lưu ảnh: hoàn thành đơn do Staff hoặc Admin xác nhận
    await this.prisma.contract.update({
      where: { bookingId },
      data: { checkOutPhotos: newPhotos as unknown as Prisma.InputJsonValue },
    });
    if (isTraveler) {
      await this.notify(
        contract.booking.listing.providerId,
        NotificationType.BOOKING,
        'Khách đã trả đồ',
        `Khách đã gửi ảnh trả đồ cho "${contract.booking.listing.title}". Vui lòng kiểm tra và xác nhận nhận lại.`,
        { bookingId },
      );
    }
  }

  private encrypt(value: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encKey, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}.${tag.toString('hex')}.${encrypted.toString('hex')}`;
  }

  /** Trả về URL gốc. Dùng cho admin/staff khi cần xem CCCD để giải quyết dispute. */
  decryptIdDocumentUrl(encrypted: string): string {
    const [ivHex, tagHex, ctHex] = encrypted.split('.');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ct = Buffer.from(ctHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.encKey, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ct) + decipher.final('utf8');
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
