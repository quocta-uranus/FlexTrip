import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, DisputeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import { toNumber } from '../../../common/money.util';
import { RequestContext } from '../../../common/request-context';
import {
  ListDisputesQueryDto, ResolveDisputeDto, UpdateDisputePriorityDto, UpdateDisputeStatusDto,
} from './dto/admin-disputes.dto';

const CLOSED: DisputeStatus[] = [DisputeStatus.RESOLVED, DisputeStatus.REJECTED];
const REFUNDABLE: BookingStatus[] = [BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, BookingStatus.CANCELLED];

const PARTIES = {
  booking: {
    select: {
      id: true, totalPrice: true,
      traveler: { select: { id: true, name: true } },
      listing: { select: { provider: { select: { id: true, name: true, providerProfile: { select: { shopName: true } } } } } },
    },
  },
} satisfies Prisma.DisputeInclude;

type DisputeWithParties = Prisma.DisputeGetPayload<{ include: typeof PARTIES }>;

function toItem(d: DisputeWithParties) {
  const p = d.booking.listing.provider;
  return {
    id: d.id, bookingId: d.bookingId, type: d.type, status: d.status, priority: d.priority,
    traveler: d.booking.traveler,
    provider: { id: p.id, name: p.name, shopName: p.providerProfile?.shopName ?? null },
    amount: toNumber(d.booking.totalPrice), requestedAmount: toNumber(d.requestedAmount),
    reason: d.reason, createdAt: d.createdAt,
  };
}

@Injectable()
export class AdminDisputesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list(q: ListDisputesQueryDto) {
    const search = q.search?.trim();
    const contains = (s: string) => ({ contains: s, mode: 'insensitive' as const });
    const where: Prisma.DisputeWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.type ? { type: q.type } : {}),
      ...(q.priority ? { priority: q.priority } : {}),
      ...(search
        ? { OR: [
            { id: search },
            { bookingId: search },
            { booking: { traveler: { name: contains(search) } } },
            { booking: { listing: { provider: { name: contains(search) } } } },
          ] }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.dispute.findMany({ where, include: PARTIES, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], ...skipTake(q) }),
      this.prisma.dispute.count({ where }),
    ]);
    return paginate(rows.map(toItem), total, q);
  }

  async stats() {
    const [groups, open] = await Promise.all([
      this.prisma.dispute.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.$queryRaw<{ total: Prisma.Decimal | null }[]>`
        SELECT SUM(b."totalPrice") AS total FROM "Dispute" d JOIN "Booking" b ON b.id = d."bookingId"
        WHERE d."status"::text NOT IN ('RESOLVED', 'REJECTED')`,
    ]);
    const byStatus = Object.fromEntries(Object.values(DisputeStatus).map((s) => [s, 0])) as Record<DisputeStatus, number>;
    for (const g of groups) byStatus[g.status] = g._count._all;
    return { byStatus, openAmount: toNumber(open[0]?.total ?? null) ?? 0 };
  }

  async detail(id: string) {
    const d = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        ...PARTIES,
        openedBy: { select: { id: true, name: true } },
        handledBy: { select: { id: true, name: true } },
      },
    });
    if (!d) throw new NotFoundException({ code: 'DISPUTE_NOT_FOUND', message: 'Không tìm thấy tranh chấp.' });
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: d.bookingId },
      include: {
        listing: { select: { id: true, title: true, location: true } },
        payment: true,
        contract: { select: { status: true, travelerSignedAt: true, providerSignedAt: true, checkInPhotos: true, checkOutPhotos: true } },
      },
    });
    const history = await this.prisma.auditLog.findMany({
      where: { entityType: 'Dispute', entityId: id },
      orderBy: { createdAt: 'asc' },
      include: { actor: { select: { id: true, name: true } } },
    });
    return {
      ...toItem(d),
      description: d.description, resolution: d.resolution, refundAmount: toNumber(d.refundAmount),
      openedBy: d.openedBy, handledBy: d.handledBy, resolvedAt: d.resolvedAt,
      booking: {
        id: booking.id, status: booking.status, startDate: booking.startDate, endDate: booking.endDate,
        totalPrice: toNumber(booking.totalPrice), listing: booking.listing,
      },
      payment: booking.payment
        ? {
            id: booking.payment.id, amount: toNumber(booking.payment.amount), platformFee: toNumber(booking.payment.platformFee),
            status: booking.payment.status, method: booking.payment.method, transactionId: booking.payment.transactionId,
          }
        : null,
      contract: booking.contract,
      history,
    };
  }

  private async loadOpen(tx: Prisma.TransactionClient, id: string) {
    const d = await tx.dispute.findUnique({
      where: { id },
      include: { booking: { select: { id: true, status: true, payment: { select: { amount: true } } } } },
    });
    if (!d) throw new NotFoundException({ code: 'DISPUTE_NOT_FOUND', message: 'Không tìm thấy tranh chấp.' });
    if (CLOSED.includes(d.status))
      throw new ConflictException({ code: 'DISPUTE_CLOSED', message: 'Tranh chấp đã đóng, không thể thay đổi.' });
    return d;
  }

  async changeStatus(id: string, dto: UpdateDisputeStatusDto, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const d = await this.loadOpen(tx, id);
      const updated = await tx.dispute.update({
        where: { id },
        data: { status: dto.status, handledById: d.handledById ?? ctx.actorId },
      });
      await this.audit.log(tx, ctx, {
        action: 'DISPUTE_STATUS_CHANGED', entityType: 'Dispute', entityId: id,
        before: { status: d.status }, after: { status: updated.status, note: dto.note ?? null },
      });
      return { id, status: updated.status };
    });
  }

  async changePriority(id: string, dto: UpdateDisputePriorityDto, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const d = await this.loadOpen(tx, id);
      const updated = await tx.dispute.update({
        where: { id },
        data: { priority: dto.priority, handledById: d.handledById ?? ctx.actorId },
      });
      await this.audit.log(tx, ctx, {
        action: 'DISPUTE_PRIORITY_CHANGED', entityType: 'Dispute', entityId: id,
        before: { priority: d.priority }, after: { priority: updated.priority },
      });
      return { id, priority: updated.priority };
    });
  }

  async resolve(id: string, dto: ResolveDisputeDto, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const d = await this.loadOpen(tx, id);
      const refund = dto.refundAmount;
      if (refund !== undefined) {
        const paid = d.booking.payment?.amount;
        if (dto.outcome === 'REJECTED' || !paid || new Prisma.Decimal(refund).gt(paid))
          throw new BadRequestException({
            code: 'INVALID_REFUND_AMOUNT',
            message: 'Số tiền hoàn không hợp lệ (chỉ khi chấp nhận, và không vượt quá số đã thanh toán).',
          });
        if (!REFUNDABLE.includes(d.booking.status))
          throw new ConflictException({ code: 'BOOKING_NOT_REFUNDABLE', message: `Booking ở trạng thái ${d.booking.status} không thể hoàn tiền.` });
        await tx.booking.update({ where: { id: d.booking.id }, data: { status: BookingStatus.REFUNDING } });
      }
      const updated = await tx.dispute.update({
        where: { id },
        data: {
          status: dto.outcome,
          resolution: dto.resolution,
          refundAmount: refund !== undefined ? new Prisma.Decimal(refund) : null,
          resolvedAt: new Date(),
          handledById: d.handledById ?? ctx.actorId,
        },
      });
      await this.audit.log(tx, ctx, {
        action: dto.outcome === 'RESOLVED' ? 'DISPUTE_RESOLVED' : 'DISPUTE_REJECTED',
        entityType: 'Dispute', entityId: id,
        before: { status: d.status, bookingStatus: d.booking.status },
        after: {
          status: updated.status, resolution: updated.resolution, refundAmount: refund ?? null,
          bookingStatus: refund !== undefined ? BookingStatus.REFUNDING : d.booking.status,
        },
      });
      return { id, status: updated.status, refundAmount: toNumber(updated.refundAmount), resolvedAt: updated.resolvedAt };
    });
  }
}
