import request from 'supertest';
import { AuthHarness, password } from './support/auth-harness';

describe('AUTH-06 — Session and Device Management', () => {
  let h: AuthHarness;

  beforeEach(async () => {
    h = new AuthHarness();
    await h.open();
  });
  afterEach(() => h.close());

  async function verifiedAccount() {
    return h.register();
  }

  async function login(email: string, deviceName: string) {
    return h
      .post('login', { email, password, deviceName })
      .set('User-Agent', `${deviceName}/1.0`)
      .expect(200);
  }

  function bearer(method: 'get' | 'delete', path: string, token: string) {
    return request(h.app.getHttpServer())
      [method](`/api/v1/auth/${path}`)
      .set('Authorization', `Bearer ${token}`);
  }

  it('keeps multiple device sessions and marks the current one', async () => {
    const { email } = await verifiedAccount();
    await login(email, 'Laptop');
    const phone = await login(email, 'Phone');

    const response = await bearer('get', 'sessions', phone.body.accessToken);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(
      response.body.find((item: { current: boolean }) => item.current),
    ).toMatchObject({
      deviceName: 'Phone',
      userAgent: 'Phone/1.0',
    });
    expect(response.body[0]).not.toHaveProperty('refreshTokenHash');
  });

  it('rotates one session without invalidating another device', async () => {
    const { email } = await verifiedAccount();
    const laptop = await login(email, 'Laptop');
    const phone = await login(email, 'Phone');
    const rotated = await h
      .post('refresh', { refreshToken: laptop.body.refreshToken })
      .expect(200);

    await h
      .post('refresh', { refreshToken: laptop.body.refreshToken })
      .expect(401);
    await h
      .post('refresh', { refreshToken: phone.body.refreshToken })
      .expect(200);
    await h
      .post('refresh', { refreshToken: rotated.body.refreshToken })
      .expect(200);
  });

  it('revokes one owned session', async () => {
    const { email } = await verifiedAccount();
    const laptop = await login(email, 'Laptop');
    const phone = await login(email, 'Phone');
    const sessions = await bearer('get', 'sessions', phone.body.accessToken);
    const laptopSession = sessions.body.find(
      (item: { deviceName: string }) => item.deviceName === 'Laptop',
    );

    await bearer(
      'delete',
      `sessions/${laptopSession.id}`,
      phone.body.accessToken,
    ).expect(204);
    await h
      .post('refresh', { refreshToken: laptop.body.refreshToken })
      .expect(401);
    await h
      .post('refresh', { refreshToken: phone.body.refreshToken })
      .expect(200);
  });

  it('revokes every session except the current device', async () => {
    const { email } = await verifiedAccount();
    const laptop = await login(email, 'Laptop');
    const phone = await login(email, 'Phone');
    const response = await bearer(
      'delete',
      'sessions/others',
      phone.body.accessToken,
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ revokedCount: 1 });
    await h
      .post('refresh', { refreshToken: laptop.body.refreshToken })
      .expect(401);
    await h
      .post('refresh', { refreshToken: phone.body.refreshToken })
      .expect(200);
  });

  it('cannot revoke a session owned by another user', async () => {
    const first = await verifiedAccount();
    const firstLogin = await login(first.email, 'First');
    const firstSessions = await bearer(
      'get',
      'sessions',
      firstLogin.body.accessToken,
    );
    const second = await h.register('second@example.com');
    const secondLogin = await login(second.email, 'Second');

    await bearer(
      'delete',
      `sessions/${firstSessions.body[0].id}`,
      secondLogin.body.accessToken,
    ).expect(400);
    await h
      .post('refresh', { refreshToken: firstLogin.body.refreshToken })
      .expect(200);
  });

  it('uses current database roles and excludes Admin-only accounts', async () => {
    const { email, userId } = await verifiedAccount();
    const signedIn = await login(email, 'Admin computer');
    await h.prisma.userRole.deleteMany({ where: { userId } });
    await h.prisma.userRole.create({ data: { userId, role: 'ADMIN' } });
    await bearer('get', 'sessions', signedIn.body.accessToken).expect(403);
  });
});
