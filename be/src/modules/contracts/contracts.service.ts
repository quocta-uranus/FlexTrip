import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { ContractStatus, NotificationType, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ContractParams, renderContract } from './contracts.templates';
import { CheckinDto, CheckoutDto, PenaltyRule } from './dto/contract.dto';
import {
  BALANCE_DUE_MS, BOOKING_QUEUE, BookingJob, RENTAL_UNPAID_MESSAGE, STAFF_ASSIGNED_MESSAGE, isRentalSettled,
} from '../booking/booking.constants';

const HIGH_VALUE_THRESHOLD = 5_000_000;

@Injectable()
export class ContractsService {
  private readonly encKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(BOOKING_QUEUE) private readonly bookingQueue: Queue,
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
    if (contract.booking.assignedStaffId)
      throw new ConflictException({ code: 'STAFF_ASSIGNED', message: STAFF_ASSIGNED_MESSAGE });
    if (contract.booking.payment && !isRentalSettled(contract.booking.payment))
      throw new BadRequestException(RENTAL_UNPAID_MESSAGE);

    const encryptedUrl = this.encrypt(dto.idDocumentUrl);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.contract.update({
        where: { bookingId },
        data: {
          status: ContractStatus.ACTIVE,
          idDocumentUrl: encryptedUrl,
          idDocumentType: dto.idDocumentType,
          checkInPhotos: dto.checkInPhotos,
        },
      }),
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'IN_PROGRESS' },
      }),
      this.notify(
        contract.booking.travelerId,
        NotificationType.BOOKING,
        'Chuyến thuê đã bắt đầu!',
        `Provider đã xác nhận giao đồ "${contract.booking.listing.title}". Chúc bạn có chuyến đi vui!`,
        { bookingId },
      ),
    ]);

    // Auto-complete sau endDate + 48h
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { endDate: true },
    });
    if (booking) {
      const autoCompleteAt = new Date(booking.endDate).getTime() + 48 * 60 * 60 * 1000;
      const delay = autoCompleteAt - now.getTime();
      if (delay > 0) {
        await this.bookingQueue.add(
          BookingJob.AUTO_COMPLETE,
          { bookingId },
          { delay, jobId: `auto-complete-${bookingId}`, removeOnComplete: true },
        );
      }
    }

    // Purge CCCD sau 90 ngày
    await this.bookingQueue.add(
      BookingJob.ID_DOC_PURGE,
      { bookingId },
      { delay: 90 * 24 * 60 * 60 * 1000, jobId: `id-doc-purge-${bookingId}`, removeOnComplete: true },
    );
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

    if (isProvider && dto.action === 'complete' && contract.booking.assignedStaffId)
      throw new ConflictException({ code: 'STAFF_ASSIGNED', message: STAFF_ASSIGNED_MESSAGE });

    const role = isProvider ? 'PROVIDER' : 'TRAVELER';
    const now = new Date().toISOString();
    const existingPhotos = ((contract.checkOutPhotos ?? []) as Array<{ url: string; uploadedBy: string; uploadedAt: string }>);

    const newPhotos = [
      ...existingPhotos,
      ...dto.photos.map((url) => ({ url, uploadedBy: role, uploadedAt: now, note: dto.note })),
    ];

    if (isProvider && dto.action === 'complete') {
      // Provider xác nhận hoàn thành
      await this.prisma.$transaction([
        this.prisma.contract.update({
          where: { bookingId },
          data: { status: ContractStatus.CLOSED, checkOutPhotos: newPhotos as unknown as Prisma.InputJsonValue },
        }),
        this.prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'COMPLETED' },
        }),
        this.notify(
          contract.booking.travelerId,
          NotificationType.BOOKING,
          'Chuyến thuê đã hoàn thành',
          `Đơn thuê "${contract.booking.listing.title}" đã được xác nhận hoàn thành.`,
          { bookingId },
        ),
      ]);

      // Hủy auto-complete vì đã complete manual
      await this.bookingQueue.remove(`auto-complete-${bookingId}`).catch(() => null);
    } else {
      // Chỉ lưu ảnh, chưa complete
      await this.prisma.contract.update({
        where: { bookingId },
        data: { checkOutPhotos: newPhotos as unknown as Prisma.InputJsonValue },
      });
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
