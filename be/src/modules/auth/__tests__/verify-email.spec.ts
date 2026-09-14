import { AuthHarness, hashToken } from './support/auth-harness';

describe('Group 2 — Verify Email', () => {
  let h: AuthHarness;
  beforeEach(async () => {
    h = new AuthHarness();
    await h.open();
  });
  afterEach(async () => {
    await h.close();
  });

  it('sets emailVerifiedAt, consumes token, invalidates others, preserves status and roles', async () => {
    const { userId, token, email } = await h.register();
    await h.allowResend(userId);
    await h.auth.resendVerification(email);
    await h.prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' },
    });
    await h
      .post('verify-email', { token })
      .expect(200, { code: 'EMAIL_VERIFIED' });
    const user = await h.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: true, verificationTokens: true },
    });
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(user.status).toBe('SUSPENDED');
    expect(user.roles.map((r) => r.role)).toEqual(['TRAVELER']);
    expect(
      user.verificationTokens.find((t) => t.tokenHash === hashToken(token))
        ?.usedAt,
    ).toBeInstanceOf(Date);
    expect(
      user.verificationTokens.find((t) => t.tokenHash !== hashToken(token))
        ?.invalidatedAt,
    ).toBeInstanceOf(Date);
    expect(user.refreshToken).toBeNull();
  });
  it.each(['wrong', 'expired', 'used', 'invalidated'] as const)(
    'rejects %s token with common error',
    async (kind) => {
      const { token } = await h.register();
      if (kind !== 'wrong')
        await h.prisma.verificationToken.update({
          where: { tokenHash: hashToken(token) },
          data:
            kind === 'expired'
              ? { expiresAt: new Date(Date.now() - 1000) }
              : kind === 'used'
                ? { usedAt: new Date() }
                : { invalidatedAt: new Date() },
        });
      const result = await h
        .post('verify-email', {
          token: kind === 'wrong' ? 'f'.repeat(64) : token,
        })
        .expect(400);
      expect(result.body.code).toBe('INVALID_VERIFICATION_TOKEN');
      expect(
        (await h.prisma.user.findFirstOrThrow()).emailVerifiedAt,
      ).toBeNull();
    },
  );
  it('rejects malformed or missing token at DTO boundary', async () => {
    await h.post('verify-email', { token: 'short' }).expect(400);
    await h.post('verify-email', {}).expect(400);
  });
  it('consumes token once under concurrent verification and rejects replay', async () => {
    const { token } = await h.register();
    const results = await Promise.all([
      h.post('verify-email', { token }),
      h.post('verify-email', { token }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    await h.post('verify-email', { token }).expect(400);
  });
  it('only one of two different valid tokens verifies the same user concurrently', async () => {
    const { token, userId, email } = await h.register();
    await h.allowResend(userId);
    await h.auth.resendVerification(email);
    const second = h.mail.sendVerification.mock.calls.at(-1)![1];
    const results = await Promise.allSettled([
      h.auth.verifyEmail(token),
      h.auth.verifyEmail(second),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      await h.prisma.verificationToken.count({
        where: { usedAt: { not: null } },
      }),
    ).toBe(1);
  });
  it.each(['User', 'VerificationToken'] as const)(
    'rolls back token/user changes on %s update failure',
    async (table) => {
      const { token } = await h.register();
      const cleanup = await h.injectFailure(table, 'UPDATE');
      try {
        await expect(h.auth.verifyEmail(token)).rejects.toThrow();
        expect(
          (await h.prisma.user.findFirstOrThrow()).emailVerifiedAt,
        ).toBeNull();
        expect(
          (await h.prisma.verificationToken.findFirstOrThrow()).usedAt,
        ).toBeNull();
      } finally {
        await cleanup();
      }
      await expect(h.auth.verifyEmail(token)).resolves.toEqual({
        code: 'EMAIL_VERIFIED',
      });
    },
  );
  it('limits verification to ten requests per minute', async () => {
    for (let i = 0; i < 10; i++)
      await h.post('verify-email', { token: 'f'.repeat(64) }).expect(400);
    await h.post('verify-email', { token: 'f'.repeat(64) }).expect(429);
  });
});
