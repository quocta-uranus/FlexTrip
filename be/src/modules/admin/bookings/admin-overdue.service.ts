import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BookingStatus, CancelledBy, ContractStatus, DisputePriority, DisputeStatus, DisputeType, NotificationType,
  PaymentGateway, PaymentStatus, Prisma, RefundReason, RefundStatus, WalletTxType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EscrowService } from '../../payments/escrow.service';
import { VouchersService } from '../../vouchers/vouchers.service';
import { RequestContext } from '../../../common/request-context';
import { suggestLateFee } from '../../booking/late-fee.util';
import { daysPast } from '../../booking/overdue.util';
import { HANDOVER_ADMIN_DAYS, LATE_RETURN_DISPUTE_DAYS } from '../../booking/overdue.service';
import { HandoverFault, ResolveOverdueHandoverDto } from './dto/admin-bookings.dto';

const REASONS: Record<HandoverFault, string> = {
  TRAVELER_NO_SHOW: 'Khách không đến nhận thiết bị',
  PROVIDER_FAULT: 'Chủ đồ không giao được thiết bị',
  PLATFORM_FAULT: 'FlexTrip không bàn giao được thiết bị',
};

const CANCELLED_BY: Record<HandoverFault, CancelledBy> = {
  TRAVELER_NO_SHOW: CancelledBy.TRAVELER,
  PROVIDER_FAULT: CancelledBy.PROVIDER,
  PLATFORM_FAULT: CancelledBy.SYSTEM,
};

@Injectable()
export class AdminOverdueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly escrow: EscrowService,
    private readonly vouchers: VouchersService,
  ) {}

  /**
   * A no-show forfeits the deposit to the provider and gets the balance back.
   * When the provider or FlexTrip is at fault the traveler gets everything back.
   */
  async resolveHandover(id: string, dto: ResolveOverdueHandoverDto, ctx: RequestContext) {
    const noShow = dto.fault === 'TRAVELER_NO_SHOW';
    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
        include: { payment: true, listing: { select: { title: true, providerId: true } } },
      });
      if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Không tìm thấy booking.' });

      // A no-show costs the traveler money, so it also has to wait out the contact period
      const minDays = noShow ? HANDOVER_ADMIN_DAYS : 1;
      if (daysPast(booking.startDate) < minDays)
        throw new ConflictException({
          code: 'HANDOVER_NOT_OVERDUE',
          message: noShow
            ? 'Chỉ kết luận khách không đến sau khi đã quá hạn bàn giao ít nhất 2 ngày.'
            : 'Đơn chưa quá hạn bàn giao.',
        });

      const { count } = await tx.booking.updateMany({
        where: { id, status: BookingStatus.CONFIRMED, checkedInAt: null },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledBy: CANCELLED_BY[dto.fault],
          cancellationReason: dto.note ? `${REASONS[dto.fault]}: ${dto.note}` : REASONS[dto.fault],
          cancelledAt: new Date(),
          balanceDueAt: null,
        },
      });
      if (count === 0)
        throw new ConflictException({ code: 'INVALID_BOOKING_STATUS', message: 'Đơn không còn ở trạng thái chờ bàn giao.' });

      const { title, providerId } = booking.listing;
      const payment = booking.payment?.status === PaymentStatus.PAID ? booking.payment : null;
      let refunded = 0;
      let toProvider = 0;
      if (payment) {
        const deposit = Number(payment.depositAmount);
        const rental = payment.rentalPaidAt ? Number(payment.rentalAmount) : 0;
        const depositFromWallet = payment.gateway === PaymentGateway.WALLET;
        // A wallet deposit stays frozen until the balance is paid; after that it sits in escrow
        const depositFrozen = depositFromWallet && !payment.rentalPaidAt;
        refunded = noShow ? rental : deposit + rental;
        toProvider = noShow ? deposit : 0;

        const fromEscrow =
          (depositFromWallet && !depositFrozen ? deposit : 0) +
          (payment.rentalGateway === PaymentGateway.WALLET ? rental : 0);
        if (fromEscrow > 0) await this.escrow.debit(fromEscrow, tx);

        const wallet = await tx.wallet.upsert({
          where: { userId: booking.travelerId },
          create: { userId: booking.travelerId, availableBalance: refunded },
          update: {
            availableBalance: { increment: refunded },
            ...(depositFrozen ? { frozenBalance: { decrement: deposit } } : {}),
          },
        });
        if (refunded > 0) {
          const note = `Hoàn tiền do quá hạn bàn giao đơn thuê “${title}”`;
          await this.record(tx, wallet.walletId, WalletTxType.REFUND, refunded, wallet.availableBalance, id, note);
          await tx.refundRecord.create({
            data: {
              paymentId: payment.id, amount: refunded, reason: RefundReason.CANCELLATION,
              status: RefundStatus.PROCESSED, note, processedAt: new Date(),
            },
          });
          await tx.payment.update({
            where: { id: payment.id },
            data: { refundedAmount: { increment: refunded }, ...(noShow ? {} : { status: PaymentStatus.REFUNDED }) },
          });
        }

        if (toProvider > 0) {
          await this.record(
            tx, wallet.walletId, WalletTxType.DEBIT, toProvider, wallet.availableBalance, id,
            `Mất cọc do không đến nhận đơn thuê “${title}”`,
          );
          const provider = await tx.wallet.upsert({
            where: { userId: providerId },
            create: { userId: providerId, availableBalance: toProvider },
            update: { availableBalance: { increment: toProvider } },
          });
          await this.record(
            tx, provider.walletId, WalletTxType.CREDIT, toProvider, provider.availableBalance, id,
            `Nhận cọc do khách không đến nhận đơn thuê “${title}”`,
          );
        }
      }

      if (dto.fault === 'PROVIDER_FAULT')
        await tx.providerProfile.updateMany({
          where: { userId: providerId },
          data: { cancellationStrikes: { increment: 1 } },
        });

      await tx.notification.createMany({
        data: [booking.travelerId, providerId].map((userId) => ({
          userId,
          type: NotificationType.BOOKING,
          title: 'Đơn thuê đã bị huỷ do quá hạn bàn giao',
          body: `Đơn thuê "${title}" đã bị huỷ. Lý do: ${REASONS[dto.fault]}.`,
          data: { bookingId: id },
        })),
      });
      await this.audit.log(tx, ctx, {
        action: 'BOOKING_OVERDUE_HANDOVER_RESOLVED', entityType: 'Booking', entityId: id,
        before: { status: booking.status },
        after: { status: BookingStatus.CANCELLED, fault: dto.fault, refunded, toProvider, note: dto.note ?? null },
      });
      return { id, status: BookingStatus.CANCELLED, refunded, toProvider };
    });

    // A provider's or FlexTrip's fault gives the voucher back; a no-show keeps or forfeits it
    await this.vouchers.onBookingCancelled(id, noShow ? CancelledBy.TRAVELER : CancelledBy.PROVIDER);
    return result;
  }

  /** Opens the dispute through which the existing penalty flow collects late-return compensation. */
  async openLateReturnDispute(id: string, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Không tìm thấy booking.' });
      const fee = suggestLateFee(booking);
      if (!fee || fee.lateDays < LATE_RETURN_DISPUTE_DAYS)
        throw new ConflictException({
          code: 'RETURN_NOT_OVERDUE',
          message: `Chỉ mở tranh chấp khi trả trễ từ ${LATE_RETURN_DISPUTE_DAYS} ngày.`,
        });
      const { count } = await tx.booking.updateMany({
        where: { id, status: BookingStatus.IN_PROGRESS, checkedOutAt: null },
        data: { status: BookingStatus.DISPUTED },
      });
      if (count === 0)
        throw new ConflictException({ code: 'INVALID_BOOKING_STATUS', message: 'Đơn không ở trạng thái đang thuê.' });

      const dispute = await tx.dispute.create({
        data: {
          bookingId: id,
          openedById: ctx.actorId,
          type: DisputeType.DAMAGE_CLAIM,
          priority: DisputePriority.HIGH,
          status: DisputeStatus.OPEN,
          reason: `Trả thiết bị quá hạn ${fee.lateDays} ngày`,
          requestedAmount: new Prisma.Decimal(fee.amount),
        },
      });
      await tx.contract.updateMany({ where: { bookingId: id }, data: { status: ContractStatus.DISPUTED } });
      await this.audit.log(tx, ctx, {
        action: 'DISPUTE_LATE_RETURN_OPENED', entityType: 'Dispute', entityId: dispute.id,
        after: { bookingId: id, lateDays: fee.lateDays, requestedAmount: fee.amount },
      });
      return { disputeId: dispute.id };
    });
  }

  private record(
    tx: Prisma.TransactionClient, walletId: string, type: WalletTxType, amount: number,
    balanceAfter: Prisma.Decimal | number, bookingId: string, note: string,
  ) {
    return tx.walletTransaction.create({
      data: { walletId, type, amount, balanceAfter, refType: 'booking', refId: bookingId, note },
    });
  }
}
