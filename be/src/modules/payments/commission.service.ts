import { Injectable, NotFoundException } from '@nestjs/common';
import { LedgerStatus, PaymentGateway, WalletTxType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EscrowService } from './escrow.service';
import { COMMISSION_RATES } from './constants';

@Injectable()
export class CommissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escrow: EscrowService,
  ) {}

  async split(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        listing: { select: { providerId: true } },
      },
    });


    if (!booking?.payment) throw new NotFoundException('Payment not found for booking');

    const existing = await this.prisma.commissionLedger.findUnique({
      where: { paymentId: booking.payment.id },
    });
    if (existing?.status === LedgerStatus.SETTLED) return existing;

    const rentalAmount = Number(booking.payment.rentalAmount);
    const hasStaff = !!booking.assignedStaffId;

    const platformFee = rentalAmount * (hasStaff ? COMMISSION_RATES.PLATFORM_BASE : COMMISSION_RATES.PLATFORM_NO_STAFF);
    const staffFee = hasStaff ? rentalAmount * COMMISSION_RATES.STAFF_SHARE : 0;
    const providerNet = rentalAmount - platformFee - staffFee;

    const providerId = booking.listing.providerId;

    return this.prisma.$transaction(async (tx) => {
      // Debit escrow for wallet-paid bookings (provider + staff amounts flow out of escrow)
      // Platform keeps its share (platformFee) inside escrow — it never leaves
      if ((booking.payment?.rentalGateway ?? booking.payment?.gateway) === PaymentGateway.WALLET) {
        await this.escrow.debit(providerNet + staffFee, tx);
      }

      const providerWallet = await tx.wallet.upsert({
        where: { userId: providerId },
        create: { userId: providerId, availableBalance: providerNet },
        update: { availableBalance: { increment: providerNet } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: providerWallet.walletId,
          type: WalletTxType.COMMISSION_SPLIT,
          amount: providerNet,
          balanceAfter: providerWallet.availableBalance,
          refType: 'booking',
          refId: bookingId,
          note: `Thu nhập từ booking ${bookingId}`,
        },
      });

      if (hasStaff && booking.assignedStaffId && staffFee > 0) {
        const staffWallet = await tx.wallet.upsert({
          where: { userId: booking.assignedStaffId },
          create: { userId: booking.assignedStaffId, availableBalance: staffFee },
          update: { availableBalance: { increment: staffFee } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: staffWallet.walletId,
            type: WalletTxType.COMMISSION_SPLIT,
            amount: staffFee,
            balanceAfter: staffWallet.availableBalance,
            refType: 'booking',
            refId: bookingId,
            note: `Hoa hồng staff từ booking ${bookingId}`,
          },
        });
      }

      await tx.payment.update({
        where: { id: booking.payment!.id },
        data: { platformFee, staffFee, providerNet },
      });

      return tx.commissionLedger.upsert({
        where: { paymentId: booking.payment!.id },
        create: {
          paymentId: booking.payment!.id,
          bookingId,
          platformFee,
          staffFee,
          providerNet,
          staffUserId: booking.assignedStaffId,
          status: LedgerStatus.SETTLED,
          settledAt: new Date(),
        },
        update: {
          status: LedgerStatus.SETTLED,
          settledAt: new Date(),
          platformFee,
          staffFee,
          providerNet,
        },
      });
    });
  }
}
