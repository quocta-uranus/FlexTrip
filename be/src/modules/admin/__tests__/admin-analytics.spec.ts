import { BookingStatus, KycDocumentType, Role } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { createBooking, createDispute, createListing, createUser, http } from './support/admin-fixtures';

describe('ADMIN-06 analytics', () => {
  const h = new AuthHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => { await resetDatabase(h.prisma); h.redis.clear(); });

  const at = (d: string) => new Date(`${d}T05:00:00Z`);

  async function setup() {
    const admin = await createUser(h, { roles: [Role.ADMIN], createdAt: at('2026-01-01') });
    const provider = await createUser(h, { roles: [Role.PROVIDER], createdAt: at('2026-01-01') });
    const t1 = await createUser(h, { createdAt: at('2026-09-02') });
    const t2 = await createUser(h, { createdAt: at('2026-01-01') });
    const stay = await createListing(h, provider.id, { category: 'BEACH' });
    const car = await createListing(h, provider.id, { category: 'TREKKING' });
    // September: t1 books twice (repeat), one cancelled
    await createBooking(h, { travelerId: t1.id, listingId: stay.id, totalPrice: 3_000_000, createdAt: at('2026-09-05'), payment: { createdAt: at('2026-09-05') } });
    await createBooking(h, { travelerId: t1.id, listingId: car.id, totalPrice: 1_000_000, createdAt: at('2026-09-20'), payment: { createdAt: at('2026-09-20') } });
    await createBooking(h, { travelerId: t1.id, listingId: car.id, status: BookingStatus.CANCELLED, createdAt: at('2026-09-21'), payment: null });
    // August: t2 books once (churned in September)
    await createBooking(h, { travelerId: t2.id, listingId: car.id, totalPrice: 2_000_000, createdAt: at('2026-08-15'), payment: { createdAt: at('2026-08-15') } });
    return { admin, t1, api: http(h, admin.accessToken) };
  }

  it('overview KPIs with change vs previous period', async () => {
    const { api } = await setup();
    const res = await api.get('/admin/analytics/overview?from=2026-09-01&to=2026-09-30');
    expect(res.status).toBe(200);
    expect(res.body.kpis.totalRevenue).toEqual({ value: 4_000_000, change: 100 });
    expect(res.body.kpis.platformCommission.value).toBe(400_000);
    expect(res.body.kpis.cancellationRate.value).toBe(33.3);
    expect(res.body.topMetrics).toMatchObject({ totalBookings: 3, avgBookingValue: 2_000_000, providerCount: 1, listingCount: 2 });
    expect(res.body.revenueByCategory).toEqual([
      { category: 'BEACH', revenue: 3_000_000, percent: 75 },
      { category: 'TREKKING', revenue: 1_000_000, percent: 25 },
    ]);
    expect(res.body.userGrowth.newTravelers.value).toBe(1);
    expect(res.body.userGrowth.repeatBookers.value).toBe(1);
    expect(res.body.userGrowth.churnedUsers.value).toBe(1);
  });

  it('timeseries buckets by month and validates range', async () => {
    const { api } = await setup();
    const res = await api.get('/admin/analytics/timeseries?from=2026-08-01&to=2026-09-30&granularity=month');
    expect(res.body).toEqual([
      { bucket: '2026-08-01', revenue: 2_000_000, bookings: 1, newUsers: 0 },
      { bucket: '2026-09-01', revenue: 4_000_000, bookings: 3, newUsers: 1 },
    ]);
    expect((await api.get('/admin/analytics/timeseries?from=2024-01-01&to=2026-09-30&granularity=day')).body.code).toBe('RANGE_TOO_LARGE');
    expect((await api.get('/admin/analytics/timeseries?granularity=year')).status).toBe(400);
  });

  it('dashboard counters and recent activity', async () => {
    const { api, admin, t1 } = await setup();
    const booking = await h.prisma.booking.findFirstOrThrow({ where: { travelerId: t1.id } });
    await createDispute(h, { bookingId: booking.id, openedById: t1.id });
    const listing = await h.prisma.listing.findFirstOrThrow();
    await h.prisma.listingFlag.create({ data: { listingId: listing.id, reason: 'x' } });
    await h.prisma.kycApplication.create({
      data: { userId: t1.id, legalName: 'A', documentType: KycDocumentType.PASSPORT, documentNumberEncrypted: 'e', documentNumberFingerprint: 'f', documentNumberLast4: '1', documentFrontUrl: 'https://x.test/a', selfieUrl: 'https://x.test/b' },
    });
    await h.prisma.auditLog.create({ data: { actorId: admin.id, action: 'CONFIG_UPDATED', module: 'CONFIG', entityType: 'SystemConfig' } });
    const res = await api.get('/admin/dashboard');
    expect(res.body).toMatchObject({ openDisputes: 1, openFlags: 1, pendingKyc: 1, resolvedToday: 0 });
    expect(res.body.recentActivity[0]).toMatchObject({ action: 'CONFIG_UPDATED', actor: { id: admin.id } });
  });
});
