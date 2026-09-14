import * as bcrypt from 'bcrypt';
import { jest } from '@jest/globals';
import { AuthHarness, password } from './support/auth-harness';
import { createHash } from 'crypto';
const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

describe('AUTH-03 — Forgot and Reset Password', () => {
  let h: AuthHarness;
  const accepted = { code: 'PASSWORD_RESET_REQUEST_ACCEPTED' };

  beforeEach(async () => {
    h = new AuthHarness();
    await h.open();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await h.close();
  });

  async function verifiedAccount(email = 'traveler@example.com') {
    return h.register(email);
  }

  async function requestReset(email: string): Promise<string> {
    await h.post('forgot-password', { email }).expect(202, accepted);
    const callArg = h.resend.sendPasswordReset.mock.calls.at(-1)![1] as string;
    return new URL(callArg).searchParams.get('token') ?? '';
  }

  it('returns one generic response for missing accounts and cooldown', async () => {
    await h
      .post('forgot-password', { email: 'missing@example.com' })
      .expect(202, accepted);
    const { email } = await verifiedAccount();
    await requestReset(email);
    await h.post('forgot-password', { email }).expect(202, accepted);
    expect(h.resend.sendPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('creates only a hashed 30-minute token and sends after commit', async () => {
    const { email } = await verifiedAccount();
    h.resend.sendPasswordReset.mockImplementation(async (_, url: string) => {
      const token = new URL(url).searchParams.get('token') ?? '';
      expect(
        await h.prisma.passwordResetToken.findUnique({
          where: { tokenHash: hashToken(token) },
        }),
      ).not.toBeNull();
      return true;
    });
    const token = await requestReset(` ${email.toUpperCase()} `);
    const stored = await h.prisma.passwordResetToken.findFirstOrThrow();
    expect(stored.tokenHash).toBe(hashToken(token));
    expect(stored.tokenHash).not.toBe(token);
    expect(stored.expiresAt.getTime() - stored.createdAt.getTime()).toBe(
      1_800_000,
    );
  });

  it('keeps the token and cooldown when send fails', async () => {
    const { email } = await verifiedAccount();
    h.resend.sendPasswordReset.mockResolvedValueOnce(false);
    await h.post('forgot-password', { email }).expect(202, accepted);
    expect(await h.prisma.passwordResetToken.count()).toBe(1);
    await h.post('forgot-password', { email }).expect(202, accepted);
    expect(h.resend.sendPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('does not create a reset token for an ADMIN-only account', async () => {
    const { email, userId } = await verifiedAccount();
    await h.prisma.userRole.deleteMany({ where: { userId } });
    await h.prisma.userRole.create({ data: { userId, role: 'ADMIN' } });
    await h.post('forgot-password', { email }).expect(202, accepted);
    expect(await h.prisma.passwordResetToken.count()).toBe(0);
  });

  it('resets password once, revokes refresh and invalidates other reset tokens', async () => {
    const { email, userId } = await verifiedAccount();
    const login = await h.auth.login({ email, password });
    const first = await requestReset(email);
    await h.prisma.user.update({
      where: { id: userId },
      data: { passwordResetRequestedAt: new Date(Date.now() - 61_000) },
    });
    await requestReset(email);
    await h
      .post('reset-password', {
        token: first,
        newPassword: 'New password 123!',
      })
      .expect(200, { code: 'PASSWORD_RESET_SUCCESS' });
    const user = await h.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    expect(await bcrypt.compare('New password 123!', user.password)).toBe(true);
    expect(user.refreshToken).toBeNull();
    expect(
      await h.prisma.passwordResetToken.count({
        where: { invalidatedAt: { not: null } },
      }),
    ).toBe(1);
    await h.post('refresh', { refreshToken: login.refreshToken }).expect(401);
    await h.post('login', { email, password }).expect(401);
    await h.post('login', { email, password: 'New password 123!' }).expect(200);
    await h
      .post('reset-password', {
        token: first,
        newPassword: 'Another password 123!',
      })
      .expect(400);
  });

  it.each(['wrong', 'expired', 'used', 'invalidated'] as const)(
    'rejects %s token with the common error',
    async (kind) => {
      const { email } = await verifiedAccount();
      const token = await requestReset(email);
      if (kind !== 'wrong') {
        await h.prisma.passwordResetToken.update({
          where: { tokenHash: hashToken(token) },
          data:
            kind === 'expired'
              ? { expiresAt: new Date(Date.now() - 1000) }
              : kind === 'used'
                ? { usedAt: new Date() }
                : { invalidatedAt: new Date() },
        });
      }
      const response = await h
        .post('reset-password', {
          token: kind === 'wrong' ? 'f'.repeat(64) : token,
          newPassword: 'New password 123!',
        })
        .expect(400);
      expect(response.body.code).toBe('INVALID_PASSWORD_RESET_TOKEN');
    },
  );

  it('allows only one concurrent reset with the same token', async () => {
    const { email } = await verifiedAccount();
    const token = await requestReset(email);
    const results = await Promise.all([
      h.post('reset-password', { token, newPassword: 'New password 123!' }),
      h.post('reset-password', { token, newPassword: 'Other password 123!' }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
  });

  it('validates input and enforces endpoint rate limits', async () => {
    await h.post('forgot-password', { email: 'invalid' }).expect(400);
    await h
      .post('reset-password', { token: 'short', newPassword: 'short' })
      .expect(400);
    for (let i = 0; i < 4; i++)
      await h
        .post('forgot-password', { email: `missing${i}@example.com` })
        .expect(202);
    await h
      .post('forgot-password', { email: 'blocked@example.com' })
      .expect(429);
  });
});
