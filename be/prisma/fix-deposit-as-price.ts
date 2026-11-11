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
      // Balance already paid, so the deposit should no longer be frozen
      rentalPaidAt: { not: null },
      booking: { status: { in: [BookingStatus.COMPLETED, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.DISPUTED] } },
      gateway: PaymentGateway.WALLET,
      rentalGateway: PaymentGateway.WALLET,
      depositAmount: { gt: 0 },
    },
    include: { booking: { select: { id: true, status: true, travelerId: true, assignedStaffId: true, listing: { select: { providerId: true } } } } },
  });

  let fixed = 0;
  for (const payment of payments) {
    const { booking } = payment;
    const done = await prisma.walletTransaction.findFirst({
      where: { refType: 'payment', refId: payment.id, note: { startsWith: MARKER } },
    });
    const ledger = await prisma.commissionLedger.findUnique({ where: { paymentId: payment.id } });
    if (done) continue;
    // Not settled yet: the commission job will use the full price, so only the deposit needs moving
    const settled = ledger?.status === LedgerStatus.SETTLED;

    const deposit = Number(payment.depositAmount);
    // Same base as CommissionService.split: a partial dispute refund is not the provider's money
    const total = Number(payment.totalAmount) - Number(payment.refundedAmount);
    const hasStaff = !!booking.assignedStaffId;
    const platformFee = total * (hasStaff ? COMMISSION_RATES.PLATFORM_BASE : COMMISSION_RATES.PLATFORM_NO_STAFF);
    const staffFee = hasStaff ? total * COMMISSION_RATES.STAFF_SHARE : 0;
    const providerNet = total - platformFee - staffFee;
    const providerDelta = settled ? providerNet - Number(payment.providerNet) : 0;
    const staffDelta = settled ? staffFee - Number(payment.staffFee) : 0;

    const travelerWallet = await prisma.wallet.findUnique({ where: { userId: booking.travelerId } });
    if (!travelerWallet || Number(travelerWallet.frozenBalance) < deposit) {
      console.warn(`${booking.id}: SKIP, traveler frozen balance is below the deposit ${deposit}`);
      continue;
    }
    // Only top-ups are handled; a negative delta would need a clawback from the provider/staff wallet
    if (providerDelta < 0 || staffDelta < 0) {
      console.warn(`${booking.id}: SKIP, commission would decrease (provider ${providerDelta}, staff ${staffDelta})`);
      continue;
    }

    console.log(
      `${booking.id} (${payment.booking.status}): unfreeze ${deposit}` +
      (settled ? `, provider +${providerDelta}, staff +${staffDelta}, platform ${Number(payment.platformFee)} -> ${platformFee}` : ', commission not split yet'),
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
      if (settled) {
        await tx.payment.update({ where: { id: payment.id }, data: { platformFee, staffFee, providerNet } });
        await tx.commissionLedger.update({ where: { paymentId: payment.id }, data: { platformFee, staffFee, providerNet } });
      }
    });
    fixed += 1;
  }

  console.log(APPLY ? `Applied to ${fixed} booking(s).` : 'Dry run — nothing written. Re-run with --apply.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
