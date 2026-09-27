import { Role, UserStatus } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { createUser, http } from './support/admin-fixtures';

export const ADMIN_ROUTES = [
  '/admin/users', '/admin/users/stats',
  '/admin/listings', '/admin/listings/stats',
  '/admin/disputes', '/admin/disputes/stats',
  '/admin/finance/transactions', '/admin/finance/summary',
  '/admin/analytics/overview', '/admin/analytics/timeseries', '/admin/dashboard',
  '/admin/config', '/admin/audit-logs', '/admin/audit-logs/stats',
  '/admin/staff', '/admin/staff/stats',
  '/admin/staff-rules', '/admin/bookings',
];

describe('admin access control', () => {
  const h = new AuthHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => { await resetDatabase(h.prisma); h.redis.clear(); });

  it.each(ADMIN_ROUTES)('%s requires a token', async (path) => {
    expect((await http(h).get(path)).status).toBe(401);
  });

  it.each(ADMIN_ROUTES)('%s rejects non-admin roles', async (path) => {
    for (const roles of [[Role.TRAVELER], [Role.PROVIDER], [Role.STAFF]]) {
      const u = await createUser(h, { roles });
      const res = await http(h, u.accessToken).get(path);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('INSUFFICIENT_ROLE');
    }
  });

  it('rejects a suspended or unverified admin even with a valid token', async () => {
    const suspended = await createUser(h, { roles: [Role.ADMIN], status: UserStatus.SUSPENDED });
    const unverified = await createUser(h, { roles: [Role.ADMIN], verified: false });
    for (const u of [suspended, unverified]) {
      const res = await http(h, u.accessToken).get('/admin/users');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ACCOUNT_NOT_ELIGIBLE');
    }
  });

  it('trusts DB roles over JWT roles', async () => {
    const u = await createUser(h, { roles: [Role.TRAVELER] });
    const forged = await h.jwt.signAsync({ sub: u.id, roles: [Role.ADMIN] }, { secret: process.env.JWT_ACCESS_SECRET });
    expect((await http(h, forged).get('/admin/users')).status).toBe(403);
  });
});
