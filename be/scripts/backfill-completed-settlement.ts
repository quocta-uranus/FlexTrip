/**
 * Chạy bù cho các đơn đã COMPLETED nhưng chưa chia tiền (đường "Checkout & Nhận lại" của Provider trước khi sửa).
 * Cộng điểm thưởng và chia tiền đều idempotent theo đơn nên chạy lại không cộng hai lần.
 * Mặc định chỉ liệt kê (dry-run); thêm --apply để chạy thật. Có thể giới hạn một đơn bằng --booking=<id>.
 *
 * Usage:
 *   cd be
 *   npx tsx scripts/backfill-completed-settlement.ts
 *   npx tsx scripts/backfill-completed-settlement.ts --booking=<id> --apply
 */
import { NestFactory } from '@nestjs/core';
import { LedgerStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const apply = process.argv.includes('--apply');
  const only = process.argv.find((a) => a.startsWith('--booking='))?.split('=')[1];

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const payments = app.get(PaymentsService);

  const bookings = await prisma.booking.findMany({
    where: {
      status: 'COMPLETED',
      ...(only ? { id: only } : {}),
      payment: { is: { commissionLedger: { is: null } } },
    },
    select: { id: true, totalPrice: true, updatedAt: true },
    orderBy: { updatedAt: 'asc' },
  });
  const unsettled = await prisma.commissionLedger.findMany({
    where: { status: { not: LedgerStatus.SETTLED }, ...(only ? { bookingId: only } : {}) },
    select: { bookingId: true },
  });
  const ids = [...new Set([...bookings.map((b) => b.id), ...unsettled.map((l) => l.bookingId)])];

  console.log(`${ids.length} đơn cần chia tiền bù${apply ? '' : ' (dry-run, thêm --apply để chạy thật)'}`);
  for (const id of ids) {
    console.log(`- ${id}`);
    if (apply) await payments.onBookingCompleted(id);
  }
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
