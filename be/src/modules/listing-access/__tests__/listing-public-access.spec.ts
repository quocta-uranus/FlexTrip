import 'reflect-metadata';
import { jest } from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ListingStatus, Role, UserStatus } from '@prisma/client';
import request from 'supertest';
import { ListingReadGuard } from '../listing-read.guard';
import { ListingsController } from '../../listings/listings.controller';
import { ListingsService } from '../../listings/listings.service';
import { AvailabilityController } from '../../availability/availability.controller';
import { AvailabilityService } from '../../availability/availability.service';
import { ReviewsController } from '../../reviews/reviews.controller';
import { ReviewsService } from '../../reviews/reviews.service';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../../common/redis/redis.module';
import { AdminListingsController } from '../../admin/listings/admin-listings.controller';
import { AdminListingsService } from '../../admin/listings/admin-listings.service';
import { StaffOperationsController } from '../../staff/staff-operations.controller';
import { StaffOperationsService } from '../../staff/staff-operations.service';
import { AuditService } from '../../audit/audit.service';

type Row = {
  id: string;
  status: ListingStatus;
  providerId: string;
  title: string;
  category: string;
  location: string;
  quantity: number;
  minRentalDays: number;
  maxRentalDays: null;
  depositRate: string;
};
type Where = {
  id?: string;
  status?: ListingStatus;
  providerId?: string;
  category?: string | { in: string[] };
  title?: { contains: string };
  description?: { contains: string };
  location?: { contains: string };
  OR?: Where[];
};
const rows = new Map<string, Row>();
const matches = (row: Row, where: Where): boolean => {
  if (where.id && where.id !== row.id) return false;
  if (where.status && where.status !== row.status) return false;
  if (where.providerId && where.providerId !== row.providerId) return false;
  if (typeof where.category === 'string' && where.category !== row.category)
    return false;
  if (where.category && typeof where.category !== 'string') {
    if (!where.category.in.includes(row.category)) return false;
  }
  if (
    where.title &&
    !row.title.toLowerCase().includes(where.title.contains.toLowerCase())
  )
    return false;
  if (
    where.description &&
    !row.title.toLowerCase().includes(where.description.contains.toLowerCase())
  )
    return false;
  if (
    where.location &&
    !row.location.toLowerCase().includes(where.location.contains.toLowerCase())
  )
    return false;
  return !where.OR || where.OR.some((w) => matches(row, w));
};
const userRoles: Record<string, Role[]> = {
  owner: [Role.PROVIDER],
  other: [Role.PROVIDER],
  traveler: [Role.TRAVELER],
  staff: [Role.STAFF],
  admin: [Role.ADMIN],
  impostor: [Role.TRAVELER],
  blocked: [Role.PROVIDER],
  unverified: [Role.PROVIDER],
};
const database = {
  listing: {
    findUnique: async ({ where }: { where: Where }) =>
      [...rows.values()].find((row) => matches(row, where)) ?? null,
    findFirst: async ({ where }: { where: Where }) =>
      [...rows.values()].find((row) => matches(row, where)) ?? null,
    findMany: async ({
      where,
      skip = 0,
      take = 50,
    }: {
      where: Where;
      skip?: number;
      take?: number;
    }) =>
      [...rows.values()]
        .filter((row) => matches(row, where))
        .slice(skip, skip + take),
    count: async ({ where }: { where: Where }) =>
      [...rows.values()].filter((row) => matches(row, where)).length,
    update: jest.fn(
      async ({ where, data }: { where: Where; data: Partial<Row> }) => {
        const old = rows.get(where.id!);
        const updated = { ...old!, ...data };
        rows.set(updated.id, updated);
        return updated;
      },
    ),
    delete: jest.fn(async () => ({})),
  },
  user: {
    findUnique: async ({ where }: { where: { id: string } }) =>
      userRoles[where.id]
        ? {
            status:
              where.id === 'blocked' ? UserStatus.SUSPENDED : UserStatus.ACTIVE,
            emailVerifiedAt: where.id === 'unverified' ? null : new Date(),
            roles: userRoles[where.id].map((role) => ({ role })),
          }
        : null,
  },
  listingAvailability: {
    findMany: async () => [
      { date: new Date('2026-11-02'), note: 'PRIVATE MAINTENANCE NOTE' },
    ],
    findFirst: async () => null,
    createMany: jest.fn(async () => ({ count: 1 })),
    deleteMany: jest.fn(async () => ({ count: 1 })),
  },
  booking: {
    findMany: async () => [],
    aggregate: async () => ({ _sum: { quantity: 0 } }),
    findUnique: async ({ where }: { where: { id: string } }) =>
      where.id === 'assigned'
        ? {
            id: 'assigned',
            assignedStaffId: 'staff',
            listing: rows.get('DRAFT'),
          }
        : where.id === 'unassigned'
          ? {
              id: 'unassigned',
              assignedStaffId: 'someone-else',
              listing: rows.get('DRAFT'),
            }
          : null,
  },
  cartItem: { findMany: async () => [], aggregate: async () => ({ _sum: { quantity: 0 } }) },
};
const published = jest.fn(async () => [
  { id: 'review', comment: 'PUBLIC REVIEW' },
]);

// No real database connection, migration, seed or destructive test harness.
describe('Listing public access HTTP', () => {
  let app: INestApplication;
  const secret = 'listing-public-access-test-secret';
  const jwt = new JwtService({ secret });
  const headers = (role: string) =>
    role === 'guest'
      ? {}
      : {
          Authorization: `Bearer ${jwt.sign({ sub: role }, { expiresIn: '1h' })}`,
        };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        ListingsController,
        AvailabilityController,
        ReviewsController,
        AdminListingsController,
        StaffOperationsController,
      ],
      providers: [
        ListingsService,
        AvailabilityService,
        ListingReadGuard,
        AccessTokenGuard,
        RolesGuard,
        Reflector,
        { provide: PrismaService, useValue: database },
        {
          provide: ConfigService,
          useValue: { get: () => '', getOrThrow: () => secret },
        },
        { provide: JwtService, useValue: jwt },
        { provide: REDIS_CLIENT, useValue: { exists: async () => 0 } },
        {
          provide: ReviewsService,
          useValue: { findPublishedForListing: published },
        },
        {
          provide: AdminListingsService,
          useValue: { list: async () => ({ items: [...rows.values()] }) },
        },
        {
          provide: StaffOperationsService,
          useValue: new StaffOperationsService(
            database as unknown as PrismaService,
            {} as AuditService,
          ),
        },
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
  afterAll(async () => app?.close());
  beforeEach(() => {
    rows.clear();
    jest.clearAllMocks();
    for (const status of Object.values(ListingStatus))
      rows.set(status, {
        id: status,
        status,
        providerId: 'owner',
        title: 'Camping tent',
        category: 'CAMPING',
        location: 'Da Lat',
        quantity: 3,
        minRentalDays: 1,
        maxRentalDays: null,
        depositRate: '0.30',
      });
  });

  const paths = [
    'detail',
    'availability',
    'check',
    'config',
    'reviews',
  ] as const;
  async function read(
    role: string,
    id: string,
    endpoint: (typeof paths)[number],
  ) {
    const root = `/api/v1/listings/${id}`;
    const server = request(app.getHttpServer());
    if (endpoint === 'check')
      return server
        .post(`${root}/availability/check`)
        .set(headers(role))
        .send({ startDate: '2026-11-01', endDate: '2026-11-03', quantity: 1 });
    const suffix =
      endpoint === 'detail'
        ? ''
        : endpoint === 'availability'
          ? '/availability?from=2026-11-01&to=2026-11-03'
          : endpoint === 'config'
            ? '/rental-config'
            : '/reviews';
    return server.get(root + suffix).set(headers(role));
  }

  for (const role of [
    'guest',
    'traveler',
    'owner',
    'other',
    'staff',
    'admin',
  ]) {
    for (const status of Object.values(ListingStatus)) {
      it(`${role} reads ${status} consistently across all five endpoints`, async () => {
        for (const endpoint of paths) {
          const result = await read(role, status, endpoint);
          expect(result.status).toBe(
            role === 'owner' || status === ListingStatus.ACTIVE ? 200 : 404,
          );
          if (result.status === 404)
            expect(JSON.stringify(result.body)).not.toContain(
              'PRIVATE MAINTENANCE NOTE',
            );
        }
      });
    }
  }

  it.each(['guest', 'traveler', 'other', 'admin', 'staff'])(
    '%s cannot read internal calendar notes',
    async (role) => {
      const response = await read(role, 'ACTIVE', 'availability');
      expect(response.body.manuallyBlocked).toEqual([{ date: '2026-11-02' }]);
    },
  );
  it('owner calendar retains notes, draft editing details and rental config', async () => {
    expect((await read('owner', 'DRAFT', 'detail')).body.id).toBe('DRAFT');
    expect(
      (await read('owner', 'DRAFT', 'availability')).body.manuallyBlocked[0]
        .note,
    ).toBe('PRIVATE MAINTENANCE NOTE');
    expect((await read('owner', 'DRAFT', 'config')).body.quantity).toBe(3);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/listings/me')
          .set(headers('owner'))
      ).body,
    ).toHaveLength(5);
  });
  it.each(paths)('missing ID returns 404 for %s', async (endpoint) =>
    expect((await read('guest', 'missing', endpoint)).status).toBe(404),
  );
  it('invalid and expired tokens cannot grant private access', async () => {
    for (const token of [
      'bad-token',
      jwt.sign({ sub: 'owner' }, { expiresIn: -1 }),
    ]) {
      expect(
        (
          await request(app.getHttpServer())
            .get('/api/v1/listings/DRAFT')
            .set('Authorization', `Bearer ${token}`)
        ).status,
      ).toBe(401);
    }
  });
  it.each(['impostor', 'blocked', 'unverified'])(
    'ineligible owner %s has no private bypass',
    async (role) => {
      rows.get('DRAFT')!.providerId = role;
      expect((await read(role, 'DRAFT', 'detail')).status).toBe(404);
    },
  );
  it('public list/search ignores requested private status and keeps pagination', async () => {
    rows.set('active-2', { ...rows.get('ACTIVE')!, id: 'active-2' });
    for (const role of [
      'guest',
      'traveler',
      'owner',
      'other',
      'staff',
      'admin',
    ]) {
      const result = await request(app.getHttpServer())
        .get(
          '/api/v1/listings?status=DRAFT&category=CAMPING&keyword=tent&location=Da&page=2&limit=1',
        )
        .set(headers(role));
      expect(result.status).toBe(200);
      expect(result.body.total).toBe(2);
      expect(result.body.totalPages).toBe(2);
      expect(result.body.items.map((x: Row) => x.id)).toEqual(['active-2']);
    }
    expect(
      (
        await request(app.getHttpServer()).get(
          '/api/v1/listings?keyword=absent',
        )
      ).body.total,
    ).toBe(0);
  });
  it.each([ListingStatus.SUSPENDED, ListingStatus.REMOVED])(
    'owner cannot mutate or reactivate admin-locked %s',
    async (status) => {
      const root = `/api/v1/listings/${status}`;
      for (const response of [
        await request(app.getHttpServer())
          .patch(root)
          .set(headers('owner'))
          .send({ title: 'Updated title' }),
        await request(app.getHttpServer())
          .patch(root + '/publish')
          .set(headers('owner'))
          .send({}),
        await request(app.getHttpServer())
          .patch(root + '/resume')
          .set(headers('owner'))
          .send({}),
        await request(app.getHttpServer()).delete(root).set(headers('owner')),
        await request(app.getHttpServer())
          .put(root + '/rental-config')
          .set(headers('owner'))
          .send({ minRentalDays: 1 }),
        await request(app.getHttpServer())
          .post(root + '/availability/block')
          .set(headers('owner'))
          .send({ dates: ['2026-11-01'] }),
        await request(app.getHttpServer())
          .post(root + '/availability/unblock')
          .set(headers('owner'))
          .send({ dates: ['2026-11-01'] }),
      ]) {
        expect(response.status).toBe(403);
        expect(response.body.code).toBe('LISTING_LOCKED_BY_ADMIN');
      }
      expect(database.listing.update).not.toHaveBeenCalled();
      expect(database.listing.delete).not.toHaveBeenCalled();
      expect(database.listingAvailability.createMany).not.toHaveBeenCalled();
    },
  );
  it('owner can edit an unlocked draft, others cannot', async () => {
    expect(
      (
        await request(app.getHttpServer())
          .patch('/api/v1/listings/DRAFT')
          .set(headers('other'))
          .send({ title: 'Updated title' })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app.getHttpServer())
          .patch('/api/v1/listings/DRAFT')
          .set(headers('owner'))
          .send({ title: 'Updated title' })
      ).status,
    ).toBe(200);
  });
  it('Admin retains private management routes without public bypass', async () => {
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/admin/listings?tab=ALL')
          .set(headers('admin'))
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/admin/listings')
          .set(headers('staff'))
      ).status,
    ).toBe(403);
    expect(
      (await request(app.getHttpServer()).get('/api/v1/admin/listings')).status,
    ).toBe(401);
  });
  it('Staff retains assigned booking access, not all private listings', async () => {
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/staff/bookings/assigned')
          .set(headers('staff'))
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/staff/bookings/unassigned')
          .set(headers('staff'))
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/staff/bookings/assigned')
          .set(headers('other'))
      ).status,
    ).toBe(403);
  });
});
