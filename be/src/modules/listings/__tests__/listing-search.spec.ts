import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ListingStatus, Prisma } from '@prisma/client';
import { jest } from '@jest/globals';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { ListingReadGuard } from '../../listing-access/listing-read.guard';
import { ListingsController } from '../listings.controller';
import {
  ListingCategoryDto,
  PublicListingsQueryDto,
  PublicListingSortDto,
} from '../listings.dto';
import { ListingsService } from '../listings.service';

type SearchRow = {
  id: string;
  title: string;
  description: string;
  status: ListingStatus;
  category: string;
  location: string;
  price: Prisma.Decimal;
  createdAt: Date;
  provider: {
    providerProfile: { ratingAvg: Prisma.Decimal } | null;
  };
};

const row = (id: string, overrides: Partial<SearchRow> = {}): SearchRow => ({
  id,
  title: `Thiết bị ${id}`,
  description: `Mô tả ${id}`,
  status: ListingStatus.ACTIVE,
  category: ListingCategoryDto.CAMPING,
  location: 'Đà Lạt',
  price: new Prisma.Decimal(100_000),
  createdAt: new Date(`2026-10-${id.padStart(2, '0')}T00:00:00.000Z`),
  provider: { providerProfile: { ratingAvg: new Prisma.Decimal(4) } },
  ...overrides,
});

const rows: SearchRow[] = [
  row('1', {
    title: 'Lều gia đình',
    category: ListingCategoryDto.CAMPING,
    price: new Prisma.Decimal(100_000),
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    provider: { providerProfile: { ratingAvg: new Prisma.Decimal(4.2) } },
  }),
  row('2', {
    title: 'Gậy leo núi',
    description: 'Dụng cụ trekking tại Hà Nội',
    category: ListingCategoryDto.TREKKING,
    location: 'Hà Nội',
    price: new Prisma.Decimal(200_000),
    createdAt: new Date('2026-10-02T00:00:00.000Z'),
    provider: { providerProfile: { ratingAvg: new Prisma.Decimal(4.9) } },
  }),
  row('3', {
    title: 'Bộ cắm trại cũ',
    category: 'CAMPING_TREKKING',
    price: new Prisma.Decimal(150_000),
    createdAt: new Date('2026-10-02T00:00:00.000Z'),
    provider: { providerProfile: null },
  }),
  row('4', {
    category: ListingCategoryDto.CAMERA_GEAR,
    location: 'Đà Nẵng',
    price: new Prisma.Decimal(300_000),
    createdAt: new Date('2026-10-04T00:00:00.000Z'),
    provider: { providerProfile: { ratingAvg: new Prisma.Decimal(3.5) } },
  }),
  row('5', { category: ListingCategoryDto.BEACH }),
  row('6', { category: ListingCategoryDto.TRAVEL_ESSENTIALS }),
  row('7', { category: ListingCategoryDto.FAMILY }),
  row('8', { status: ListingStatus.DRAFT }),
];

function matchesWhere(item: SearchRow, where: any): boolean {
  if (where.AND && !where.AND.every((part: any) => matchesWhere(item, part))) {
    return false;
  }
  if (where.status && item.status !== where.status) return false;
  if (typeof where.category === 'string' && item.category !== where.category) {
    return false;
  }
  if (where.category?.in && !where.category.in.includes(item.category))
    return false;
  if (where.location?.contains) {
    if (
      !item.location
        .toLowerCase()
        .includes(where.location.contains.toLowerCase())
    ) {
      return false;
    }
  }
  if (where.OR) {
    const keyword =
      where.OR[0]?.title?.contains ?? where.OR[1]?.description?.contains;
    if (
      keyword &&
      !`${item.title} ${item.description}`
        .toLowerCase()
        .includes(keyword.toLowerCase())
    ) {
      return false;
    }
  }
  if (where.price?.gte && item.price.lessThan(where.price.gte)) return false;
  if (where.price?.lte && item.price.greaterThan(where.price.lte)) return false;
  const profileFilter = where.provider?.providerProfile;
  if (profileFilter?.isNot === null && item.provider.providerProfile === null) {
    return false;
  }
  if (profileFilter?.is === null && item.provider.providerProfile !== null) {
    return false;
  }
  return true;
}

function compareBy(orderBy: any[]) {
  return (left: SearchRow, right: SearchRow) => {
    for (const order of orderBy) {
      let a: string | number | Date;
      let b: string | number | Date;
      let direction: 'asc' | 'desc';
      if (order.provider) {
        a = left.provider.providerProfile?.ratingAvg.toNumber() ?? -Infinity;
        b = right.provider.providerProfile?.ratingAvg.toNumber() ?? -Infinity;
        direction = order.provider.providerProfile.ratingAvg;
      } else {
        const [field, value] = Object.entries(order)[0] as [
          'id' | 'price' | 'createdAt',
          'asc' | 'desc',
        ];
        a = field === 'price' ? left.price.toNumber() : left[field];
        b = field === 'price' ? right.price.toNumber() : right[field];
        direction = value;
      }
      const result = a < b ? -1 : a > b ? 1 : 0;
      if (result) return direction === 'asc' ? result : -result;
    }
    return 0;
  };
}

class MemoryPrisma {
  listing = {
    count: jest.fn(
      async ({ where }: any) =>
        rows.filter((item) => matchesWhere(item, where)).length,
    ),
    findMany: jest.fn(async ({ where, orderBy, skip = 0, take = 20 }: any) =>
      rows
        .filter((item) => matchesWhere(item, where))
        .sort(compareBy(Array.isArray(orderBy) ? orderBy : [orderBy]))
        .slice(skip, skip + take),
    ),
  };
}

describe('public listing search', () => {
  let service: ListingsService;

  beforeEach(() => {
    service = new ListingsService(
      new MemoryPrisma() as unknown as PrismaService,
      { get: jest.fn(() => '') } as unknown as ConfigService,
    );
  });

  it('filters keyword and location while always excluding non-ACTIVE listings', async () => {
    const result = await service.findAll({
      keyword: 'leo núi',
      location: 'hà nội',
    });
    expect(result.items.map((item) => item.id)).toEqual(['2']);
    expect(
      result.items.every((item) => item.status === ListingStatus.ACTIVE),
    ).toBe(true);
  });

  it.each(Object.values(ListingCategoryDto))(
    'supports official category %s',
    async (category) => {
      const result = await service.findAll({ category });
      expect(result.items.length).toBeGreaterThan(0);
    },
  );

  it.each([ListingCategoryDto.CAMPING, ListingCategoryDto.TREKKING])(
    'includes legacy CAMPING_TREKKING when filtering %s',
    async (category) => {
      const result = await service.findAll({ category });
      expect(result.items.map((item) => item.id)).toContain('3');
    },
  );

  it('applies inclusive daily min/max price boundaries', async () => {
    const result = await service.findAll({
      minPrice: 100_000,
      maxPrice: 150_000,
    });
    expect(result.items.map((item) => item.price.toNumber()).sort()).toEqual([
      100_000, 100_000, 100_000, 100_000, 150_000,
    ]);
  });

  it.each([
    [PublicListingSortDto.NEWEST, ['7', '6', '5', '4', '3', '2', '1']],
    [PublicListingSortDto.PRICE_ASC, ['1', '5', '6', '7', '3', '2', '4']],
    [PublicListingSortDto.PRICE_DESC, ['4', '2', '3', '1', '5', '6', '7']],
    [PublicListingSortDto.RATING, ['2', '1', '7', '6', '5', '4', '3']],
  ])('sorts %s with deterministic tie breakers', async (sort, expected) => {
    const result = await service.findAll({
      sort: sort as PublicListingSortDto,
      limit: 20,
    });
    expect(result.items.map((item) => item.id)).toEqual(expected);
  });

  it('keeps pages stable and calculates totals after filters', async () => {
    const first = await service.findAll({ page: 1, limit: 3 });
    const second = await service.findAll({ page: 2, limit: 3 });
    expect(first.total).toBe(7);
    expect(first.totalPages).toBe(3);
    expect(first.items.map((item) => item.id)).toEqual(['7', '6', '5']);
    expect(second.items.map((item) => item.id)).toEqual(['4', '3', '2']);
    expect(first.items.map((item) => item.id)).not.toEqual(
      expect.arrayContaining(second.items.map((item) => item.id)),
    );
  });
});

describe('public listing query validation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ListingsController],
      providers: [
        {
          provide: ListingsService,
          useValue: {
            findAll: jest.fn(async (query: PublicListingsQueryDto) => ({
              items: [],
              total: 0,
              page: query.page ?? 1,
              limit: query.limit ?? 20,
              totalPages: 0,
            })),
          },
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ListingReadGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
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

  afterAll(async () => app.close());

  it.each([
    'page=0',
    'page=1.5',
    'limit=0',
    'limit=51',
    'minPrice=-1',
    'maxPrice=-1',
    'minPrice=200&maxPrice=100',
    'sort=popular',
    'category=CAMPING_TREKKING',
  ])('returns 400 for invalid query %s', async (query) => {
    await request(app.getHttpServer())
      .get(`/api/v1/listings?${query}`)
      .expect(400);
  });

  it('keeps legacy status requests compatible without changing public scope', async () => {
    await request(app.getHttpServer())
      .get(
        '/api/v1/listings?status=DRAFT&page=1&limit=50&minPrice=0&maxPrice=100000&sort=newest&category=CAMPING',
      )
      .expect(200);
  });
});
