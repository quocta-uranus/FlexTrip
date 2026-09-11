import { AuthHarness, hashToken, password } from './support/auth-harness';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { jest } from '@jest/globals';

describe('Group 1 — Register', () => {
  let h: AuthHarness;
  beforeEach(async () => {
    h = new AuthHarness();
    await h.open();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await h.close();
  });

  it('normalizes email/name, hashes untrimmed password, creates only Traveler and a hashed 30-minute token', async () => {
    const response = await h
      .post('register', {
        email: '  Traveler@Example.com ',
        name: '  Traveler  ',
        password: ' password123 ',
      })
      .expect(201);
    expect(response.body).toMatchObject({
      code: 'REGISTRATION_PENDING_VERIFICATION',
      nextAction: 'VERIFY_EMAIL',
    });
    expect(Object.keys(response.body).sort()).toEqual([
      'code',
      'message',
      'nextAction',
    ]);
    const user = await h.prisma.user.findUniqueOrThrow({
      where: { email: 'traveler@example.com' },
      include: { roles: true, verificationTokens: true },
    });
    expect(user.name).toBe('Traveler');
    expect(user.emailVerifiedAt).toBeNull();
    expect(user.status).toBe('ACTIVE');
    expect(user.refreshToken).toBeNull();
    expect(user.roles.map((r) => r.role)).toEqual(['TRAVELER']);
    expect(user.password).not.toBe(' password123 ');
    expect(await bcrypt.compare(' password123 ', user.password)).toBe(true);
    expect(await bcrypt.compare('password123', user.password)).toBe(false);
    const raw = h.mail.sendVerification.mock.calls[0][1];
    expect(user.verificationTokens[0].tokenHash).toBe(hashToken(raw));
    expect(user.verificationTokens[0].tokenHash).not.toBe(raw);
    expect(
      user.verificationTokens[0].expiresAt.getTime() -
        user.verificationTokens[0].createdAt.getTime(),
    ).toBe(1_800_000);
  });

  it.each([
    'role',
    'roles',
    'isVerified',
    'emailVerifiedAt',
    'status',
    'confirmPassword',
  ])('rejects forbidden field %s', async (field) => {
    await h
      .post('register', {
        email: 'test@example.com',
        name: 'Test',
        password,
        [field]: 'ADMIN',
      })
      .expect(400);
    expect(await h.prisma.user.count()).toBe(0);
    expect(h.mail.sendVerification).not.toHaveBeenCalled();
  });

  it.each([
    { email: 'invalid' },
    { email: 'a'.repeat(245) + '@example.com' },
    { name: ' ' },
    { name: 'x'.repeat(101) },
    { password: 'short' },
    { password: 'a'.repeat(73) },
    { password: 'ậ'.repeat(25) },
    { password: 12345678 },
    { email: null },
    { name: null },
  ])('rejects invalid input %j', async (fields) => {
    await h
      .post('register', {
        email: 'test@example.com',
        name: 'Test',
        password,
        ...fields,
      })
      .expect(400);
    expect(await h.prisma.user.count()).toBe(0);
  });

  it('rejects missing fields', async () => {
    await h.post('register', {}).expect(400);
  });
  it('accepts exactly 72 UTF-8 password bytes', async () => {
    await h
      .post('register', {
        email: 'test@example.com',
        name: 'Test',
        password: 'ậ'.repeat(24),
      })
      .expect(201);
  });
  it('returns 409 for email differing only by case and whitespace', async () => {
    await h.register();
    await h
      .post('register', {
        email: ' Traveler@Example.com ',
        name: 'Other',
        password,
      })
      .expect(409);
  });
  it('concurrent registration commits exactly one complete account', async () => {
    const results = await Promise.all(
      [1, 2].map(() =>
        h.post('register', {
          email: 'same@example.com',
          name: 'Test',
          password,
        }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await h.prisma.user.count()).toBe(1);
    expect(await h.prisma.userRole.count()).toBe(1);
    expect(await h.prisma.verificationToken.count()).toBe(1);
    expect(h.mail.sendVerification).toHaveBeenCalledTimes(1);
  });
  it.each(['User', 'UserRole', 'VerificationToken'] as const)(
    'rolls back every write when %s insertion fails',
    async (table) => {
      const cleanup = await h.injectFailure(table, 'INSERT');
      try {
        await expect(
          h.auth.register({
            email: 'test@example.com',
            name: 'Test',
            password,
          }),
        ).rejects.toThrow();
        expect(await h.prisma.user.count()).toBe(0);
        expect(await h.prisma.userRole.count()).toBe(0);
        expect(await h.prisma.verificationToken.count()).toBe(0);
        expect(h.mail.sendVerification).not.toHaveBeenCalled();
      } finally {
        await cleanup();
      }
    },
  );
  it('does not misclassify non-email unique failures as duplicate email', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('collision', {
      code: 'P2002',
      clientVersion: '7',
      meta: { target: ['tokenHash'] },
    });
    jest.spyOn(h.prisma, '$transaction').mockRejectedValueOnce(error);
    await expect(
      h.auth.register({ email: 'test@example.com', name: 'Test', password }),
    ).rejects.toBe(error);
  });
  it('SMTP sees all three committed records and failure preserves them with explicit 201 outcome', async () => {
    const log = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    h.mail.sendVerification.mockImplementation(async (email, token) => {
      const user = await h.prisma.user.findUniqueOrThrow({
        where: { email },
        include: { roles: true, verificationTokens: true },
      });
      expect(user.roles).toHaveLength(1);
      expect(user.verificationTokens[0].tokenHash).toBe(hashToken(token));
      throw new Error('SMTP secret should not be logged');
    });
    const result = await h
      .post('register', { email: 'test@example.com', name: 'Test', password })
      .expect(201);
    expect(result.body).toMatchObject({
      code: 'REGISTRATION_CREATED_EMAIL_SEND_FAILED',
      nextAction: 'RESEND_VERIFICATION',
      retryAfterSeconds: 60,
    });
    expect(await h.prisma.user.count()).toBe(1);
    expect((await h.prisma.user.findFirstOrThrow()).emailVerifiedAt).toBeNull();
    expect(JSON.stringify(log.mock.calls)).not.toContain('SMTP secret');
    await h
      .post('register', { email: 'test@example.com', name: 'Test', password })
      .expect(409);
  });
  it('limits register to five requests per minute without trusting forwarded IP headers', async () => {
    for (let i = 0; i < 5; i++) await h.post('register', {}).expect(400);
    await h
      .post('register', {})
      .set('X-Forwarded-For', '192.0.2.1')
      .expect(429);
  });
});
