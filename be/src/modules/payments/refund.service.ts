import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CancelledBy, BookingStatus, RefundReason, RefundStatus, WalletTxType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Release frozen deposit back to traveler 72h after COMPLETED (skip if open dispute)
  async releaseDeposit(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking?.payment) return;
    if (booking.status !== BookingStatus.COMPLETED) return;

    // Do not release deposit while an unresolved dispute exists
    const openDispute = await this.prisma.dispute.findFirst({
      where: {
        bookingId,
        status: { notIn: ['RESOLVED', 'REJECTED'] },
      },
    });
    if (openDispute) {
      this.logger.warn(`Deposit release deferred — open dispute ${openDispute.id} on booking ${bookingId}`);
      return;
    }

    const depositAmount = Number(booking.payment.depositAmount);
    if (depositAmount <= 0) return;

    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: booking.travelerId },
        create: { userId: booking.travelerId, availableBalance: depositAmount },
        update: {
          frozenBalance: { decrement: depositAmount },
          availableBalance: { increment: depositAmount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.walletId,
          type: WalletTxType.UNFREEZE,
          amount: depositAmount,
          balanceAfter: wallet.availableBalance,
          refType: 'booking',
          refId: bookingId,
          note: 'Hoàn trả cọc sau 72h hoàn thành',
        },
      });

      await tx.refundRecord.create({
        data: {
          paymentId: booking.payment!.id,
          amount: depositAmount,
          reason: RefundReason.SYSTEM,
          status: RefundStatus.PROCESSED,
          note: 'Deposit released 72h post-completion',
          processedAt: new Date(),
        },
      });

      await tx.payment.update({
        where: { id: booking.payment!.id },
        data: { refundedAmount: { increment: depositAmount } },
      });
    });
  }

  async processCancellationRefund(
    bookingId: string,
    cancelledBy: CancelledBy,
    bookingStatus: BookingStatus,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true, listing: { select: { providerId: true } } },
    });
    if (!booking?.payment) return;

    const depositAmount = Number(booking.payment.depositAmount);
    const rentalAmount = Number(booking.payment.rentalAmount);
    // Tiền thuê chỉ thu sau khi provider duyệt nên có thể chưa trả khi huỷ
    const rentalPaid = !!booking.payment.rentalPaidAt;
    const totalPaid = depositAmount + (rentalPaid ? rentalAmount : 0);
    const daysUntilStart = Math.ceil(
      (booking.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    const refundAmount = this.calculateRefund({
      cancelledBy,
      bookingStatus,
      totalPaid,
      depositAmount,
      rentalAmount: rentalPaid ? rentalAmount : 0,
      daysUntilStart,
    });

    if (refundAmount <= 0) return;

    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId: booking.travelerId },
        create: { userId: booking.travelerId, availableBalance: refundAmount },
        update: { availableBalance: { increment: refundAmount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.walletId,
          type: WalletTxType.REFUND,
          amount: refundAmount,
          balanceAfter: wallet.availableBalance,
          refType: 'booking',
          refId: bookingId,
          note: `Hoàn tiền hủy booking ${bookingId}`,
        },
      });

      await tx.refundRecord.create({
        data: {
          paymentId: booking.payment!.id,
          amount: refundAmount,
          reason: RefundReason.CANCELLATION,
          status: RefundStatus.PROCESSED,
          processedAt: new Date(),
        },
      });

      await tx.payment.update({
        where: { id: booking.payment!.id },
        data: { refundedAmount: { increment: refundAmount } },
      });
    });

    return refundAmount;
  }

  private calculateRefund(params: {
    cancelledBy: CancelledBy;
    bookingStatus: BookingStatus;
    totalPaid: number;
    depositAmount: number;
    rentalAmount: number;
    daysUntilStart: number;
  }): number {
    const { cancelledBy, bookingStatus, totalPaid, depositAmount, rentalAmount, daysUntilStart } = params;

    // Provider cancels → full refund to traveler
    if (cancelledBy === CancelledBy.PROVIDER) return totalPaid;

    // System cancels (hold expired, etc.) → full refund
    if (cancelledBy === CancelledBy.SYSTEM) return totalPaid;

    // Traveler cancels before approval → full refund
    if (bookingStatus === BookingStatus.PENDING_APPROVAL) return totalPaid;

    // Traveler cancels after confirmation
    if (cancelledBy === CancelledBy.TRAVELER) {
      if (daysUntilStart > 7) return totalPaid;             // >7 days: full refund
      if (daysUntilStart > 3) return rentalAmount;           // 4–7 days: return rental, forfeit deposit
      if (daysUntilStart > 0) return 0;                      // ≤3 days: forfeit everything
      return 0;                                               // after start: no refund
    }

    return 0;
  }
}
