import { BookingStatus, DisputeStatus, Role } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { createAdmin, createBooking, createDispute, createListing, createUser, http } from './support/admin-fixtures';

describe('ADMIN-04 disputes', () => {
  const h = new AuthHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => { await resetDatabase(h.prisma); h.redis.clear(); });

  async function setup(bookingStatus: BookingStatus = BookingStatus.COMPLETED) {
    const admin = await createAdmin(h);
    const provider = await createUser(h, { roles: [Role.PROVIDER], name: 'Đà Lạt Camping' });
    const traveler = await createUser(h, { name: 'Nguyễn Văn Minh' });
    const listing = await createListing(h, provider.id);
    const booking = await createBooking(h, { travelerId: traveler.id, listingId: listing.id, status: bookingStatus, totalPrice: 450000 });
    const dispute = await createDispute(h, { bookingId: booking.id, openedById: traveler.id });
    return { admin, booking, dispute, api: http(h, admin.accessToken) };
  }

  it('lists with parties and amount; filters and search', async () => {
    const { api, dispute } = await setup();
    const res = await api.get('/admin/disputes');
    expect(res.body.items[0]).toMatchObject({
      id: dispute.id, type: 'REFUND_REQUEST', status: 'OPEN', priority: 'MEDIUM', amount: 450000,
      traveler: { name: 'Nguyễn Văn Minh' }, provider: { name: 'Đà Lạt Camping' },
    });
    expect((await api.get('/admin/disputes?status=RESOLVED')).body.total).toBe(0);
    expect((await api.get(`/admin/disputes?search=${encodeURIComponent('văn minh')}`)).body.total).toBe(1);
    const stats = await api.get('/admin/disputes/stats');
    expect(stats.body.byStatus.OPEN).toBe(1);
    expect(stats.body.openAmount).toBe(450000);
  });

  it('detail includes booking, payment, contract and history', async () => {
    const { api, dispute } = await setup();
    await api.patch(`/admin/disputes/${dispute.id}/status`, { status: 'UNDER_REVIEW' });
    const res = await api.get(`/admin/disputes/${dispute.id}`);
    expect(res.body.booking).toMatchObject({ status: 'COMPLETED', totalPrice: 450000 });
    expect(res.body.payment).toMatchObject({ amount: 450000, platformFee: 45000, status: 'PAID' });
    expect(res.body.contract).toBeNull();
    expect(res.body.history.map((l: { action: string }) => l.action)).toEqual(['DISPUTE_STATUS_CHANGED']);
    expect(res.body.handledBy).not.toBeNull();
  });

  it('resolve with a penalty moves money from the traveler wallet to the provider wallet', async () => {
    const { api, dispute, booking } = await setup(BookingStatus.DISPUTED);
    const listing = await h.prisma.listing.findUniqueOrThrow({ where: { id: booking.listingId } });

    const noWallet = await api.post(`/admin/disputes/${dispute.id}/resolve`, { outcome: 'RESOLVED', resolution: 'Hư lều', penaltyAmount: 100000 });
    expect(noWallet.body.code).toBe('INSUFFICIENT_WALLET_BALANCE');

    await h.prisma.wallet.create({ data: { userId: booking.travelerId, availableBalance: 300000 } });
    const ok = await api.post(`/admin/disputes/${dispute.id}/resolve`, { outcome: 'RESOLVED', resolution: 'Hư lều', penaltyAmount: 100000 });
    expect(ok.status).toBe(201);
    const traveler = await h.prisma.wallet.findUniqueOrThrow({ where: { userId: booking.travelerId } });
    const provider = await h.prisma.wallet.findUniqueOrThrow({ where: { userId: listing.providerId } });
    expect(Number(traveler.availableBalance)).toBe(200000);
    expect(Number(provider.availableBalance)).toBe(100000);
    expect((await api.get(`/admin/disputes/${dispute.id}`)).body.penaltyAmount).toBe(100000);
  });

  it('resolve with refund credits the traveler wallet, sets booking REFUNDED and closes the dispute', async () => {
    const { api, dispute, booking } = await setup();
    const bad = await api.post(`/admin/disputes/${dispute.id}/resolve`, { outcome: 'RESOLVED', resolution: 'x', refundAmount: 450001 });
    expect(bad.body.code).toBe('INVALID_REFUND_AMOUNT');

    const ok = await api.post(`/admin/disputes/${dispute.id}/resolve`, { outcome: 'RESOLVED', resolution: 'Hoàn 50%', refundAmount: 225000 });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ status: 'RESOLVED', refundAmount: 225000 });
    expect((await h.prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe('REFUNDED');
    const wallet = await h.prisma.wallet.findUniqueOrThrow({ where: { userId: booking.travelerId } });
    expect(Number(wallet.availableBalance)).toBe(225000);
    expect(await h.prisma.refundRecord.count({ where: { payment: { bookingId: booking.id } } })).toBe(1);
    expect((await api.patch(`/admin/disputes/${dispute.id}/status`, { status: 'ESCALATED' })).body.code).toBe('DISPUTE_CLOSED');
    expect((await api.post(`/admin/disputes/${dispute.id}/resolve`, { outcome: 'REJECTED', resolution: 'x' })).body.code).toBe('DISPUTE_CLOSED');
  });

  it('reject cannot carry a refund; non-refundable booking is rejected', async () => {
    const { api, dispute } = await setup();
    expect((await api.post(`/admin/disputes/${dispute.id}/resolve`, { outcome: 'REJECTED', resolution: 'x', refundAmount: 1 })).body.code)
      .toBe('INVALID_REFUND_AMOUNT');
    const pending = await setup(BookingStatus.PENDING_PAYMENT);
    expect((await pending.api.post(`/admin/disputes/${pending.dispute.id}/resolve`, { outcome: 'RESOLVED', resolution: 'x', refundAmount: 1000 })).body.code)
      .toBe('BOOKING_NOT_REFUNDABLE');
    expect((await pending.api.post(`/admin/disputes/${pending.dispute.id}/resolve`, { outcome: 'RESOLVED', resolution: 'Không hoàn' })).status).toBe(201);
  });

  it('status and priority validation', async () => {
    const { api, dispute } = await setup();
    expect((await api.patch(`/admin/disputes/${dispute.id}/status`, { status: 'RESOLVED' })).status).toBe(400);
    expect((await api.patch(`/admin/disputes/${dispute.id}/priority`, { priority: 'CRITICAL' })).body.priority).toBe('CRITICAL');
    expect(await h.prisma.auditLog.count({ where: { action: 'DISPUTE_PRIORITY_CHANGED' } })).toBe(1);
    expect((await h.prisma.dispute.findUniqueOrThrow({ where: { id: dispute.id } })).status).toBe(DisputeStatus.OPEN);
  });
});
