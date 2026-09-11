import {
  AuthHarness,
  assertTestDatabase,
  password,
} from './support/auth-harness';
import { Client } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { MailService } from '../services/mail.service';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer';
import { jest } from '@jest/globals';

describe('Group 4 — Integration', () => {
  describe('Current application and authentication', () => {
    let h: AuthHarness;
    beforeEach(async () => {
      h = new AuthHarness();
      await h.open();
    });
    afterEach(async () => {
      jest.restoreAllMocks();
      await h.close();
    });

    it('wires real AppModule, validates login/refresh DTOs and does not consume token via GET', async () => {
      await h.post('login', {}).expect(400);
      await h.post('refresh', {}).expect(400);
      await h
        .post('refresh', { refreshToken: 'x', roles: ['ADMIN'] })
        .expect(400);
      await h
        .post('register', {
          name: 'Traveler',
          email: 'test@example.com',
          password,
        })
        .expect(201);
      expect(h.mail.sendVerification).toHaveBeenCalledTimes(1);
      expect(
        (await h.prisma.user.findFirstOrThrow()).emailVerifiedAt,
      ).toBeNull();
    });
    it('blocks login and refresh before verification and permits them after verification', async () => {
      const { token, email, userId } = await h.register();
      const oldRefresh = await h.jwt.signAsync(
        { sub: userId, roles: ['ADMIN'] },
        { secret: h.config.getOrThrow('JWT_REFRESH_SECRET'), expiresIn: '7d' },
      );
      await h.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: oldRefresh },
      });
      await h.post('login', { email, password }).expect(403);
      await h.post('refresh', { refreshToken: oldRefresh }).expect(403);
      await h.post('verify-email', { token }).expect(200);
      const login = await h.post('login', { email, password }).expect(200);
      expect(h.jwt.decode(login.body.accessToken).roles).toEqual(['TRAVELER']);
      expect(h.jwt.decode(login.body.accessToken).role).toBeUndefined();
      await h
        .post('refresh', { refreshToken: login.body.refreshToken })
        .expect(200);
    });
    it.each(['SUSPENDED', 'DISABLED'] as const)(
      'blocks login/refresh when current status is %s',
      async (status) => {
        const { token, email, userId } = await h.register();
        await h.auth.verifyEmail(token);
        const login = await h.auth.login({ email, password });
        await h.prisma.user.update({ where: { id: userId }, data: { status } });
        await h.post('login', { email, password }).expect(403);
        await h
          .post('refresh', { refreshToken: login.refreshToken })
          .expect(403);
      },
    );
    it('refresh uses current roles and rejects accounts with no roles', async () => {
      const { token, email, userId } = await h.register();
      await h.auth.verifyEmail(token);
      const login = await h.auth.login({ email, password });
      await h.prisma.userRole.create({ data: { userId, role: 'PROVIDER' } });
      const refresh = await h.auth.refresh(login.refreshToken);
      expect(h.jwt.decode(refresh.accessToken).roles.sort()).toEqual([
        'PROVIDER',
        'TRAVELER',
      ]);
      await h.prisma.userRole.deleteMany({ where: { userId } });
      await h
        .post('refresh', { refreshToken: refresh.refreshToken })
        .expect(403);
      await h.post('login', { email, password }).expect(403);
    });
    it('rejects wrong credentials, invalid signature, expired, replaced and unknown-user refresh tokens', async () => {
      const { token, email, userId } = await h.register();
      await h.auth.verifyEmail(token);
      await h.post('login', { email, password: 'wrong-password' }).expect(401);
      const login = await h.auth.login({ email, password });
      const replacement = await h.auth.login({ email, password });
      await h.post('refresh', { refreshToken: login.refreshToken }).expect(401);
      const secret = h.config.getOrThrow<string>('JWT_REFRESH_SECRET');
      const expired = await h.jwt.signAsync(
        { sub: userId },
        { secret, expiresIn: -1 },
      );
      const wrongSignature = await h.jwt.signAsync(
        { sub: userId },
        { secret: 'wrong-secret' },
      );
      const missing = await h.jwt.signAsync({ sub: 'missing' }, { secret });
      for (const invalid of [expired, wrongSignature, missing, 'not-a-jwt']) {
        await h.post('refresh', { refreshToken: invalid }).expect(401);
      }
      await h
        .post('refresh', { refreshToken: replacement.refreshToken })
        .expect(200);
    });
    it('does not swallow database errors as invalid refresh tokens', async () => {
      const { token, email } = await h.register();
      await h.auth.verifyEmail(token);
      const login = await h.auth.login({ email, password });
      jest
        .spyOn(h.prisma.user, 'findUnique')
        .mockRejectedValueOnce(new Error('database unavailable'));
      await expect(h.auth.refresh(login.refreshToken)).rejects.toThrow(
        'database unavailable',
      );
    });
  });

  describe('SMTP adapter contract (transport mocked, no external email)', () => {
    afterEach(() => jest.restoreAllMocks());
    function config(): ConfigService {
      return new ConfigService({
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_USER: 'test-user',
        SMTP_PASSWORD: 'test-password',
        SMTP_FROM: 'FlexTrip <sender@example.com>',
        EMAIL_VERIFICATION_URL:
          'https://frontend.example.com/verify-email?source=registration',
      });
    }
    it('uses TLS, sends only frontend verification link and closes transport', async () => {
      const sendMail = jest
        .fn<() => Promise<{ accepted: string[]; rejected: string[] }>>()
        .mockResolvedValue({ accepted: ['test@example.com'], rejected: [] });
      const close = jest.fn();
      const factory = jest.fn(
        () => ({ sendMail, close }) as unknown as Transporter,
      );
      await new MailService(config(), factory).sendVerification(
        'test@example.com',
        'a'.repeat(64),
      );
      expect(factory).toHaveBeenCalledWith(
        expect.objectContaining({ port: 587, secure: false, requireTLS: true }),
      );
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining(
            'https://frontend.example.com/verify-email?source=registration&token=' +
              'a'.repeat(64),
          ),
        }),
      );
      expect(close).toHaveBeenCalled();
    });
    it('propagates SMTP failure and closes transport', async () => {
      const close = jest.fn();
      const factory = jest.fn(
        () =>
          ({
            sendMail: jest
              .fn<() => Promise<never>>()
              .mockRejectedValue(new Error('SMTP rejected')),
            close,
          }) as unknown as Transporter,
      );
      await expect(
        new MailService(config(), factory).sendVerification(
          'test@example.com',
          'a'.repeat(64),
        ),
      ).rejects.toThrow('SMTP rejected');
      expect(close).toHaveBeenCalled();
    });
    it('treats recipient rejection and missing configuration as failures', async () => {
      const factory = jest.fn(
        () =>
          ({
            sendMail: jest
              .fn<() => Promise<{ accepted: string[]; rejected: string[] }>>()
              .mockResolvedValue({
                accepted: [],
                rejected: ['test@example.com'],
              }),
            close: jest.fn(),
          }) as unknown as Transporter,
      );
      await expect(
        new MailService(config(), factory).sendVerification(
          'test@example.com',
          'a'.repeat(64),
        ),
      ).rejects.toThrow();
      await expect(
        new MailService(new ConfigService({}), factory).sendVerification(
          'test@example.com',
          'a'.repeat(64),
        ),
      ).rejects.toThrow();
    });
  });

  describe('Data-preserving migration on an isolated database', () => {
    let client: Client;
    const root = join(process.cwd(), 'prisma', 'migrations');
    const initial = readFileSync(
      join(root, '20260907073313_init', 'migration.sql'),
      'utf8',
    );
    const migrationDir = readdirSync(root).find((name) =>
      name.endsWith('_auth01_registration'),
    );
    if (!migrationDir) throw new Error('AUTH-01 migration is missing');
    const migration = readFileSync(
      join(root, migrationDir, 'migration.sql'),
      'utf8',
    );
    beforeEach(async () => {
      const url = new URL(assertTestDatabase());
      url.pathname = '/flextrip_auth01_migration_test';
      if (url.pathname !== '/flextrip_auth01_migration_test')
        throw new Error('Unsafe migration test target');
      client = new Client({ connectionString: url.toString() });
      await client.connect();
      await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      await client.query(initial);
    });
    afterEach(async () => {
      await client?.query('ROLLBACK');
      await client?.end();
    });
    async function seed(
      id: string,
      role: string,
      verified: boolean,
      email: string,
    ): Promise<void> {
      await client.query(
        'INSERT INTO "User" ("id","email","password","name","role","isVerified","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)',
        [id, email, 'existing-password-hash', 'Existing user', role, verified],
      );
    }
    it('preserves accounts, relationships, passwords, roles and historical verification', async () => {
      await seed('traveler', 'TRAVELER', false, ' Traveler@Example.com ');
      await seed('provider', 'PROVIDER', true, 'provider@example.com');
      await seed('admin', 'ADMIN', true, 'admin@example.com');
      await client.query(
        'INSERT INTO "Listing" ("id","title","description","price","location","imageUrls","category","amenities","providerId","updatedAt") VALUES ($1,$2,$3,100,$4,ARRAY[]::text[],$5,ARRAY[]::text[],$6,CURRENT_TIMESTAMP)',
        ['listing', 'Title', 'Description', 'City', 'Room', 'provider'],
      );
      await client.query(migration);
      const users = (await client.query('SELECT * FROM "User" ORDER BY "id"'))
        .rows;
      expect(users).toHaveLength(3);
      for (const user of users) {
        expect(user.status).toBe('ACTIVE');
        expect(user.password).toBe('existing-password-hash');
        expect(user).not.toHaveProperty('role');
        expect(user).not.toHaveProperty('isVerified');
        if (user.id === 'traveler') {
          expect(user.emailVerifiedAt).toBeNull();
          expect(user.email).toBe('traveler@example.com');
        } else {
          expect(user.emailVerifiedAt).toBeInstanceOf(Date);
        }
      }
      const verificationTimes = await client.query(
        `SELECT bool_and(
          abs(extract(epoch FROM (CURRENT_TIMESTAMP::timestamp - "emailVerifiedAt"))) < 60
        ) AS recent
        FROM "User"
        WHERE id IN ('provider', 'admin')`,
      );
      expect(verificationTimes.rows[0].recent).toBe(true);
      const roles = (
        await client.query(
          'SELECT "userId", "role" FROM "UserRole" ORDER BY "userId", "role"::text',
        )
      ).rows;
      expect(roles).toEqual([
        { userId: 'admin', role: 'ADMIN' },
        { userId: 'provider', role: 'PROVIDER' },
        { userId: 'provider', role: 'TRAVELER' },
        { userId: 'traveler', role: 'TRAVELER' },
      ]);
      expect(
        (
          await client.query(
            'SELECT "providerId" FROM "Listing" WHERE id = $1',
            ['listing'],
          )
        ).rows[0].providerId,
      ).toBe('provider');
    });
    it('aborts atomically on normalized email collisions without merging or deleting users', async () => {
      await seed('a', 'TRAVELER', false, ' Same@Example.com ');
      await seed('b', 'PROVIDER', true, 'same@example.com');
      await expect(client.query(migration)).rejects.toThrow(
        'AUTH01_EMAIL_NORMALIZATION_COLLISION',
      );
      await client.query('ROLLBACK');
      expect(
        (await client.query('SELECT "role", "isVerified" FROM "User"')).rows,
      ).toHaveLength(2);
      expect(
        (
          await client.query(
            'SELECT to_regclass(\'public."UserRole"\') AS table_name',
          )
        ).rows[0].table_name,
      ).toBeNull();
    });
  });
});
