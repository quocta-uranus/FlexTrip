import { BookingStatus, PaymentStatus, Role } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { createAdmin, createBooking, createListing, createUser, http } from './support/admin-fixtures';

describe('ADMIN-05 payouts', () => {
  const h = new AuthHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => { await resetDatabase(h.prisma); h.redis.clear(); });

  async function setup() {
    const admin = await createAdmin(h);
    const p1 = await createUser(h, { roles: [Role.PROVIDER], name: 'P1' });
    const p2 = await createUser(h, { roles: [Role.PROVIDER], name: 'P2' });
    const t = await createUser(h);
    const l1 = await createListing(h, p1.id);
    const l2 = await createListing(h, p2.id);
    const end = (d: string) => new Date(`${d}T00:00:00Z`);
    // eligible for P1: 2 bookings
    await createBooking(h, { travelerId: t.id, listingId: l1.id, totalPrice: 1_000_000, endDate: end('2026-09-05') });
    await createBooking(h, { travelerId: t.id, listingId: l1.id, totalPrice: 500_000, endDate: end('2026-09-30') });
    // excluded: not COMPLETED / not PAID / outside period
    await createBooking(h, { travelerId: t.id, listingId: l1.id, status: BookingStatus.CONFIRMED, endDate: end('2026-09-10') });
    await createBooking(h, { travelerId: t.id, listingId: l1.id, payment: { status: PaymentStatus.REFUNDED }, endDate: end('2026-09-10') });
    await createBooking(h, { travelerId: t.id, listingId: l1.id, endDate: end('2026-10-01') });
    // eligible for P2
    await createBooking(h, { travelerId: t.id, listingId: l2.id, totalPrice: 300_000, endDate: end('2026-09-15') });
    return { admin, p1, p2, api: http(h, admin.accessToken) };
  }

  const period = { periodStart: '2026-09-01', periodEnd: '2026-09-30' };

  it('generates one payout per provider with correct amounts', async () => {
    const { api, p1 } = await setup();
    const res = await api.post('/admin/finance/payouts/generate', period);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ created: 2, updated: 0, skipped: 0 });
    const list = await api.get(`/admin/finance/payouts?providerId=${p1.id}`);
    expect(list.body.items[0]).toMatchObject({
      paymentCount: 2, grossAmount: 1_500_000, commissionAmount: 150_000, expectedNet: 1_350_000,
      status: 'PENDING', reconciliation: 'PENDING', discrepancy: null, periodStart: '2026-09-01', periodEnd: '2026-09-30',
    });
    expect(await h.prisma.auditLog.count({ where: { action: 'PAYOUTS_GENERATED' } })).toBe(1);
  });

  it('marks paid, computes discrepancy, and re-generate skips paid payouts', async () => {
    const { api, p1, p2 } = await setup();
    await api.post('/admin/finance/payouts/generate', period);
    const [pay1] = (await api.get(`/admin/finance/payouts?providerId=${p1.id}`)).body.items;
    const [pay2] = (await api.get(`/admin/finance/payouts?providerId=${p2.id}`)).body.items;

    expect((await api.patch(`/admin/finance/payouts/${pay1.id}`, { status: 'PAID' })).body.code).toBe('PAYMENT_DETAILS_REQUIRED');
    const paid = await api.patch(`/admin/finance/payouts/${pay1.id}`, { status: 'PAID', actualPaid: 1_300_000, transferRef: 'VCB123' });
    expect(paid.body).toMatchObject({ status: 'PAID', discrepancy: -50_000, reconciliation: 'MISMATCH' });
    expect(paid.body.paidAt).not.toBeNull();
    await api.patch(`/admin/finance/payouts/${pay2.id}`, { status: 'PAID', actualPaid: 270_000, transferRef: 'VCB124' });

    expect((await api.get('/admin/finance/payouts?reconciliation=MISMATCH')).body.total).toBe(1);
    expect((await api.get('/admin/finance/payouts?reconciliation=MATCHED')).body.total).toBe(1);
    expect((await api.patch(`/admin/finance/payouts/${pay1.id}`, { status: 'PENDING' })).body.code).toBe('PAYOUT_ALREADY_PAID');
    const fixed = await api.patch(`/admin/finance/payouts/${pay1.id}`, { actualPaid: 1_350_000 });
    expect(fixed.body.reconciliation).toBe('MATCHED');

    expect((await api.post('/admin/finance/payouts/generate', period)).body).toEqual({ created: 0, updated: 0, skipped: 2 });
  });

  it('rejects invalid periods and exports CSV', async () => {
    const { api } = await setup();
    expect((await api.post('/admin/finance/payouts/generate', { periodStart: '2026-09-30', periodEnd: '2026-09-01' })).body.code).toBe('INVALID_PERIOD');
    expect((await api.post('/admin/finance/payouts/generate', { periodStart: '2026-01-01', periodEnd: '2026-06-01' })).body.code).toBe('INVALID_PERIOD');
    expect((await api.post('/admin/finance/payouts/generate', { periodStart: '1/9/2026', periodEnd: '2026-09-30' })).status).toBe(400);
    await api.post('/admin/finance/payouts/generate', period);
    const csv = await api.get('/admin/finance/payouts/export');
    expect(csv.text.slice(1).split('\r\n')[0]).toBe(
      'Provider,Kỳ từ,Kỳ đến,Số GD,Doanh thu,Hoa hồng,Dự kiến chi,Thực chi,Chênh lệch,Đối soát,Trạng thái,Mã CK',
    );
  });
});
