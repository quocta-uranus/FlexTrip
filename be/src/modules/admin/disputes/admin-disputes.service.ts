import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, ContractStatus, DisputeStatus, Prisma, WalletTxType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { PaymentsService } from '../../payments/payments.service';
import { RefundService } from '../../payments/refund.service';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import { toNumber } from '../../../common/money.util';
import { RequestContext } from '../../../common/request-context';
import {
  ListDisputesQueryDto, ResolveDisputeDto, UpdateDisputePriorityDto, UpdateDisputeStatusDto,
} from './dto/admin-disputes.dto';

const PENALTY_REF_TYPE = 'dispute-penalty';
const CLOSED: DisputeStatus[] = [DisputeStatus.RESOLVED, DisputeStatus.REJECTED];
const REFUNDABLE: BookingStatus[] = [
  BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.DISPUTED,
];

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
    refundAmount: toNumber(d.refundAmount),
    reason: d.reason, createdAt: d.createdAt,
  };
}

@Injectable()
export class AdminDisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly refunds: RefundService,
    private readonly payments: PaymentsService,
  ) {}

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
    // The penalty has no column of its own, so it is read back from the wallet debit it created
    const penaltyTx = await this.prisma.walletTransaction.findFirst({
      where: { refType: PENALTY_REF_TYPE, refId: id, type: WalletTxType.DEBIT },
      select: { amount: true },
    });
    const history = await this.prisma.auditLog.findMany({
      where: { entityType: 'Dispute', entityId: id },
      orderBy: { createdAt: 'asc' },
      include: { actor: { select: { id: true, name: true } } },
    });
    return {
      ...toItem(d),
      description: d.description, resolution: d.resolution, penaltyAmount: toNumber(penaltyTx?.amount ?? null),
      openedBy: d.openedBy, handledBy: d.handledBy, resolvedAt: d.resolvedAt,
      booking: {
        id: booking.id, status: booking.status, startDate: booking.startDate, endDate: booking.endDate,
        totalPrice: toNumber(booking.totalPrice), listing: booking.listing,
      },
      payment: booking.payment
        ? {
            id: booking.payment.id, amount: toNumber(booking.payment.totalAmount), platformFee: toNumber(booking.payment.platformFee),
            refundedAmount: toNumber(booking.payment.refundedAmount),
            status: booking.payment.status, method: booking.payment.gateway, transactionId: booking.payment.gatewayTransId,
          }
        : null,
      contract: booking.contract,
      history,
    };
  }

  private async loadOpen(tx: Prisma.TransactionClient, id: string) {
    const d = await tx.dispute.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true, status: true, checkedInAt: true, checkedOutAt: true, travelerId: true,
            listing: { select: { providerId: true } },
            payment: { select: { totalAmount: true } },
          },
        },
      },
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

  /**
   * Moves a damage penalty from the traveler's wallet to the provider's. It runs after any refund in the same
   * transaction, so a refund can fund the penalty. The conditional update keeps the balance from going negative.
   */
  private async chargePenalty(tx: Prisma.TransactionClient, disputeId: string, travelerId: string, providerId: string, amount: number) {
    const debited = await tx.wallet.updateMany({
      where: { userId: travelerId, availableBalance: { gte: amount } },
      data: { availableBalance: { decrement: amount } },
    });
    if (debited.count === 0)
      throw new BadRequestException({
        code: 'INSUFFICIENT_WALLET_BALANCE',
        message: 'Ví của traveler không đủ số dư để thu khoản phạt này.',
      });

    const traveler = await tx.wallet.findUniqueOrThrow({ where: { userId: travelerId } });
    await tx.walletTransaction.create({
      data: {
        walletId: traveler.walletId, type: WalletTxType.DEBIT, amount, balanceAfter: traveler.availableBalance,
        refType: PENALTY_REF_TYPE, refId: disputeId, note: `Phạt bồi thường thiệt hại, tranh chấp ${disputeId}`,
      },
    });

    const provider = await tx.wallet.upsert({
      where: { userId: providerId },
      create: { userId: providerId, availableBalance: amount },
      update: { availableBalance: { increment: amount } },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: provider.walletId, type: WalletTxType.CREDIT, amount, balanceAfter: provider.availableBalance,
        refType: PENALTY_REF_TYPE, refId: disputeId, note: `Nhận bồi thường thiệt hại, tranh chấp ${disputeId}`,
      },
    });
  }

  async resolve(id: string, dto: ResolveDisputeDto, ctx: RequestContext) {
    let completedBookingId: string | null = null;
    const result = await this.prisma.$transaction(async (tx) => {
      const d = await this.loadOpen(tx, id);
      const refund = dto.refundAmount;
      const paid = d.booking.payment?.totalAmount;
      const fullRefund = refund !== undefined && !!paid && new Prisma.Decimal(refund).gte(paid);
      if (refund !== undefined) {
        if (dto.outcome === 'REJECTED' || !paid || new Prisma.Decimal(refund).gt(paid))
          throw new BadRequestException({
            code: 'INVALID_REFUND_AMOUNT',
            message: 'Số tiền hoàn không hợp lệ (chỉ khi chấp nhận, và không vượt quá số đã thanh toán).',
          });
        if (!REFUNDABLE.includes(d.booking.status))
          throw new ConflictException({ code: 'BOOKING_NOT_REFUNDABLE', message: `Booking ở trạng thái ${d.booking.status} không thể hoàn tiền.` });
        await this.refunds.refundDispute(tx, d.booking.id, refund, `Hoàn tiền tranh chấp booking ${d.booking.id}`);
      }

      const penalty = dto.penaltyAmount;
      if (penalty !== undefined) {
        if (dto.outcome === 'REJECTED')
          throw new BadRequestException({ code: 'INVALID_PENALTY_AMOUNT', message: 'Chỉ phạt traveler khi chấp nhận tranh chấp.' });
        await this.chargePenalty(tx, id, d.booking.travelerId, d.booking.listing.providerId, penalty);
      }

      // Money moves now, so a refund goes straight to REFUNDED instead of waiting in REFUNDING.
      // A DISPUTED booking that keeps some or all of its money resumes where the dispute interrupted it,
      // and a finished rental completes so the provider's commission split finally runs.
      let nextStatus = refund !== undefined ? BookingStatus.REFUNDED : d.booking.status;
      if (d.booking.status === BookingStatus.DISPUTED && !fullRefund) {
        nextStatus = d.booking.checkedOutAt ? BookingStatus.COMPLETED
          : d.booking.checkedInAt ? BookingStatus.IN_PROGRESS : BookingStatus.CONFIRMED;
        if (nextStatus === BookingStatus.COMPLETED) completedBookingId = d.booking.id;
      }
      if (nextStatus !== d.booking.status) {
        await tx.booking.update({ where: { id: d.booking.id }, data: { status: nextStatus } });
        if (d.booking.status === BookingStatus.DISPUTED) {
          const contractStatus = nextStatus === BookingStatus.IN_PROGRESS || nextStatus === BookingStatus.CONFIRMED
            ? ContractStatus.ACTIVE : ContractStatus.CLOSED;
          await tx.contract.updateMany({ where: { bookingId: d.booking.id }, data: { status: contractStatus } });
        }
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
          penaltyAmount: penalty ?? null, bookingStatus: nextStatus,
        },
      });
      return { id, status: updated.status, refundAmount: toNumber(updated.refundAmount), resolvedAt: updated.resolvedAt };
    });
    // Queued after commit so the worker sees the COMPLETED booking and the recorded refund
    if (completedBookingId) await this.payments.onBookingCompleted(completedBookingId);
    return result;
  }
}
