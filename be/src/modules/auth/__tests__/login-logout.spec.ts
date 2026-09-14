import { AuthHarness, password } from './support/auth-harness';

describe('AUTH-02 — Login, Refresh and Logout', () => {
  let h: AuthHarness;

  beforeEach(async () => {
    h = new AuthHarness();
    await h.open();
  });

  afterEach(async () => {
    await h.close();
  });

  async function verifiedAccount() {
    const account = await h.register();
    await h.auth.verifyEmail(account.token);
    return account;
  }

  it('logs in a verified active account and returns current database roles', async () => {
    const { email, userId } = await verifiedAccount();
    await h.prisma.userRole.create({ data: { userId, role: 'PROVIDER' } });

    const response = await h
      .post('login', { email: ` ${email.toUpperCase()} `, password })
      .expect(200);

    expect(h.jwt.decode(response.body.accessToken).roles.sort()).toEqual([
      'PROVIDER',
      'TRAVELER',
    ]);
    expect(response.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  it('uses one generic response for unknown email and incorrect password', async () => {
    const { email } = await verifiedAccount();
    const unknown = await h
      .post('login', { email: 'unknown@example.com', password })
      .expect(401);
    const incorrect = await h
      .post('login', { email, password: 'incorrect-password' })
      .expect(401);

    expect(unknown.body.message).toBe('Invalid credentials');
    expect(incorrect.body.message).toBe('Invalid credentials');
  });

  it('rotates refresh token and rejects the replaced token', async () => {
    const { email } = await verifiedAccount();
    const login = await h.auth.login({ email, password });
    const refreshed = await h
      .post('refresh', { refreshToken: login.refreshToken })
      .expect(200);

    expect(refreshed.body.refreshToken).not.toBe(login.refreshToken);
    await h.post('refresh', { refreshToken: login.refreshToken }).expect(401);
    await h
      .post('refresh', { refreshToken: refreshed.body.refreshToken })
      .expect(200);
  });

  it('logs out by clearing the matching refresh token', async () => {
    const { email } = await verifiedAccount();
    const login = await h.auth.login({ email, password });

    await h.post('logout', { refreshToken: login.refreshToken }).expect(204);

    expect((await h.prisma.user.findFirstOrThrow()).refreshToken).toBeNull();
    await h.post('refresh', { refreshToken: login.refreshToken }).expect(401);
  });

  it('is idempotent for invalid, replaced and already revoked tokens', async () => {
    const { email } = await verifiedAccount();
    const first = await h.auth.login({ email, password });
    const current = await h.auth.login({ email, password });

    await h.post('logout', { refreshToken: 'not-a-jwt' }).expect(204);
    await h.post('logout', { refreshToken: first.refreshToken }).expect(204);
    expect((await h.prisma.user.findFirstOrThrow()).refreshToken).toBe(
      current.refreshToken,
    );
    await h.post('logout', { refreshToken: current.refreshToken }).expect(204);
    await h.post('logout', { refreshToken: current.refreshToken }).expect(204);
  });

  it('allows a suspended account to revoke its current session', async () => {
    const { email, userId } = await verifiedAccount();
    const login = await h.auth.login({ email, password });
    await h.prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' },
    });

    await h.post('logout', { refreshToken: login.refreshToken }).expect(204);

    expect(
      (await h.prisma.user.findUniqueOrThrow({ where: { id: userId } }))
        .refreshToken,
    ).toBeNull();
  });

  it('validates the logout request body', async () => {
    await h.post('logout', {}).expect(400);
    await h.post('logout', { refreshToken: 123 }).expect(400);
    await h
      .post('logout', { refreshToken: 'token', role: 'ADMIN' })
      .expect(400);
  });
});
