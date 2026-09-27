import { ListingFlagStatus, ListingStatus, Role } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { createAdmin, createListing, createUser, http } from './support/admin-fixtures';

describe('ADMIN-03 moderation', () => {
  const h = new AuthHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => { await resetDatabase(h.prisma); h.redis.clear(); });

  async function setup() {
    const admin = await createAdmin(h);
    const provider = await createUser(h, { roles: [Role.PROVIDER], name: 'Shop A' });
    const reporter = await createUser(h);
    const flagged = await createListing(h, provider.id, { title: 'Xe máy giá rẻ' });
    await h.prisma.listingFlag.createMany({
      data: [
        { listingId: flagged.id, reporterId: reporter.id, reason: 'Giá ảo' },
        { listingId: flagged.id, reason: 'AI: ảnh trùng', source: 'SYSTEM' },
      ],
    });
    const clean = await createListing(h, provider.id);
    const suspended = await createListing(h, provider.id, { status: ListingStatus.SUSPENDED });
    return { admin, flagged, clean, suspended, api: http(h, admin.accessToken) };
  }

  it('tabs and item shape', async () => {
    const { api, flagged, suspended } = await setup();
    const res = await api.get('/admin/listings');
    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).toMatchObject({
      id: flagged.id, status: 'ACTIVE', openFlagsCount: 2, provider: { name: 'Shop A' },
      imageUrl: 'https://img.example.test/1.jpg', price: 100000,
    });
    expect(res.body.items[0].latestFlag.reason).toBeDefined();
    expect((await api.get('/admin/listings?tab=SUSPENDED')).body.items[0].id).toBe(suspended.id);
    expect((await api.get('/admin/listings?tab=ALL')).body.total).toBe(3);
    expect((await api.get(`/admin/listings?tab=ALL&search=${encodeURIComponent('giá rẻ')}`)).body.total).toBe(1);
    expect((await api.get('/admin/listings?tab=BOGUS')).status).toBe(400);
  });

  it('HIDE resolves open flags and requires a note', async () => {
    const { api, flagged, admin } = await setup();
    expect((await api.patch(`/admin/listings/${flagged.id}/moderate`, { action: 'HIDE' })).status).toBe(400);
    const res = await api.patch(`/admin/listings/${flagged.id}/moderate`, { action: 'HIDE', note: 'Giá sai sự thật' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: flagged.id, status: 'SUSPENDED', flagsUpdated: 2 });
    const flags = await h.prisma.listingFlag.findMany({ where: { listingId: flagged.id } });
    expect(flags.every((f) => f.status === ListingFlagStatus.RESOLVED && f.resolvedById === admin.id)).toBe(true);
    expect(await h.prisma.auditLog.count({ where: { action: 'LISTING_HIDE', entityId: flagged.id } })).toBe(1);
  });

  it('KEEP dismisses flags; KEEP without flags is rejected', async () => {
    const { api, flagged, clean } = await setup();
    const res = await api.patch(`/admin/listings/${flagged.id}/moderate`, { action: 'KEEP' });
    expect(res.body).toEqual({ id: flagged.id, status: 'ACTIVE', flagsUpdated: 2 });
    expect(await h.prisma.listingFlag.count({ where: { status: 'DISMISSED' } })).toBe(2);
    expect((await api.patch(`/admin/listings/${clean.id}/moderate`, { action: 'KEEP' })).body.code).toBe('NO_OPEN_FLAGS');
  });

  it('transition matrix', async () => {
    const { api, suspended, clean } = await setup();
    expect((await api.patch(`/admin/listings/${clean.id}/moderate`, { action: 'RESTORE' })).body.code).toBe('INVALID_TRANSITION');
    expect((await api.patch(`/admin/listings/${suspended.id}/moderate`, { action: 'HIDE', note: 'x' })).body.code).toBe('INVALID_TRANSITION');
    expect((await api.patch(`/admin/listings/${suspended.id}/moderate`, { action: 'REMOVE', note: 'x' })).body.status).toBe('REMOVED');
    expect((await api.patch(`/admin/listings/${suspended.id}/moderate`, { action: 'REMOVE', note: 'x' })).body.code).toBe('INVALID_TRANSITION');
    expect((await api.patch(`/admin/listings/${suspended.id}/moderate`, { action: 'RESTORE' })).body.status).toBe('ACTIVE');
    expect((await api.patch(`/admin/listings/nope/moderate`, { action: 'KEEP' })).status).toBe(404);
  });

  it('stats and flag history', async () => {
    const { api, flagged } = await setup();
    await api.patch(`/admin/listings/${flagged.id}/moderate`, { action: 'REMOVE', note: 'Lừa đảo' });
    const stats = await api.get('/admin/listings/stats');
    expect(stats.body).toMatchObject({ flagged: 0, suspended: 1, removedThisWeek: 1 });
    expect(typeof stats.body.avgResolutionHours).toBe('number');
    const flags = await api.get(`/admin/listings/${flagged.id}/flags`);
    expect(flags.body).toHaveLength(2);
    expect(flags.body[0]).toHaveProperty('resolvedBy');
  });
});
