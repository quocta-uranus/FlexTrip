import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role, TravelPreference, UserStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import request from 'supertest';
import { ProfileController } from '../profile.controller';
import { ProfileService } from '../profile.service';
import {
  CreatePreferenceDto,
  UpdatePreferenceDto,
  RENTAL_PER_TRIP,
} from '../profile.dto';
import {
  matchesPreferredCategory,
  preferredCategoriesForTrip,
} from '../travel-preference.util';
import { ListingCategoryDto as Category } from '../../listings/listings.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { REDIS_CLIENT } from '../../../common/redis/redis.module';

describe('PROF-02 validation and mapping (no database)', () => {
  it.each([
    { tripType: null },
    { tripType: '  ' },
    { tripType: 123 },
    { tripType: 'trekking', preferredCategories: null },
    { tripType: 'trekking', preferredCategories: ['CAMPING', 'CAMPING'] },
    { tripType: 'trekking', preferredCategories: ['CAMPING_TREKKING'] },
    { tripType: 'trekking', preferredCategories: ['VEHICLE'] },
    { tripType: 'trekking', budgetMin: -1 },
    { tripType: 'trekking', budgetMax: 100000000 },
    { tripType: 'trekking', budgetMin: 1.001 },
    { tripType: 'trekking', budgetMin: '100' },
    { tripType: 'trekking', budgetMin: Infinity },
    { tripType: 'trekking', budgetMin: NaN },
    { tripType: 'trekking', budgetScope: 'OTHER' },
  ])('rejects invalid create input %j', async (input) => {
    expect(
      (await validate(plainToInstance(CreatePreferenceDto, input))).length,
    ).toBeGreaterThan(0);
  });

  it('accepts zero, exact maximum, null budgets and all six categories', async () => {
    const dto = plainToInstance(CreatePreferenceDto, {
      tripType: '  trekking  ',
      preferredCategories: Object.values(Category),
      budgetMin: 0,
      budgetMax: 99999999.99,
      budgetScope: RENTAL_PER_TRIP,
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.tripType).toBe('trekking');
    expect(
      await validate(
        plainToInstance(CreatePreferenceDto, {
          tripType: 'old-value',
          budgetMin: null,
          budgetMax: null,
        }),
      ),
    ).toEqual([]);
  });

  it('PATCH omits tripType but rejects explicit null', async () => {
    expect(
      await validate(
        plainToInstance(UpdatePreferenceDto, { preferredCategories: [] }),
      ),
    ).toEqual([]);
    expect(
      (await validate(plainToInstance(UpdatePreferenceDto, { tripType: null })))
        .length,
    ).toBeGreaterThan(0);
  });

  it('uses explicit categories before inferred ones, without mutating input', () => {
    const explicit = [Category.FAMILY];
    expect(preferredCategoriesForTrip('trekking', explicit)).toEqual([
      Category.FAMILY,
    ]);
    expect(explicit).toEqual([Category.FAMILY]);
    expect(preferredCategoriesForTrip('trekking')).toEqual([
      Category.TREKKING,
      Category.CAMPING,
    ]);
    expect(preferredCategoriesForTrip('camping')).toEqual([Category.CAMPING]);
    expect(preferredCategoriesForTrip('beach')).toEqual([Category.BEACH]);
    for (const trip of ['leisure', 'business', 'mixed', 'legacy']) {
      expect(preferredCategoriesForTrip(trip)).toEqual([]);
    }
  });

  it('only interprets actual legacy Listing codes, without mixing shop codes', () => {
    expect(
      matchesPreferredCategory('CAMPING_TREKKING', [Category.CAMPING]),
    ).toBe(true);
    expect(
      matchesPreferredCategory('CAMPING_TREKKING', [Category.TREKKING]),
    ).toBe(true);
    expect(
      matchesPreferredCategory('CAMPING_TREKKING', [Category.FAMILY]),
    ).toBe(false);
    expect(
      matchesPreferredCategory('VEHICLE', [Category.TRAVEL_ESSENTIALS]),
    ).toBe(false);
  });
});

describe('PROF-02 HTTP integration: real validation/JWT/roles, in-memory persistence', () => {
  let app: INestApplication;
  const rows = new Map<string, TravelPreference>();
  const jwt = new JwtService({
    secret: 'prof02-test-secret-never-used-outside-tests',
  });
  let sequence = 0;
  const token = (id: string) => jwt.sign({ sub: id }, { expiresIn: '1h' });
  const owned = (where: { id: string; userId: string }) => {
    const row = rows.get(where.id);
    return row?.userId === where.userId ? row : null;
  };
  const persistence = {
    travelPreference: {
      findMany: async ({ where }: { where: { userId: string } }) =>
        [...rows.values()].filter((x) => x.userId === where.userId),
      findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
        owned(where),
      create: async ({ data }: { data: Omit<TravelPreference, 'id'> }) => {
        const row = { id: `pref-${++sequence}`, ...data };
        rows.set(row.id, row);
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string; userId: string };
        data: Partial<TravelPreference>;
      }) => {
        const old = owned(where);
        if (!old)
          throw new Prisma.PrismaClientKnownRequestError('missing', {
            code: 'P2025',
            clientVersion: 'test',
          });
        const row = { ...old, ...data };
        rows.set(row.id, row);
        return row;
      },
      deleteMany: async ({
        where,
      }: {
        where: { id: string; userId: string };
      }) => {
        if (!owned(where)) return { count: 0 };
        rows.delete(where.id);
        return { count: 1 };
      },
    },
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        roles: [
          {
            role:
              where.id === 'admin'
                ? Role.ADMIN
                : where.id === 'provider'
                  ? Role.PROVIDER
                  : Role.TRAVELER,
          },
        ],
      }),
    },
  };
  // Supertest methods need headers on each request rather than on the agent.
  const auth = (id = 'alice') => ({ Authorization: `Bearer ${token(id)}` });
  const seed = (overrides: Partial<TravelPreference> = {}) => {
    const row: TravelPreference = {
      id: `pref-${++sequence}`,
      userId: 'alice',
      tripType: 'legacy-trip',
      preferredCategories: [],
      budgetMin: new Prisma.Decimal(100),
      budgetMax: new Prisma.Decimal(200),
      budgetScope: null,
      ...overrides,
    };
    rows.set(row.id, row);
    return row;
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        ProfileService,
        RolesGuard,
        AccessTokenGuard,
        Reflector,
        { provide: PrismaService, useValue: persistence },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: () => 'prof02-test-secret-never-used-outside-tests',
          },
        },
        { provide: REDIS_CLIENT, useValue: { exists: async () => 0 } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    rows.clear();
    sequence = 0;
  });

  it('creates and lists multiple records with owner from JWT', async () => {
    for (const tripType of ['trekking', 'beach']) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/profile/preferences')
        .set(auth())
        .send({
          tripType,
          preferredCategories: [Category.CAMPING],
          budgetMin: 0,
          budgetMax: 99999999.99,
        });
      expect(res.status).toBe(201);
      expect(res.body.budgetScope).toBe(RENTAL_PER_TRIP);
      expect(res.body.userId).toBe('alice');
    }
    const result = await request(app.getHttpServer())
      .get('/api/v1/profile/preferences')
      .set(auth());
    expect(result.status).toBe(200);
    expect(result.body).toHaveLength(2);
    const other = await request(app.getHttpServer())
      .get('/api/v1/profile/preferences')
      .set(auth('bob'));
    expect(other.body).toEqual([]);
  });

  it('updates and deletes the second record without affecting the first', async () => {
    const first = seed();
    const second = seed();
    const edit = await request(app.getHttpServer())
      .patch(`/api/v1/profile/preferences/${second.id}`)
      .set(auth())
      .send({ preferredCategories: [Category.FAMILY] });
    expect(edit.status).toBe(200);
    expect(rows.get(first.id)?.preferredCategories).toEqual([]);
    expect(rows.get(second.id)?.preferredCategories).toEqual([Category.FAMILY]);
    const deleted = await request(app.getHttpServer())
      .delete(`/api/v1/profile/preferences/${second.id}`)
      .set(auth());
    expect(deleted.status).toBe(200);
    expect(rows.has(first.id)).toBe(true);
    expect(rows.has(second.id)).toBe(false);
  });

  it.each(['patch', 'delete'] as const)(
    'returns 404 for missing and foreign records: %s',
    async (method) => {
      const row = seed({ userId: 'bob' });
      for (const id of [row.id, 'missing']) {
        const res = await request(app.getHttpServer())
          [method](`/api/v1/profile/preferences/${id}`)
          .set(auth())
          .send({});
        expect(res.status).toBe(404);
      }
      expect(rows.has(row.id)).toBe(true);
    },
  );

  it('rejects missing/invalid JWT, ADMIN and client-supplied userId; permits Provider', async () => {
    expect(
      (await request(app.getHttpServer()).get('/api/v1/profile/preferences'))
        .status,
    ).toBe(401);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/profile/preferences')
          .set('Authorization', 'Bearer invalid')
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/profile/preferences')
          .set(auth('admin'))
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app.getHttpServer())
          .post('/api/v1/profile/preferences')
          .set(auth())
          .send({ tripType: 'trekking', userId: 'bob' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post('/api/v1/profile/preferences')
          .set(auth('provider'))
          .send({ tripType: 'trekking' })
      ).status,
    ).toBe(201);
  });

  it.each([
    { budgetMin: 201 },
    { budgetMax: 99 },
    { budgetMin: -1, budgetScope: RENTAL_PER_TRIP },
    { tripType: null },
    { preferredCategories: null },
    { preferredCategories: ['OTHER'] },
  ])('rejects invalid PATCH %j', async (payload) => {
    const row = seed({ budgetScope: RENTAL_PER_TRIP });
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/profile/preferences/${row.id}`)
          .set(auth())
          .send(payload)
      ).status,
    ).toBe(400);
    expect(rows.get(row.id)).toEqual(row);
  });

  it('preserves invalid legacy budgets on unrelated edits', async () => {
    const row = seed({
      budgetMin: new Prisma.Decimal(-10),
      budgetMax: new Prisma.Decimal(-20),
    });
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/profile/preferences/${row.id}`)
      .set(auth())
      .send({ tripType: '  camping  ', preferredCategories: [] });
    expect(res.status).toBe(200);
    expect(res.body.tripType).toBe('camping');
    expect(rows.get(row.id)?.budgetMin?.toString()).toBe('-10');
    expect(rows.get(row.id)?.budgetScope).toBeNull();
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/profile/preferences/${row.id}`)
          .set(auth())
          .send({ budgetScope: RENTAL_PER_TRIP })
      ).status,
    ).toBe(400);
  });

  it('requires confirmation for legacy changes, validates merged bounds and accepts explicit confirmation', async () => {
    const row = seed();
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/profile/preferences/${row.id}`)
          .set(auth())
          .send({ budgetMin: 120 })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/profile/preferences/${row.id}`)
          .set(auth())
          .send({ budgetMin: 300, budgetScope: RENTAL_PER_TRIP })
      ).status,
    ).toBe(400);
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/profile/preferences/${row.id}`)
      .set(auth())
      .send({ budgetMin: 120, budgetScope: RENTAL_PER_TRIP });
    expect(res.status).toBe(200);
    expect(rows.get(row.id)?.budgetMax?.toString()).toBe('200');
    expect(res.body.budgetScope).toBe(RENTAL_PER_TRIP);
  });

  it('rejects removing confirmed scope while budget remains, clears it when both bounds are null', async () => {
    const row = seed({ budgetScope: RENTAL_PER_TRIP });
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/profile/preferences/${row.id}`)
          .set(auth())
          .send({ budgetScope: null })
      ).status,
    ).toBe(400);
    const one = await request(app.getHttpServer())
      .patch(`/api/v1/profile/preferences/${row.id}`)
      .set(auth())
      .send({ budgetMin: null });
    expect(one.status).toBe(200);
    expect(one.body.budgetScope).toBe(RENTAL_PER_TRIP);
    const both = await request(app.getHttpServer())
      .patch(`/api/v1/profile/preferences/${row.id}`)
      .set(auth())
      .send({ budgetMax: null });
    expect(both.status).toBe(200);
    expect(both.body.budgetScope).toBeNull();
    expect(rows.get(row.id)?.budgetMin).toBeNull();
  });

  it('can clear legacy budgets without confirmation and never persists inferred categories', async () => {
    const row = seed();
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/profile/preferences/${row.id}`)
      .set(auth())
      .send({ budgetMin: null, budgetMax: null });
    expect(res.status).toBe(200);
    expect(res.body.budgetScope).toBeNull();
    const created = await request(app.getHttpServer())
      .post('/api/v1/profile/preferences')
      .set(auth())
      .send({ tripType: 'trekking' });
    expect(created.status).toBe(201);
    expect(created.body.preferredCategories).toEqual([]);
    expect(created.body.budgetScope).toBeNull();
  });

  it('rejects inverted create range and unconfirmed nonempty create budget', async () => {
    for (const input of [
      { budgetMin: 2, budgetMax: 1 },
      { budgetMin: 1, budgetScope: null },
    ]) {
      expect(
        (
          await request(app.getHttpServer())
            .post('/api/v1/profile/preferences')
            .set(auth())
            .send({ tripType: 'trekking', ...input })
        ).status,
      ).toBe(400);
    }
    expect(rows.size).toBe(0);
  });
});
