import * as speakeasy from 'speakeasy';
import { AuthHarness, password } from './support/auth-harness';

describe('AUTH-04 — Two-Factor Authentication', () => {
  let h: AuthHarness;
  beforeEach(async () => {
    h = new AuthHarness();
    await h.open();
  });
  afterEach(async () => h.close());

  async function account() {
    const registered = await h.register();
    const login = await h.auth.login({ email: registered.email, password });
    if (!('accessToken' in login)) throw new Error('Unexpected challenge');
    return { ...registered, accessToken: login.accessToken };
  }

  const code = (secret: string) =>
    speakeasy.totp({ secret, encoding: 'base32' });

  async function enable() {
    const current = await account();
    const auth = { Authorization: `Bearer ${current.accessToken}` };
    const setup = await h.post('2fa/setup', {}).set(auth).expect(201);
    const enabled = await h
      .post('2fa/enable', { code: code(setup.body.secret) })
      .set(auth)
      .expect(201);
    return {
      ...current,
      setup: setup.body,
      recoveryCodes: enabled.body.recoveryCodes,
    };
  }

  it('stores an encrypted secret and hashed recovery codes', async () => {
    const result = await enable();
    const user = await h.prisma.user.findUniqueOrThrow({
      where: { id: result.userId },
    });
    expect(user.twoFactorEnabled).toBe(true);
    expect(user.twoFactorSecret).not.toContain(result.setup.secret);
    expect(user.twoFactorRecoveryCodes).toHaveLength(8);
    expect(user.twoFactorRecoveryCodes).not.toContain(result.recoveryCodes[0]);
    expect(result.setup.otpauthUrl).toContain('otpauth://totp/');
  });

  it('requires and completes a TOTP challenge after password login', async () => {
    const result = await enable();
    const login = await h
      .post('login', { email: result.email, password })
      .expect(200);
    expect(login.body).toMatchObject({
      requiresTwoFactor: true,
      challengeToken: expect.any(String),
    });
    expect(login.body.accessToken).toBeUndefined();
    await h
      .post('2fa/verify', {
        challengeToken: login.body.challengeToken,
        code: code(result.setup.secret),
      })
      .expect(200);
  });

  it('consumes a recovery code only once', async () => {
    const result = await enable();
    const login = await h
      .post('login', { email: result.email, password })
      .expect(200);
    const body = {
      challengeToken: login.body.challengeToken,
      code: result.recoveryCodes[0],
    };
    await h.post('2fa/verify', body).expect(200);
    await h.post('2fa/verify', body).expect(401);
  });

  it('disables 2FA and revokes the refresh token', async () => {
    const result = await enable();
    const login = await h
      .post('login', { email: result.email, password })
      .expect(200);
    const verified = await h
      .post('2fa/verify', {
        challengeToken: login.body.challengeToken,
        code: code(result.setup.secret),
      })
      .expect(200);
    await h
      .post('2fa/disable', { code: code(result.setup.secret) })
      .set('Authorization', `Bearer ${verified.body.accessToken}`)
      .expect(201, { code: 'TWO_FACTOR_DISABLED' });
    expect(
      (await h.prisma.user.findUniqueOrThrow({ where: { id: result.userId } }))
        .refreshToken,
    ).toBeNull();
  });

  it('rejects missing authorization, invalid codes and invalid challenges', async () => {
    await h.post('2fa/setup', {}).expect(401);
    const current = await account();
    await h
      .post('2fa/enable', { code: '000000' })
      .set('Authorization', `Bearer ${current.accessToken}`)
      .expect(400);
    await h
      .post('2fa/verify', { challengeToken: 'invalid', code: '000000' })
      .expect(401);
  });

  it('does not allow an ADMIN-only account to set up 2FA', async () => {
    const current = await account();
    await h.prisma.userRole.deleteMany({ where: { userId: current.userId } });
    await h.prisma.userRole.create({
      data: { userId: current.userId, role: 'ADMIN' },
    });
    await h
      .post('2fa/setup', {})
      .set('Authorization', `Bearer ${current.accessToken}`)
      .expect(403);
  });
});
