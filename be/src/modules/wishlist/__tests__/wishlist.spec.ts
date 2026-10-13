import 'reflect-metadata';
import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ListingStatus, Prisma, Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../../prisma/prisma.service';
import { SyncWishlistDto } from '../wishlist.dto';
import { WishlistService } from '../wishlist.service';
import { WishlistController } from '../wishlist.controller';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { DENY_ROLES_KEY } from '../../../common/decorators/deny-roles.decorator';

describe('SRC-07 WishlistService (no database)', () => {
  const asyncMock = () => jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const prisma = {
    listing: { findUnique: asyncMock(), findMany: asyncMock() },
    wishlist: {
      findMany: asyncMock(),
      findUnique: asyncMock(),
      count: asyncMock(),
      create: asyncMock(),
      createMany: asyncMock(),
      deleteMany: asyncMock(),
    },
  };
  const service = new WishlistService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('adds an ACTIVE listing owned by another provider', async () => {
    prisma.listing.findUnique.mockResolvedValue({
      id: 'listing-1',
      providerId: 'provider-1',
      status: ListingStatus.ACTIVE,
    });
    prisma.wishlist.create.mockResolvedValue({
      id: 'wish-1',
      userId: 'user-1',
      listingId: 'listing-1',
    });

    await expect(service.add('user-1', 'listing-1')).resolves.toMatchObject({
      status: 'added',
    });
    expect(prisma.wishlist.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', listingId: 'listing-1' },
    });
  });

  it('lists only ACTIVE relations with stable newest-first pagination', async () => {
    prisma.wishlist.findMany.mockResolvedValue([]);
    prisma.wishlist.count.mockResolvedValue(0);
    await expect(
      service.list('user-1', { page: 2, limit: 20 }),
    ).resolves.toMatchObject({
      items: [],
      total: 0,
      page: 2,
      limit: 20,
    });
    expect(prisma.wishlist.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', listing: { status: ListingStatus.ACTIVE } },
        skip: 20,
        take: 20,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it.each([
    ListingStatus.DRAFT,
    ListingStatus.INACTIVE,
    ListingStatus.SUSPENDED,
    ListingStatus.REMOVED,
  ])('rejects a non-public listing with status %s', async (status) => {
    prisma.listing.findUnique.mockResolvedValue({
      id: 'listing-1',
      providerId: 'provider-1',
      status,
    });
    await expect(service.add('user-1', 'listing-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a provider saving their own listing', async () => {
    prisma.listing.findUnique.mockResolvedValue({
      id: 'listing-1',
      providerId: 'user-1',
      status: ListingStatus.ACTIVE,
    });
    await expect(service.add('user-1', 'listing-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('treats duplicate concurrent insert as already existing', async () => {
    prisma.listing.findUnique.mockResolvedValue({
      id: 'listing-1',
      providerId: 'provider-1',
      status: ListingStatus.ACTIVE,
    });
    prisma.wishlist.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
        meta: {},
      }),
    );
    prisma.wishlist.findUnique.mockResolvedValue({ id: 'wish-1' });
    await expect(service.add('user-1', 'listing-1')).resolves.toMatchObject({
      status: 'alreadyExists',
    });
  });

  it('removes only the current user relation and is idempotent', async () => {
    prisma.wishlist.deleteMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    await expect(service.remove('user-1', 'listing-1')).resolves.toEqual({
      removed: true,
    });
    await expect(service.remove('user-1', 'listing-1')).resolves.toEqual({
      removed: false,
    });
    expect(prisma.wishlist.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', listingId: 'listing-1' },
    });
  });

  it('syncs valid items, preserves existing items and skips invalid/self-owned items', async () => {
    prisma.listing.findMany.mockResolvedValue([
      { id: 'active', providerId: 'provider-1', status: ListingStatus.ACTIVE },
      {
        id: 'existing',
        providerId: 'provider-1',
        status: ListingStatus.ACTIVE,
      },
      { id: 'self', providerId: 'user-1', status: ListingStatus.ACTIVE },
      {
        id: 'hidden',
        providerId: 'provider-1',
        status: ListingStatus.SUSPENDED,
      },
    ]);
    prisma.wishlist.findMany.mockResolvedValue([{ listingId: 'existing' }]);
    prisma.wishlist.createMany.mockResolvedValue({ count: 1 });

    await expect(
      service.sync('user-1', [
        'active',
        'existing',
        'self',
        'hidden',
        'missing',
        'active',
      ]),
    ).resolves.toEqual({
      added: ['active'],
      alreadyExists: ['existing'],
      skipped: ['self', 'hidden', 'missing'],
      retryableFailed: [],
    });
    expect(prisma.wishlist.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'user-1', listingId: 'active' }],
      skipDuplicates: true,
    });
  });

  it('returns retryable items when the batch insert fails', async () => {
    prisma.listing.findMany.mockResolvedValue([
      { id: 'active', providerId: 'provider-1', status: ListingStatus.ACTIVE },
    ]);
    prisma.wishlist.findMany.mockResolvedValue([]);
    prisma.wishlist.createMany.mockRejectedValue(
      new Error('temporary database error'),
    );
    await expect(service.sync('user-1', ['active'])).resolves.toEqual({
      added: [],
      alreadyExists: [],
      skipped: [],
      retryableFailed: ['active'],
    });
  });
});

describe('SRC-07 controller authorization metadata', () => {
  it('allows Traveler/Provider and explicitly denies Admin/Staff', () => {
    expect(Reflect.getMetadata(ROLES_KEY, WishlistController)).toEqual([
      Role.TRAVELER,
      Role.PROVIDER,
    ]);
    expect(Reflect.getMetadata(DENY_ROLES_KEY, WishlistController)).toEqual([
      Role.ADMIN,
      Role.STAFF,
    ]);
  });
});

describe('SRC-07 sync DTO', () => {
  it('accepts one to 100 string IDs and rejects oversized payloads', async () => {
    expect(
      await validate(plainToInstance(SyncWishlistDto, { listingIds: ['a'] })),
    ).toEqual([]);
    const oversized = Array.from(
      { length: 101 },
      (_, index) => `listing-${index}`,
    );
    expect(
      (
        await validate(
          plainToInstance(SyncWishlistDto, { listingIds: oversized }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
});
