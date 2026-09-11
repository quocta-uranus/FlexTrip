import { AuthHarness, hashToken } from './support/auth-harness';
import { jest } from '@jest/globals';

describe('Group 3 — Resend Verification', () => {
  let h: AuthHarness;
  beforeEach(async () => {
    h = new AuthHarness();
    await h.open();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await h.close();
  });
  const accepted = { code: 'VERIFICATION_EMAIL_REQUEST_ACCEPTED' };

  it('returns identical 202 for missing, verified and cooldown accounts', async () => {
    await h
      .post('resend-verification', { email: 'missing@example.com' })
      .expect(202, accepted);
    const { email, token } = await h.register();
    await h.post('resend-verification', { email }).expect(202, accepted);
    await h.auth.verifyEmail(token);
    await h.post('resend-verification', { email }).expect(202, accepted);
    expect(h.mail.sendVerification).toHaveBeenCalledTimes(1);
  });
  it('normalizes email and sends a new committed token without extending or invalidating the old one', async () => {
    const { email, token, userId } = await h.register();
    const old = await h.prisma.verificationToken.findFirstOrThrow();
    await h.allowResend(userId);
    h.mail.sendVerification.mockImplementation(async (_, raw) => {
      expect(
        await h.prisma.verificationToken.findUnique({
          where: { tokenHash: hashToken(raw) },
        }),
      ).not.toBeNull();
    });
    await h
      .post('resend-verification', { email: ' ' + email.toUpperCase() + ' ' })
      .expect(202, accepted);
    expect(await h.prisma.verificationToken.count()).toBe(2);
    expect(
      await h.prisma.verificationToken.findUnique({ where: { id: old.id } }),
    ).toEqual(old);
    expect(h.mail.sendVerification.mock.calls.at(-1)![1]).not.toBe(token);
  });
  it('concurrent resends create only one new token and one send', async () => {
    const { email, userId } = await h.register();
    await h.allowResend(userId);
    const responses = await Promise.all([
      h.auth.resendVerification(email),
      h.auth.resendVerification(email),
    ]);
    expect(responses).toEqual([accepted, accepted]);
    expect(await h.prisma.verificationToken.count()).toBe(2);
    expect(h.mail.sendVerification).toHaveBeenCalledTimes(2);
  });
  it('SMTP failure retains token, enforces cooldown and permits retry after cooldown', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { email, userId } = await h.register();
    await h.allowResend(userId);
    h.mail.sendVerification.mockRejectedValueOnce(
      new Error('SMTP unavailable'),
    );
    await h.post('resend-verification', { email }).expect(202, accepted);
    expect(await h.prisma.verificationToken.count()).toBe(2);
    await h.auth.resendVerification(email);
    expect(await h.prisma.verificationToken.count()).toBe(2);
    expect(h.mail.sendVerification).toHaveBeenCalledTimes(2);
    await h.allowResend(userId);
    await h.auth.resendVerification(email);
    expect(h.mail.sendVerification).toHaveBeenCalledTimes(3);
    expect(await h.prisma.verificationToken.count()).toBe(3);
    expect((await h.prisma.user.findFirstOrThrow()).emailVerifiedAt).toBeNull();
  });
  it('recovers from registration SMTP failure by resend and verification', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    h.mail.sendVerification.mockRejectedValueOnce(
      new Error('SMTP unavailable'),
    );
    const { email, userId } = await h.register();
    await h.allowResend(userId);
    await h.auth.resendVerification(email);
    await h.auth.verifyEmail(h.mail.sendVerification.mock.calls.at(-1)![1]);
    expect(
      (await h.prisma.user.findFirstOrThrow()).emailVerifiedAt,
    ).toBeInstanceOf(Date);
  });
  it('resend racing verification cannot leave an active token after verification', async () => {
    const { email, userId, token } = await h.register();
    await h.allowResend(userId);
    await Promise.all([
      h.auth.resendVerification(email),
      h.auth.verifyEmail(token),
    ]);
    expect(
      await h.prisma.verificationToken.count({
        where: { usedAt: null, invalidatedAt: null },
      }),
    ).toBe(0);
    expect(
      (await h.prisma.user.findFirstOrThrow()).emailVerifiedAt,
    ).toBeInstanceOf(Date);
  });
  it('rolls back cooldown on token creation failure without sending SMTP', async () => {
    const { email, userId } = await h.register();
    await h.allowResend(userId);
    const before = await h.prisma.user.findFirstOrThrow();
    const cleanup = await h.injectFailure('VerificationToken', 'INSERT');
    try {
      await expect(h.auth.resendVerification(email)).rejects.toThrow();
      expect(
        (await h.prisma.user.findFirstOrThrow()).verificationRequestedAt,
      ).toEqual(before.verificationRequestedAt);
      expect(h.mail.sendVerification).toHaveBeenCalledTimes(1);
    } finally {
      await cleanup();
    }
  });
  it('validates input and limits resend to five requests per minute', async () => {
    await h.post('resend-verification', { email: 'invalid' }).expect(400);
    for (let i = 0; i < 4; i++)
      await h
        .post('resend-verification', { email: 'missing@example.com' })
        .expect(202);
    await h
      .post('resend-verification', { email: 'missing@example.com' })
      .expect(429);
  });
});
