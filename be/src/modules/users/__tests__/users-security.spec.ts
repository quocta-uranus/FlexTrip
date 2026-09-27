import { Role } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { createSession, createUser, http } from '../../admin/__tests__/support/admin-fixtures';

describe('users security', () => {
  const h = new AuthHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(() => resetDatabase(h.prisma));

  it('no longer lets a user grant themselves ADMIN or PROVIDER', async () => {
    const u = await createUser(h);
    expect((await http(h, u.accessToken).post('/users/me/roles/ADMIN')).status).toBe(404);
    expect((await http(h, u.accessToken).post('/users/me/roles/PROVIDER')).status).toBe(404);
    expect((await http(h, u.accessToken).delete('/users/me/roles/TRAVELER')).status).toBe(404);
    const roles = await h.prisma.userRole.findMany({ where: { userId: u.id } });
    expect(roles.map((r) => r.role)).toEqual([Role.TRAVELER]);
  });

  it("cannot revoke another user's session", async () => {
    const alice = await createUser(h);
    const bob = await createUser(h);
    const bobSession = await createSession(h, bob.id);

    const res = await http(h, alice.accessToken).delete(`/users/me/sessions/${bobSession.id}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('SESSION_NOT_FOUND');
    const after = await h.prisma.authSession.findUniqueOrThrow({ where: { id: bobSession.id } });
    expect(after.revokedAt).toBeNull();
  });

  it('revokes own session', async () => {
    const alice = await createUser(h);
    const s = await createSession(h, alice.id);
    const res = await http(h, alice.accessToken).delete(`/users/me/sessions/${s.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect((await h.prisma.authSession.findUniqueOrThrow({ where: { id: s.id } })).revokedAt).not.toBeNull();
  });
});
