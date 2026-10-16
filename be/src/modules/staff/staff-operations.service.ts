import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus, ContractStatus, DisputePriority, DisputeStatus, DisputeType,
  NotificationType, Prisma, StaffMediationStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../../common/request-context';
import { uploadImage } from '../../common/upload.util';
import { AuditService } from '../audit/audit.service';
import { PaymentsService } from '../payments/payments.service';
import { RENTAL_UNPAID_MESSAGE, isRentalSettled } from '../booking/booking.constants';
import { paginate, skipTake } from '../../common/dto/pagination.dto';
import {
  ConfirmConditionDto, CreateMediationDto, EscalateMediationDto,
  ListMediationsQueryDto, ListMyBookingsQueryDto, ListStaffTasksQueryDto, ResolveMediationDto,
} from './dto/staff-operations.dto';

const DETAIL_INCLUDE = {
  listing: { select: { id: true, title: true, location: true, imageUrls: true, provider: { select: { id: true, name: true, phone: true } } } },
  traveler: { select: { id: true, name: true, phone: true, email: true } },
  contract: { select: { status: true, terms: true, penaltyRules: true, productConditionNote: true, travelerSignedAt: true, providerSignedAt: true, checkInPhotos: true, checkOutPhotos: true } },
  payment: { select: { rentalAmount: true, rentalPaidAt: true } },
  staffMediations: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.BookingInclude;

@Injectable()
export class StaffOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly payments: PaymentsService,
  ) {}

  // The checklist is stored inside the condition text so the record stays readable in contracts and disputes
  private conditionText(dto: ConfirmConditionDto): string {
    if (!dto.checklist?.length) return dto.conditionNote;
    const lines = dto.checklist.map((i) => `${i.ok ? '✓' : '✗'} ${i.label}`).join('\n');
    return `Kiểm tra:\n${lines}\n\nGhi chú: ${dto.conditionNote}`;
  }

  private async assignedBooking(staffId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: DETAIL_INCLUDE });
    if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Không tìm thấy booking.' });
    if (booking.assignedStaffId !== staffId)
      throw new ForbiddenException({ code: 'BOOKING_NOT_ASSIGNED', message: 'Booking này không được phân công cho bạn.' });
    return booking;
  }

  async tasks(staffId: string, query: ListStaffTasksQueryDto) {
    const day = query.date ?? new Date().toISOString().slice(0, 10);
    const from = new Date(`${day}T00:00:00.000Z`);
    const to = new Date(from.getTime() + 86_400_000);
    const bookings = await this.prisma.booking.findMany({
      where: {
        assignedStaffId: staffId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, BookingStatus.DISPUTED] },
        OR: [
          { startDate: { gte: from, lt: to } },
          { endDate: { gte: from, lt: to } },
        ],
      },
      include: DETAIL_INCLUDE,
      orderBy: [{ startDate: 'asc' }, { endDate: 'asc' }],
    });
    const tasks = bookings.flatMap((booking) => {
      const common = {
        bookingId: booking.id,
        bookingStatus: booking.status,
        listing: booking.listing,
        traveler: booking.traveler,
        deliveryMethod: booking.deliveryMethod,
        deliveryAddress: booking.deliveryAddress,
      };
      return [
        ...(booking.startDate >= from && booking.startDate < to
          ? [{ ...common, id: `${booking.id}:HANDOVER`, type: 'HANDOVER' as const, scheduledAt: booking.startDate, completedAt: booking.checkedInAt }]
          : []),
        ...(booking.endDate >= from && booking.endDate < to
          ? [{ ...common, id: `${booking.id}:RETURN`, type: 'RETURN' as const, scheduledAt: booking.endDate, completedAt: booking.checkedOutAt }]
          : []),
      ];
    });
    return { date: day, tasks };
  }

  async myBookings(staffId: string, query: ListMyBookingsQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;
    const where = {
      assignedStaffId: staffId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: DETAIL_INCLUDE,
        orderBy: [{ startDate: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  booking(staffId: string, bookingId: string) {
    return this.assignedBooking(staffId, bookingId);
  }

  async confirmHandover(staffId: string, bookingId: string, dto: ConfirmConditionDto, ctx: RequestContext) {
    const booking = await this.assignedBooking(staffId, bookingId);
    if (booking.status !== BookingStatus.CONFIRMED)
      throw new ConflictException({ code: 'INVALID_BOOKING_STATUS', message: 'Chỉ xác nhận bàn giao cho booking đã được xác nhận.' });
    if (booking.checkedInAt)
      throw new ConflictException({ code: 'HANDOVER_ALREADY_CONFIRMED', message: 'Tác vụ bàn giao đã hoàn thành.' });
    if (booking.payment && !isRentalSettled(booking.payment))
      throw new ConflictException({ code: 'RENTAL_UNPAID', message: RENTAL_UNPAID_MESSAGE });
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.IN_PROGRESS, checkedInAt: now, handoverCondition: this.conditionText(dto) },
      });
      await tx.contract.upsert({
        where: { bookingId },
        create: {
          bookingId,
          terms: `Biên bản giao nhận cho booking ${bookingId}`,
          status: ContractStatus.ACTIVE,
          checkInPhotos: dto.photoUrl ? [dto.photoUrl] : [],
        },
        update: {
          status: ContractStatus.ACTIVE,
          checkInPhotos: dto.photoUrl ? [dto.photoUrl] : [],
        },
      });
      await this.audit.log(tx, ctx, {
        action: 'STAFF_HANDOVER_CONFIRMED', entityType: 'Booking', entityId: bookingId,
        before: { status: booking.status, checkedInAt: booking.checkedInAt },
        after: { status: BookingStatus.IN_PROGRESS, checkedInAt: now, photoUrl: dto.photoUrl, conditionNote: dto.conditionNote },
      });
      await this.notifyParties(tx, booking, 'Đã xác nhận bàn giao', `Nhân viên vận hành đã xác nhận bàn giao "${booking.listing.title}".`, bookingId);
    });
    return this.assignedBooking(staffId, bookingId);
  }

  async confirmReturn(staffId: string, bookingId: string, dto: ConfirmConditionDto, ctx: RequestContext) {
    const booking = await this.assignedBooking(staffId, bookingId);
    if ((booking.status !== BookingStatus.IN_PROGRESS && booking.status !== BookingStatus.DISPUTED) || !booking.checkedInAt)
      throw new ConflictException({ code: 'INVALID_BOOKING_STATUS', message: 'Chỉ xác nhận nhận lại sau khi đã bàn giao.' });
    if (booking.checkedOutAt)
      throw new ConflictException({ code: 'RETURN_ALREADY_CONFIRMED', message: 'Tác vụ nhận lại đã hoàn thành.' });
    const failed = dto.checklist?.filter((i) => !i.ok) ?? [];
    if (failed.length > 0 && booking.status !== BookingStatus.DISPUTED)
      throw new ConflictException({
        code: 'INSPECTION_NOT_PASSED',
        message: `Còn hạng mục chưa đạt: ${failed.map((i) => i.label).join(', ')}. Hãy lập biên bản thương lượng hoặc chuyển Admin trước khi hoàn thành.`,
      });
    const now = new Date();
    const targetStatus = booking.status === BookingStatus.DISPUTED ? BookingStatus.DISPUTED : BookingStatus.COMPLETED;
    const contractStatus = booking.status === BookingStatus.DISPUTED ? ContractStatus.DISPUTED : ContractStatus.CLOSED;
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.contract.findUnique({ where: { bookingId }, select: { checkOutPhotos: true } });
      // Same shape the provider/traveler checkout writes, so every party renders one list
      const returnPhotos = [
        ...(Array.isArray(existing?.checkOutPhotos) ? (existing.checkOutPhotos as Prisma.JsonArray) : []),
        { url: dto.photoUrl, uploadedBy: 'STAFF', uploadedAt: now.toISOString() },
      ];
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: targetStatus, checkedOutAt: now, returnCondition: this.conditionText(dto) },
      });
      await tx.contract.upsert({
        where: { bookingId },
        create: {
          bookingId,
          terms: `Biên bản giao nhận cho booking ${bookingId}`,
          status: contractStatus,
          checkOutPhotos: returnPhotos,
        },
        update: {
          status: contractStatus,
          checkOutPhotos: returnPhotos,
        },
      });
      await this.audit.log(tx, ctx, {
        action: 'STAFF_RETURN_CONFIRMED', entityType: 'Booking', entityId: bookingId,
        before: { status: booking.status, checkedOutAt: booking.checkedOutAt },
        after: { status: targetStatus, checkedOutAt: now, photoUrl: dto.photoUrl, conditionNote: dto.conditionNote },
      });
      await this.notifyParties(tx, booking, 'Đã xác nhận nhận lại', `Nhân viên vận hành đã xác nhận nhận lại "${booking.listing.title}".`, bookingId);
    });
    // Same hook the provider flow uses: splits commission and schedules the deposit release
    if (targetStatus === BookingStatus.COMPLETED) await this.payments.onBookingCompleted(bookingId);
    return this.assignedBooking(staffId, bookingId);
  }

  mediations(staffId: string, query: ListMediationsQueryDto) {
    return this.prisma.staffMediation.findMany({
      where: { staffId, ...(query.status ? { status: query.status } : {}) },
      include: { booking: { include: { listing: { select: { id: true, title: true, location: true } }, traveler: { select: { id: true, name: true } } } }, escalatedDispute: { select: { id: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMediation(staffId: string, bookingId: string, dto: CreateMediationDto, ctx: RequestContext) {
    const booking = await this.assignedBooking(staffId, bookingId);
    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.IN_PROGRESS)
      throw new ConflictException({ code: 'MEDIATION_NOT_ALLOWED', message: 'Booking không ở giai đoạn giao hoặc nhận thiết bị.' });
    return this.prisma.$transaction(async (tx) => {
      const mediation = await tx.staffMediation.create({
        data: { bookingId, staffId, issue: dto.issue, travelerStatement: dto.travelerStatement, providerStatement: dto.providerStatement, evidenceUrls: dto.evidenceUrls ?? [] },
      });
      await this.audit.log(tx, ctx, { action: 'STAFF_MEDIATION_OPENED', entityType: 'StaffMediation', entityId: mediation.id, after: dto });
      return mediation;
    });
  }

  async resolveMediation(staffId: string, id: string, dto: ResolveMediationDto, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const mediation = await this.openMediation(tx, staffId, id);
      const updated = await tx.staffMediation.update({ where: { id }, data: { status: StaffMediationStatus.RESOLVED, resolution: dto.resolution, resolvedAt: new Date() } });
      await this.audit.log(tx, ctx, { action: 'STAFF_MEDIATION_RESOLVED', entityType: 'StaffMediation', entityId: id, before: { status: mediation.status }, after: { status: updated.status, resolution: dto.resolution } });
      return updated;
    });
  }

  async escalate(staffId: string, id: string, dto: EscalateMediationDto, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const mediation = await this.openMediation(tx, staffId, id);
      const dispute = await tx.dispute.create({
        data: {
          bookingId: mediation.bookingId,
          openedById: staffId,
          type: dto.type ?? DisputeType.DAMAGE_CLAIM,
          priority: dto.priority ?? DisputePriority.HIGH,
          status: DisputeStatus.ESCALATED,
          reason: mediation.issue.slice(0, 500),
          description: [mediation.travelerStatement && `Traveler: ${mediation.travelerStatement}`, mediation.providerStatement && `Provider: ${mediation.providerStatement}`, dto.additionalNotes].filter(Boolean).join('\n\n') || null,
          requestedAmount: dto.requestedAmount,
        },
      });
      const updated = await tx.staffMediation.update({ where: { id }, data: { status: StaffMediationStatus.ESCALATED, escalatedDisputeId: dispute.id } });
      await tx.booking.update({ where: { id: mediation.bookingId }, data: { status: BookingStatus.DISPUTED } });
      await tx.contract.updateMany({ where: { bookingId: mediation.bookingId }, data: { status: ContractStatus.DISPUTED } });
      await this.audit.log(tx, ctx, { action: 'STAFF_MEDIATION_ESCALATED', entityType: 'StaffMediation', entityId: id, before: { status: mediation.status }, after: { status: updated.status, disputeId: dispute.id } });
      await this.audit.log(tx, ctx, { action: 'DISPUTE_STAFF_ESCALATED', entityType: 'Dispute', entityId: dispute.id, after: { mediationId: id, bookingId: mediation.bookingId, evidenceUrls: mediation.evidenceUrls } });
      return { mediation: updated, dispute };
    });
  }

  async uploadEvidence(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Vui lòng chọn ảnh.' });
    if (!file.mimetype.startsWith('image/'))
      throw new BadRequestException({ code: 'IMAGE_REQUIRED', message: 'Bằng chứng phải là tệp ảnh.' });
    const url = await uploadImage(file.buffer, `staff-${file.originalname}`, 'listings');
    return { url };
  }

  private async openMediation(tx: Prisma.TransactionClient, staffId: string, id: string) {
    const mediation = await tx.staffMediation.findUnique({ where: { id } });
    if (!mediation) throw new NotFoundException({ code: 'MEDIATION_NOT_FOUND', message: 'Không tìm thấy biên bản thương lượng.' });
    if (mediation.staffId !== staffId) throw new ForbiddenException();
    if (mediation.status !== StaffMediationStatus.OPEN)
      throw new ConflictException({ code: 'MEDIATION_CLOSED', message: 'Biên bản thương lượng đã được xử lý.' });
    return mediation;
  }

  private async notifyParties(
    tx: Prisma.TransactionClient,
    booking: Awaited<ReturnType<StaffOperationsService['assignedBooking']>>,
    title: string,
    body: string,
    bookingId: string,
  ) {
    await Promise.all([
      tx.notification.create({ data: { userId: booking.travelerId, type: NotificationType.BOOKING, title, body, data: { bookingId } } }),
      tx.notification.create({ data: { userId: booking.listing.provider.id, type: NotificationType.BOOKING, title, body, data: { bookingId } } }),
    ]);
  }
}
