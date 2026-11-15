/**
 * Gắn hạn 24 giờ cho các đơn đang PENDING_APPROVAL từ trước khi có tự huỷ. Đơn đã quá hạn sẽ được huỷ và hoàn cọc ngay
 * (job chạy gần như tức thì); đơn còn hạn chỉ được lên lịch. Job idempotent theo jobId nên chạy lại không nhân đôi.
 * Mặc định chỉ liệt kê (dry-run); thêm --apply để chạy thật.
 *
 * Usage:
 *   cd be
 *   npx tsx scripts/backfill-approval-expiry.ts
 *   npx tsx scripts/backfill-approval-expiry.ts --apply
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { APPROVAL_WINDOW_MS } from '../src/modules/booking/booking.constants';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function main() {
  const apply = process.argv.includes('--apply');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const payments = app.get(PaymentsService);

  const bookings = await prisma.booking.findMany({
    where: { status: 'PENDING_APPROVAL' },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: 'asc' },
  });

  console.log(`${bookings.length} đơn đang chờ duyệt${apply ? '' : ' (dry-run, thêm --apply để chạy thật)'}`);
  for (const b of bookings) {
    const delay = Math.max(1000, b.updatedAt.getTime() + APPROVAL_WINDOW_MS - Date.now());
    console.log(`- ${b.id} (huỷ sau ${Math.round(delay / 60000)} phút nếu Provider vẫn im lặng)`);
    if (apply) await payments.scheduleApprovalExpiry(b.id, delay);
  }
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
