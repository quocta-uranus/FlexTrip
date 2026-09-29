import { BookingStatus, PaymentStatus, Role } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { pctChange } from '../../../common/stats.util';
import { createAdmin, createBooking, createListing, createUser, http } from './support/admin-fixtures';

describe('ADMIN-05 transactions', () => {
  const h = new AuthHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => { await resetDatabase(h.prisma); h.redis.clear(); });

  it('pctChange', () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(0, 0)).toBe(0);
    expect(pctChange(10, 0)).toBeNull();
    expect(pctChange(1, 3)).toBe(-66.7);
  });

  async function setup() {
    const admin = await createAdmin(h);
    const provider = await createUser(h, { roles: [Role.PROVIDER], name: 'Shop, "A"' });
    const traveler = await createUser(h);
    const listing = await createListing(h, provider.id);
    const at = (d: string) => new Date(`${d}T05:00:00Z`);
    await createBooking(h, { travelerId: traveler.id, listingId: listing.id, totalPrice: 1_000_000, payment: { createdAt: at('2026-09-10') } });
    await createBooking(h, { travelerId: traveler.id, listingId: listing.id, totalPrice: 500_000, payment: { createdAt: at('2026-09-12'), status: PaymentStatus.REFUNDED } });
    await createBooking(h, { travelerId: traveler.id, listingId: listing.id, totalPrice: 200_000, status: BookingStatus.CONFIRMED, payment: { createdAt: at('2026-08-20') } });
    return { admin, provider, api: http(h, admin.accessToken) };
  }

  it('lists transactions with provider net and filters', async () => {
    const { api, provider } = await setup();
    const res = await api.get('/admin/finance/transactions?from=2026-09-01&to=2026-09-30');
    expect(res.body.total).toBe(2);
    const paid = res.body.items.find((t: { status: string }) => t.status === 'PAID');
    expect(paid).toMatchObject({ amount: 1_000_000, platformFee: 100_000, providerNet: 900_000, provider: { id: provider.id } });
    expect((await api.get('/admin/finance/transactions?status=REFUNDED')).body.total).toBe(1);
    expect((await api.get(`/admin/finance/transactions?providerId=${provider.id}`)).body.total).toBe(3);
    expect((await api.get('/admin/finance/transactions?from=2026-13-01')).status).toBe(400);
  });

  it('summary with previous-period change', async () => {
    const { api } = await setup();
    const res = await api.get('/admin/finance/summary?from=2026-09-01&to=2026-09-30');
    expect(res.body).toMatchObject({
      totalRevenue: 1_000_000, platformCommission: 100_000, providerPayouts: 900_000, refundVolume: 500_000,
      reconciliation: { matched: 0, pending: 0, mismatch: 0 },
    });
    // previous 30 days contain the 200k payment
    expect(res.body.changes.totalRevenue).toBe(400);
  });

  it('exports CSV with escaping', async () => {
    const { api } = await setup();
    const res = await api.get('/admin/finance/transactions/export?from=2026-09-01&to=2026-09-30');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    const lines = res.text.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe('Mã GD,Booking,Provider,Số tiền,Phí sàn,Provider nhận,Trạng thái,Phương thức,Ngày tạo');
    expect(lines).toHaveLength(3);
    expect(res.text).toContain('"Shop, ""A"""');
  });
});
