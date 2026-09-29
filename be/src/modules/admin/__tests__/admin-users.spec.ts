import { Role, UserStatus } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { blockedKey } from '../../../common/redis/auth-blocklist';
import { createAdmin, createSession, createUser, http } from './support/admin-fixtures';

describe('ADMIN-01 users', () => {
  const h = new AuthHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => { await resetDatabase(h.prisma); h.redis.clear(); });

  it('lists with filters and pagination', async () => {
    const admin = await createAdmin(h);
    await createUser(h, { name: 'Nguyễn Minh', email: 'minh@example.test' });
    await createUser(h, { name: 'Trần An' });
    await createUser(h, { roles: [Role.PROVIDER], name: 'Shop Đà Lạt' });
    await createUser(h, { status: UserStatus.SUSPENDED });
    const api = http(h, admin.accessToken);

    const all = await api.get('/admin/users?limit=2');
    expect(all.status).toBe(200);
    expect(all.body).toMatchObject({ total: 5, page: 1, limit: 2, totalPages: 3 });
    expect(all.body.items).toHaveLength(2);

    expect((await api.get('/admin/users?role=PROVIDER')).body.total).toBe(1);
    expect((await api.get('/admin/users?status=SUSPENDED')).body.total).toBe(1);
    const search = await api.get('/admin/users?search=MINH');
    expect(search.body.items.map((u: { email: string }) => u.email)).toEqual(['minh@example.test']);
    expect(search.body.items[0]).toMatchObject({
      name: 'Nguyễn Minh', roles: ['TRAVELER'], status: 'ACTIVE', bookingsCount: 0, kycStatus: null,
    });
    expect((await api.get('/admin/users?limit=101')).status).toBe(400);
    expect((await api.get('/admin/users?role=GOD')).status).toBe(400);
  });

  it('stats', async () => {
    const admin = await createAdmin(h);
    await createUser(h);
    await createUser(h, { status: UserStatus.SUSPENDED });
    await createUser(h, { status: UserStatus.DISABLED, createdAt: new Date('2020-01-01') });
    const res = await http(h, admin.accessToken).get('/admin/users/stats');
    expect(res.body).toEqual({ total: 4, active: 2, suspended: 1, disabled: 1, newThisMonth: 3 });
  });

  it('suspends: revokes sessions, blocks token immediately, audits', async () => {
    const admin = await createAdmin(h);
    const target = await createUser(h);
    const session = await createSession(h, target.id);
    expect((await http(h, target.accessToken).get('/users/me')).status).toBe(200);

    const res = await http(h, admin.accessToken).patch(`/admin/users/${target.id}/suspend`, { reason: 'Gian lận thanh toán' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: target.id, status: 'SUSPENDED', suspensionReason: 'Gian lận thanh toán' });

    expect((await h.prisma.authSession.findUniqueOrThrow({ where: { id: session.id } })).revokedAt).not.toBeNull();
    expect(h.redis.keys()).toContain(blockedKey(target.id));
    const blocked = await http(h, target.accessToken).get('/users/me');
    expect(blocked.status).toBe(401);
    expect(blocked.body.code).toBe('ACCOUNT_SUSPENDED');

    const log = await h.prisma.auditLog.findFirstOrThrow({ where: { action: 'USER_SUSPENDED' } });
    expect(log).toMatchObject({ actorId: admin.id, actorRole: 'ADMIN', entityType: 'User', entityId: target.id, before: { status: 'ACTIVE' } });
  });

  it('suspend guards', async () => {
    const admin = await createAdmin(h);
    const otherAdmin = await createAdmin(h, 'Other');
    const suspended = await createUser(h, { status: UserStatus.SUSPENDED });
    const target = await createUser(h);
    const api = http(h, admin.accessToken);
    const reason = { reason: 'x' };

    expect((await api.patch(`/admin/users/${admin.id}/suspend`, reason)).body.code).toBe('CANNOT_SUSPEND_SELF');
    expect((await api.patch(`/admin/users/${otherAdmin.id}/suspend`, reason)).body.code).toBe('CANNOT_SUSPEND_ADMIN');
    expect((await api.patch(`/admin/users/${suspended.id}/suspend`, reason)).body.code).toBe('USER_NOT_ACTIVE');
    expect((await api.patch(`/admin/users/nope/suspend`, reason)).status).toBe(404);
    expect((await api.patch(`/admin/users/${target.id}/suspend`, { reason: '' })).status).toBe(400);
    expect((await api.patch(`/admin/users/${target.id}/suspend`, {})).status).toBe(400);
    expect(await h.prisma.auditLog.count()).toBe(0);
  });

  it('unsuspends and clears the blocklist', async () => {
    const admin = await createAdmin(h);
    const target = await createUser(h);
    const api = http(h, admin.accessToken);
    await api.patch(`/admin/users/${target.id}/suspend`, { reason: 'x' });

    const res = await api.patch(`/admin/users/${target.id}/unsuspend`, { note: 'Đã xác minh' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ACTIVE', suspensionReason: null, suspendedAt: null });
    expect(h.redis.keys()).not.toContain(blockedKey(target.id));
    expect((await api.patch(`/admin/users/${target.id}/unsuspend`, {})).body.code).toBe('USER_NOT_SUSPENDED');
    expect(await h.prisma.auditLog.count({ where: { action: 'USER_UNSUSPENDED' } })).toBe(1);
  });

  it('detail includes recent audit entries', async () => {
    const admin = await createAdmin(h);
    const target = await createUser(h);
    await http(h, admin.accessToken).patch(`/admin/users/${target.id}/suspend`, { reason: 'x' });
    const res = await http(h, admin.accessToken).get(`/admin/users/${target.id}`);
    expect(res.status).toBe(200);
    expect(res.body.recentAudit).toHaveLength(1);
    expect(res.body.recentAudit[0]).toMatchObject({ action: 'USER_SUSPENDED', actor: { id: admin.id } });
  });
});
