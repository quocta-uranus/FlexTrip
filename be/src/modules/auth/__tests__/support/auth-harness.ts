import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AppModule } from '../../../../app.module';
import { AuthService } from '../../services/auth.service';
import { MailService } from '../../services/mail.service';
import { createHash } from 'crypto';
import { Client } from 'pg';
import request from 'supertest';
import { jest } from '@jest/globals';

export const password = 'Valid password 123!';
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export function assertTestDatabase(): string {
  const connection = process.env.TEST_DATABASE_URL;
  if (!connection)
    throw new Error(
      'TEST_DATABASE_URL is required: use a dedicated flextrip_auth01_test database',
    );
  const url = new URL(connection);
  if (
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.pathname !== '/flextrip_auth01_test'
  ) {
    throw new Error(
      'Refusing tests outside local flextrip_auth01_test database',
    );
  }
  return connection;
}

export class AuthHarness {
  app!: INestApplication;
  prisma!: PrismaService;
  auth!: AuthService;
  jwt!: JwtService;
  config!: ConfigService;
  mail = {
    sendVerification:
      jest.fn<(email: string, token: string) => Promise<void>>(),
    sendPasswordReset:
      jest.fn<(email: string, token: string) => Promise<void>>(),
  };

  async open(): Promise<void> {
    process.env.DATABASE_URL = assertTestDatabase();
    process.env.JWT_ACCESS_SECRET = 'auth01-test-access-secret-32-characters';
    process.env.JWT_REFRESH_SECRET = 'auth01-test-refresh-secret-32-characters';
    process.env.JWT_ACCESS_EXPIRES = '15m';
    process.env.JWT_REFRESH_EXPIRES = '7d';
    process.env.TWO_FACTOR_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
      'base64',
    );
    process.env.TWO_FACTOR_CHALLENGE_SECRET =
      'auth04-test-challenge-secret-32-characters';
    process.env.KYC_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
    process.env.KYC_FINGERPRINT_SECRET =
      'auth05-test-fingerprint-secret-32-characters';
    this.mail.sendVerification.mockResolvedValue(undefined);
    this.mail.sendPasswordReset.mockResolvedValue(undefined);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue(this.mail)
      .compile();
    this.app = module.createNestApplication();
    this.app.setGlobalPrefix('api/v1');
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await this.app.init();
    this.prisma = module.get(PrismaService);
    this.auth = module.get(AuthService);
    this.jwt = module.get(JwtService);
    this.config = module.get(ConfigService);
    await this.prisma.kycApplication.deleteMany();
    await this.prisma.passwordResetToken.deleteMany();
    await this.prisma.verificationToken.deleteMany();
    await this.prisma.userRole.deleteMany();
    await this.prisma.user.deleteMany();
  }

  async close(): Promise<void> {
    await this.app?.close();
  }

  post(path: string, body: object): request.Test {
    return request(this.app.getHttpServer())
      .post('/api/v1/auth/' + path)
      .send(body);
  }

  async register(
    email = 'traveler@example.com',
  ): Promise<{ userId: string; token: string; email: string }> {
    await this.auth.register({ email, name: 'Traveler', password });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { email } });
    const token = this.mail.sendVerification.mock.calls.at(-1)![1];
    return { userId: user.id, token, email };
  }

  async allowResend(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationRequestedAt: new Date(Date.now() - 61_000) },
    });
  }

  async injectFailure(
    table: 'User' | 'UserRole' | 'VerificationToken',
    operation: 'INSERT' | 'UPDATE',
  ): Promise<() => Promise<void>> {
    // Only fixed table names are accepted, and the connection is guarded above.
    const client = new Client({ connectionString: assertTestDatabase() });
    await client.connect();
    await client.query(
      `CREATE FUNCTION auth01_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$`,
    );
    await client.query(
      `CREATE TRIGGER auth01_fail BEFORE ${operation} ON "${table}" FOR EACH ROW EXECUTE FUNCTION auth01_fail()`,
    );
    return async () => {
      await client.query(`DROP TRIGGER auth01_fail ON "${table}"`);
      await client.query('DROP FUNCTION auth01_fail()');
      await client.end();
    };
  }
}
