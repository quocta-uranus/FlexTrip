import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AppModule } from '../../../../app.module';
import { AuthService } from '../../services/auth.service';
import { OtpService } from '../../services/otp.service';
import { ResendService } from '../../services/resend.service';
import { REDIS_CLIENT } from '../../../../common/redis/redis.module';
import { Client } from 'pg';
import request from 'supertest';
import { jest } from '@jest/globals';
import { getQueueToken } from '@nestjs/bullmq';
import { REVIEW_MODERATION_QUEUE } from '../../../reviews/review-moderation.constants';
import {
  ReviewAiAnalyzerService,
  ReviewAnalysis,
} from '../../../reviews/review-ai-analyzer.service';
import { ReviewModerationProcessor } from '../../../reviews/review-moderation.processor';
import { BOOKING_QUEUE } from '../../../booking/booking.constants';
import { BookingProcessor } from '../../../booking/booking.processor';

export const password = 'Valid password 123!';

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

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  // Table names come from the catalog of the asserted test database, never from input.
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (!rows.length) return;
  const tables = rows.map(({ tablename }) => `"${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE`);
}

export class FakeRedis {
  private store = new Map<string, string>();
  async exists(key: string) {
    return this.store.has(key) ? 1 : 0;
  }
  async get(key: string) {
    return this.store.get(key) ?? null;
  }
  async set(key: string, value: string, ...args: unknown[]) {
    void args;
    this.store.set(key, value);
    return 'OK';
  }
  async del(key: string) {
    return this.store.delete(key) ? 1 : 0;
  }
  keys() {
    return [...this.store.keys()];
  }
  clear() {
    this.store.clear();
  }
  disconnect() {}
  quit() {
    return Promise.resolve('OK');
  }
}

export class AuthHarness {
  app!: INestApplication;
  prisma!: PrismaService;
  auth!: AuthService;
  jwt!: JwtService;
  config!: ConfigService;
  redis = new FakeRedis();
  reviewQueue = {
    add: jest.fn<
      (name: string, data: unknown, options: unknown) => Promise<{ id: string }>
    >(),
    getJobs: jest
      .fn<(...args: unknown[]) => Promise<never[]>>()
      .mockResolvedValue([]),
  };
  bookingQueue = {
    add: jest.fn(),
    remove: jest.fn(),
    getJob: jest.fn(),
  };
  reviewAnalyzer = {
    analyze:
      jest.fn<
        (input: {
          reviewId?: string;
          comment: string;
          rating: number;
        }) => Promise<ReviewAnalysis>
      >(),
  };

  resend = {
    sendOtp: jest.fn<(email: string, code: string) => Promise<boolean>>(),
    sendPasswordReset:
      jest.fn<(email: string, url: string) => Promise<boolean>>(),
    sendStaffInvite:
      jest.fn<(email: string, name: string, url: string) => Promise<boolean>>(),
    sendProviderApproved:
      jest.fn<(email: string, name: string, url: string) => Promise<boolean>>(),
  };

  otp = {
    generate: jest.fn<(ns: string, key: string) => Promise<string>>(),
    verify:
      jest.fn<(ns: string, key: string, code: string) => Promise<boolean>>(),
    canResend: jest.fn<(ns: string, key: string) => Promise<boolean>>(),
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
    process.env.RESEND_API_KEY = 'test_key';

    this.resend.sendOtp.mockResolvedValue(true);
    this.resend.sendPasswordReset.mockResolvedValue(true);
    this.resend.sendStaffInvite.mockResolvedValue(true);
    this.resend.sendProviderApproved.mockResolvedValue(true);
    this.otp.generate.mockResolvedValue('123456');
    this.otp.verify.mockResolvedValue(true);
    this.otp.canResend.mockResolvedValue(true);
    this.reviewQueue.add.mockResolvedValue({ id: 'review-test-job' });
    this.reviewAnalyzer.analyze.mockResolvedValue({
      sentiment: 'POSITIVE',
      spamScore: 5,
      toxicityScore: 2,
      suspicionScore: 5,
      reasons: [],
    });

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ResendService)
      .useValue(this.resend)
      .overrideProvider(OtpService)
      .useValue(this.otp)
      .overrideProvider(REDIS_CLIENT)
      .useValue(this.redis)
      .overrideProvider(ReviewAiAnalyzerService)
      .useValue(this.reviewAnalyzer)
      .overrideProvider(getQueueToken(REVIEW_MODERATION_QUEUE))
      .useValue(this.reviewQueue)
      .overrideProvider(ReviewModerationProcessor)
      .useValue({ process: jest.fn() })
      .overrideProvider(getQueueToken(BOOKING_QUEUE))
      .useValue(this.bookingQueue)
      .overrideProvider(BookingProcessor)
      .useValue({ process: jest.fn() })
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

    await resetDatabase(this.prisma);
  }

  async close(): Promise<void> {
    await this.app?.close();
  }

  post(path: string, body: object): request.Test {
    return request(this.app.getHttpServer())
      .post('/api/v1/auth/' + path)
      .send(body);
  }

  /** Register + verify OTP so the user can log in */
  async register(
    email = 'traveler@example.com',
  ): Promise<{ userId: string; email: string }> {
    await this.auth.register({ email, name: 'Traveler', password });
    await this.auth.verifyRegistrationOtp(email, '123456');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { email } });
    return { userId: user.id, email };
  }

  async injectFailure(
    table: 'User' | 'UserRole' | 'VerificationToken',
    operation: 'INSERT' | 'UPDATE',
  ): Promise<() => Promise<void>> {
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
