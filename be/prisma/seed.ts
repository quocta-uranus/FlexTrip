import {
  BookingStatus, DisputePriority, DisputeStatus, DisputeType, ListingStatus, PaymentStatus,
  PayoutStatus, Prisma, PrismaClient, Role, ShopCategory, UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const D = (n: number) => new Prisma.Decimal(n);
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600_000);

async function user(email: string, name: string, roles: Role[], password: string, extra: Partial<Prisma.UserCreateInput> = {}) {
  return prisma.user.create({
    data: { email, name, password, status: UserStatus.ACTIVE, emailVerifiedAt: new Date(), roles: { create: roles.map((role) => ({ role })) }, ...extra },
  });
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed in production');
  if (await prisma.user.findUnique({ where: { email: 'seed.admin@flextrip.dev' } })) {
    console.log('Seed data already present — skipping.');
    return;
  }
  const pw = await bcrypt.hash('Seed@123456', 10);

  const admin = await user('seed.admin@flextrip.dev', 'Trần Quốc Bảo', [Role.ADMIN], pw, {
    adminProfile: { create: { employeeId: 'EMP-AD-0042', department: 'TRUST_SAFETY', level: 'L2' } },
  });
  const staff1 = await user('seed.staff1@flextrip.dev', 'Lê Văn Hùng', [Role.STAFF], pw, {
    staffProfile: { create: { employeeCode: 'EMP-OP-001', phone: '0901000001', regions: ['Hồ Chí Minh'] } },
  });
  const staff2 = await user('seed.staff2@flextrip.dev', 'Phạm Thị Lan', [Role.STAFF], pw, {
    staffProfile: { create: { employeeCode: 'EMP-OP-002', phone: '0901000002', regions: ['Đà Lạt', 'Hà Nội'] } },
  });

  const cities = ['Quận 1, TP. Hồ Chí Minh', 'Hoàn Kiếm, Hà Nội', 'Phường 1, Đà Lạt', 'Hải Châu, Đà Nẵng'];
  const categories = ['VEHICLE', 'STAY', 'CAMPING_TREKKING', 'EXPERIENCE'];
  const providers = [];
  for (let i = 1; i <= 3; i++) {
    providers.push(await user(`seed.provider${i}@flextrip.dev`, `Shop Seed ${i}`, [Role.PROVIDER], pw, {
      providerProfile: { create: { shopName: `Shop Seed ${i}`, ownerName: `Chủ shop ${i}`, category: ShopCategory.VEHICLE, pickupAddress: cities[i - 1], bankAccount: `VCB 00${i}23456789` } },
    }));
  }
  const travelers = [];
  for (let i = 1; i <= 6; i++) {
    travelers.push(await user(`seed.traveler${i}@flextrip.dev`, `Khách Seed ${i}`, [Role.TRAVELER], pw, {
      createdAt: daysAgo(i * 25),
      ...(i === 6 ? { status: UserStatus.SUSPENDED, suspendedAt: daysAgo(2), suspensionReason: 'Tranh chấp lặp lại' } : {}),
    }));
  }

  const listings = [];
  for (let i = 0; i < 12; i++) {
    listings.push(await prisma.listing.create({
      data: {
        title: `Tin seed #${i + 1}`, description: 'Dữ liệu mẫu cho admin', price: D(150_000 + i * 50_000),
        location: cities[i % 4], category: categories[i % 4], imageUrls: ['https://picsum.photos/seed/ft' + i + '/600/400'],
        amenities: [], status: i === 11 ? ListingStatus.SUSPENDED : ListingStatus.ACTIVE, providerId: providers[i % 3].id,
      },
    }));
  }
  for (const [i, l] of listings.slice(0, 4).entries()) {
    await prisma.listingFlag.create({ data: { listingId: l.id, reporterId: travelers[i].id, reason: ['Giá ảo', 'Ảnh không đúng thực tế', 'Nghi lừa đảo', 'Sai danh mục'][i] } });
  }
  await prisma.listingFlag.create({ data: { listingId: listings[0].id, source: 'SYSTEM', reason: 'AI: ảnh trùng với tin khác' } });

  const statuses = [BookingStatus.COMPLETED, BookingStatus.COMPLETED, BookingStatus.COMPLETED, BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.CANCELLED];
  const bookings = [];
  for (let i = 0; i < 30; i++) {
    const created = daysAgo(180 - i * 6);
    const status = statuses[i % statuses.length];
    const total = 300_000 + (i % 7) * 250_000;
    const b = await prisma.booking.create({
      data: {
        travelerId: travelers[i % 5].id, listingId: listings[i % 12].id, status, totalPrice: D(total),
        startDate: new Date(created.getTime() + 3 * 24 * 3600_000), endDate: new Date(created.getTime() + 5 * 24 * 3600_000),
        createdAt: created, assignedStaffId: status === BookingStatus.CONFIRMED && i % 2 === 0 ? staff1.id : null,
      },
    });
    if (status !== BookingStatus.PENDING && status !== BookingStatus.CANCELLED) {
      await prisma.payment.create({ data: { bookingId: b.id, amount: D(total), platformFee: D(total * 0.1), status: PaymentStatus.PAID, method: 'CARD', createdAt: created } });
    }
    bookings.push(b);
  }

  const disputeSpecs: [DisputeType, DisputeStatus, DisputePriority][] = [
    ['REFUND_REQUEST', 'OPEN', 'HIGH'], ['DAMAGE_CLAIM', 'UNDER_REVIEW', 'CRITICAL'], ['PAYMENT_DISPUTE', 'PENDING_INFO', 'MEDIUM'],
    ['CANCELLATION_DISPUTE', 'ESCALATED', 'HIGH'], ['REFUND_REQUEST', 'RESOLVED', 'LOW'], ['DAMAGE_CLAIM', 'REJECTED', 'MEDIUM'],
  ];
  const completed = bookings.filter((b) => b.status === BookingStatus.COMPLETED);
  for (const [i, [type, status, priority]] of disputeSpecs.entries()) {
    const closed = status === 'RESOLVED' || status === 'REJECTED';
    await prisma.dispute.create({
      data: {
        bookingId: completed[i].id, openedById: completed[i].travelerId, type, status, priority,
        reason: 'Dữ liệu mẫu tranh chấp', description: 'Khách phản ánh sản phẩm không đúng mô tả.',
        handledById: status === 'OPEN' ? null : admin.id,
        ...(closed ? { resolution: 'Đã xử lý (seed)', resolvedAt: daysAgo(1) } : {}),
      },
    });
  }

  const periodStart = new Date(`${daysAgo(60).toISOString().slice(0, 7)}-01T00:00:00Z`);
  const periodEnd = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 0));
  const payoutSpecs: [number, PayoutStatus, number | null][] = [[0, 'PAID', 0], [1, 'PAID', -50_000], [2, 'PENDING', null]];
  for (const [pi, status, diff] of payoutSpecs) {
    const gross = 2_000_000 + pi * 500_000;
    const net = gross * 0.9;
    await prisma.payout.create({
      data: {
        providerId: providers[pi].id, periodStart, periodEnd, paymentCount: 3 + pi, grossAmount: D(gross), commissionAmount: D(gross * 0.1),
        expectedNet: D(net), status, createdById: admin.id,
        ...(diff !== null ? { actualPaid: D(net + diff), discrepancy: D(diff), transferRef: `VCB-SEED-${pi}`, paidAt: daysAgo(10) } : {}),
      },
    });
  }

  await prisma.staffAssignmentRule.createMany({
    data: [
      { name: 'HCM — Hùng', region: 'Hồ Chí Minh', staffId: staff1.id, priority: 50 },
      { name: 'Đà Lạt — Lan', region: 'Đà Lạt', staffId: staff2.id, priority: 40 },
    ],
  });

  const actions: [string, string, string][] = [
    ['USER_SUSPENDED', 'USER', 'User'], ['LISTING_HIDE', 'MODERATION', 'Listing'], ['DISPUTE_STATUS_CHANGED', 'DISPUTE', 'Dispute'],
    ['CONFIG_UPDATED', 'CONFIG', 'SystemConfig'], ['PAYOUT_UPDATED', 'FINANCE', 'Payout'],
  ];
  for (let i = 0; i < 20; i++) {
    const [action, module, entityType] = actions[i % actions.length];
    await prisma.auditLog.create({
      data: { actorId: admin.id, actorRole: Role.ADMIN, action, module, entityType, entityId: `seed-${i}`, after: { seed: true }, createdAt: daysAgo(i % 10), ipAddress: '127.0.0.1' },
    });
  }

  console.log('Seed complete. Admin: seed.admin@flextrip.dev / Seed@123456');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
