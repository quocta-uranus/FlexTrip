import {
  BookingStatus,
  ListingStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  Role,
} from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_COUNT = 10;
const MAX_COUNT = 50;
const MARKER_NAME = 'REVIEW_TEST_SEED';
const DAY_MS = 24 * 60 * 60 * 1000;

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

function requestedCount(): number {
  const raw = argument('count');
  if (!raw) return DEFAULT_COUNT;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > MAX_COUNT) {
    throw new Error(`--count phải là số nguyên từ 1 đến ${MAX_COUNT}.`);
  }
  return value;
}

function dateDaysAgo(days: number): Date {
  const date = new Date(Date.now() - days * DAY_MS);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Không được seed booking review trong production.');
  }

  const email = argument('email')?.toLowerCase();
  if (!email) {
    throw new Error(
      'Thiếu email. Ví dụ: npm run seed:review-bookings -- --email="traveler@example.com" --count=10',
    );
  }
  const count = requestedCount();

  const traveler = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      roles: { select: { role: true } },
    },
  });
  if (!traveler) throw new Error(`Không tìm thấy tài khoản ${email}.`);

  const roles = traveler.roles.map(({ role }) => role);
  if (roles.includes(Role.ADMIN)) {
    throw new Error('Tài khoản Admin không được tạo booking giao dịch.');
  }
  if (!roles.some((role) => role === Role.TRAVELER || role === Role.PROVIDER)) {
    throw new Error('Tài khoản phải có role TRAVELER hoặc PROVIDER.');
  }

  const listings = await prisma.listing.findMany({
    where: {
      status: ListingStatus.ACTIVE,
      providerId: { not: traveler.id },
    },
    select: { id: true, title: true, price: true, providerId: true },
    orderBy: { createdAt: 'asc' },
  });
  if (listings.length === 0) {
    throw new Error(
      'Không có listing ACTIVE của Provider khác để tạo booking test.',
    );
  }

  const markerPrefix = `[${MARKER_NAME}:${traveler.id}:`;
  const existing = await prisma.booking.findMany({
    where: {
      travelerId: traveler.id,
      notes: { startsWith: markerPrefix },
    },
    select: { notes: true },
  });
  const existingMarkers = new Set(
    existing.flatMap(({ notes }) => (notes ? [notes] : [])),
  );

  const created: Array<{ slot: number; listing: string }> = [];
  let skipped = 0;

  for (let slot = 1; slot <= count; slot += 1) {
    const marker = `${markerPrefix}${slot}]`;
    if (existingMarkers.has(marker)) {
      skipped += 1;
      continue;
    }

    const listing = listings[(slot - 1) % listings.length];
    const startDate = dateDaysAgo(count * 3 + slot * 2);
    const endDate = new Date(startDate.getTime() + DAY_MS);
    const totalPrice = new Prisma.Decimal(listing.price).mul(2);
    const platformFee = totalPrice.mul(new Prisma.Decimal('0.10'));

    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          travelerId: traveler.id,
          listingId: listing.id,
          status: BookingStatus.COMPLETED,
          startDate,
          endDate,
          totalPrice,
          depositAmount: new Prisma.Decimal(0),
          quantity: 1,
          notes: marker,
          checkedInAt: startDate,
          checkedOutAt: endDate,
        },
      });

      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: totalPrice,
          platformFee,
          status: PaymentStatus.PAID,
          method: 'TEST_SEED',
          transactionId: `${MARKER_NAME}-${traveler.id}-${slot}`,
          gatewayResponse: { source: MARKER_NAME, localOnly: true },
        },
      });
    });

    created.push({ slot, listing: listing.title });
  }

  console.log(
    `Đã chuẩn bị booking review cho ${traveler.name} (${traveler.email}).`,
  );
  console.log(`Tạo mới: ${created.length}; đã tồn tại: ${skipped}.`);
  if (created.length > 0) {
    console.table(created);
  }
  console.log(
    'Mở “Đặt thuê của tôi”, chọn booking Hoàn thành và gửi từng review mẫu.',
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Không thể seed booking review: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
