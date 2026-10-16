import { BookingStatus, LedgerStatus, PaymentGateway, PrismaClient, WalletTxType } from '@prisma/client';
import { COMMISSION_RATES } from '../src/modules/payments/constants';

// One-off: bookings completed under the old "refundable deposit" model still have the deposit frozen
// and a commission computed on the balance only. Treat the deposit as part of the price instead.
// Dry-run by default; pass --apply to write. Safe to re-run: settled bookings carry a marker transaction.

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const MARKER = 'Cọc được tính vào tiền thuê booking';

async function main() {
  const payments = await prisma.payment.findMany({
    where: {
      booking: { status: BookingStatus.COMPLETED },
      gateway: PaymentGateway.WALLET,
      rentalGateway: PaymentGateway.WALLET,
      depositAmount: { gt: 0 },
    },
    include: { booking: { select: { id: true, travelerId: true, assignedStaffId: true, listing: { select: { providerId: true } } } } },
  });

  let fixed = 0;
  for (const payment of payments) {
    const { booking } = payment;
    const done = await prisma.walletTransaction.findFirst({
      where: { refType: 'payment', refId: payment.id, note: { startsWith: MARKER } },
    });
    const ledger = await prisma.commissionLedger.findUnique({ where: { paymentId: payment.id } });
    if (done || ledger?.status !== LedgerStatus.SETTLED) continue;

    const deposit = Number(payment.depositAmount);
    const total = Number(payment.totalAmount);
    const hasStaff = !!booking.assignedStaffId;
    const platformFee = total * (hasStaff ? COMMISSION_RATES.PLATFORM_BASE : COMMISSION_RATES.PLATFORM_NO_STAFF);
    const staffFee = hasStaff ? total * COMMISSION_RATES.STAFF_SHARE : 0;
    const providerNet = total - platformFee - staffFee;
    const providerDelta = providerNet - Number(payment.providerNet);
    const staffDelta = staffFee - Number(payment.staffFee);

    console.log(
      `${booking.id}: unfreeze ${deposit}, provider +${providerDelta}, staff +${staffDelta}, ` +
      `platform ${Number(payment.platformFee)} -> ${platformFee}`,
    );
    if (!APPLY) continue;

    await prisma.$transaction(async (tx) => {
      const traveler = await tx.wallet.update({
        where: { userId: booking.travelerId },
        data: { frozenBalance: { decrement: deposit } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: traveler.walletId, type: WalletTxType.DEBIT, amount: deposit,
          balanceAfter: traveler.availableBalance, refType: 'payment', refId: payment.id,
          note: `${MARKER} ${booking.id}`,
        },
      });

      const credits: Array<{ userId: string; amount: number; note: string }> = [
        { userId: booking.listing.providerId, amount: providerDelta, note: `Bổ sung thu nhập (tính trên 100% giá) từ booking ${booking.id}` },
      ];
      if (booking.assignedStaffId) {
        credits.push({ userId: booking.assignedStaffId, amount: staffDelta, note: `Bổ sung hoa hồng staff (tính trên 100% giá) từ booking ${booking.id}` });
      }
      for (const credit of credits.filter((c) => c.amount > 0)) {
        const wallet = await tx.wallet.update({
          where: { userId: credit.userId },
          data: { availableBalance: { increment: credit.amount } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.walletId, type: WalletTxType.COMMISSION_SPLIT, amount: credit.amount,
            balanceAfter: wallet.availableBalance, refType: 'booking', refId: booking.id, note: credit.note,
          },
        });
      }

      // The deposit joins escrow, then the extra provider/staff payouts leave it
      await tx.platformEscrow.update({
        where: { id: 'singleton' },
        data: { balance: { increment: deposit - providerDelta - staffDelta } },
      });
      await tx.payment.update({ where: { id: payment.id }, data: { platformFee, staffFee, providerNet } });
      await tx.commissionLedger.update({ where: { paymentId: payment.id }, data: { platformFee, staffFee, providerNet } });
    });
    fixed += 1;
  }

  console.log(APPLY ? `Applied to ${fixed} booking(s).` : 'Dry run — nothing written. Re-run with --apply.');
}

main().finally(() => prisma.$disconnect());
