import {
  AuthHarness,
  assertTestDatabase,
  password,
} from './support/auth-harness';
import { Client } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
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

    it('wires real AppModule, validates login/refresh DTOs', async () => {
      await h.post('login', {}).expect(400);
      await h.post('refresh', {}).expect(400);
      await h
        .post('refresh', { refreshToken: 'x', roles: ['ADMIN'] })
        .expect(400);
      const result = await h
        .post('register', {
          name: 'Traveler',
          email: 'test@example.com',
          password,
        })
        .expect(201);
      expect(result.body.code).toBe('OTP_SENT');
      expect(
        (await h.prisma.user.findFirstOrThrow()).emailVerifiedAt,
      ).toBeNull();
    });

    it('blocks login before OTP verification and permits after', async () => {
      const email = 'traveler@example.com';
      await h.auth.register({ email, name: 'Traveler', password });
      await h.post('login', { email, password }).expect(403);
      await h.auth.verifyRegistrationOtp(email, '123456');
      const login = await h.post('login', { email, password }).expect(200);
      expect(h.jwt.decode(login.body.accessToken).roles).toEqual(['TRAVELER']);
    });

    it('verify-otp endpoint marks email as verified', async () => {
      const email = 'otp@example.com';
      await h.auth.register({ email, name: 'Traveler', password });
      await h.post('verify-otp', { email, code: '123456' }).expect(200);
      const user = await h.prisma.user.findUniqueOrThrow({ where: { email } });
      expect(user.emailVerifiedAt).not.toBeNull();
    });

    it.each(['SUSPENDED', 'DISABLED'] as const)(
      'blocks login/refresh when current status is %s',
      async (status) => {
        const { email, userId } = await h.register();
        const login = await h.auth.login({ email, password });
        await h.prisma.user.update({ where: { id: userId }, data: { status } });
        await h.post('login', { email, password }).expect(403);
        await h
          .post('refresh', { refreshToken: (login as any).refreshToken })
          .expect(403);
      },
    );

    it('refresh uses current roles and rejects accounts with no roles', async () => {
      const { email, userId } = await h.register();
      const login = await h.auth.login({ email, password });
      await h.prisma.userRole.create({ data: { userId, role: 'PROVIDER' } });
      const refresh = await h.auth.refresh((login as any).refreshToken);
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

    it('supports independent sessions and rejects invalid or rotated refresh tokens', async () => {
      const { email, userId } = await h.register();
      await h.post('login', { email, password: 'wrong-password' }).expect(401);
      const login = await h.auth.login({ email, password });
      await h.auth.login({ email, password });
      await h.post('refresh', { refreshToken: (login as any).refreshToken }).expect(200);
      await h.post('refresh', { refreshToken: (login as any).refreshToken }).expect(401);
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
    });

    it('does not swallow database errors as invalid refresh tokens', async () => {
      const { email } = await h.register();
      const login = await h.auth.login({ email, password });
      jest
        .spyOn(h.prisma.user, 'findUnique')
        .mockRejectedValueOnce(new Error('database unavailable'));
      await expect(
        h.auth.refresh((login as any).refreshToken),
      ).rejects.toThrow('database unavailable');
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
