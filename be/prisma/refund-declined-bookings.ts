import { NestFactory } from '@nestjs/core';
import { BookingStatus, CancelledBy, PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { RefundService } from '../src/modules/payments/refund.service';

// One-off: before the decline fix, a provider rejecting a paid booking never queued the refund,
// so the traveler kept a frozen deposit and got nothing back. Dry-run by default; pass --apply to refund.

const APPLY = process.argv.includes('--apply');

async function main() {
  const prisma = new PrismaClient();
  const stuck = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CANCELLED,
      cancelledBy: CancelledBy.PROVIDER,
      payment: { is: { depositAmount: { gt: 0 }, refundedAmount: 0, refundRecords: { none: {} } } },
    },
    select: { id: true, payment: { select: { depositAmount: true, rentalPaidAt: true, rentalAmount: true } } },
  });
  await prisma.$disconnect();

  for (const b of stuck) {
    const refund = Number(b.payment!.depositAmount) + (b.payment!.rentalPaidAt ? Number(b.payment!.rentalAmount) : 0);
    console.log(`${b.id}: refund ${refund}`);
  }
  if (!APPLY || stuck.length === 0) {
    console.log(APPLY ? 'Nothing to refund.' : 'Dry run — nothing written. Re-run with --apply.');
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const refunds = app.get(RefundService, { strict: false });
  for (const b of stuck) {
    // Declining is only possible while PENDING_APPROVAL, which is a full refund for provider cancellations
    await refunds.processCancellationRefund(b.id, CancelledBy.PROVIDER, BookingStatus.PENDING_APPROVAL);
  }
  console.log(`Refunded ${stuck.length} booking(s).`);
  await app.close();
}

main().then(() => process.exit(0));
