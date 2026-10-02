import { BookingStatus, CancelledBy, Role, ShopCategory } from '@prisma/client';
import {
  AuthHarness,
  resetDatabase,
} from '../auth/__tests__/support/auth-harness';
import {
  createBooking,
  createListing,
  createUser,
  http,
} from '../admin/__tests__/support/admin-fixtures';

describe('REVIEW-05 reputation API', () => {
  const h = new AuthHarness();

  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => {
    await resetDatabase(h.prisma);
    h.redis.clear();
  });

  it('returns detailed private progress and safe public badges', async () => {
    const provider = await createUser(h, {
      roles: [Role.TRAVELER, Role.PROVIDER],
    });
    await h.prisma.providerProfile.create({
      data: {
        userId: provider.id,
        shopName: 'Trusted Shop',
        ownerName: provider.name,
        category: ShopCategory.OTHER,
        pickupAddress: 'TP.HCM',
      },
    });
    const listing = await createListing(h, provider.id);

    for (let index = 0; index < 5; index += 1) {
      const traveler = await createUser(h);
      const booking = await createBooking(h, {
        travelerId: traveler.id,
        listingId: listing.id,
        status: BookingStatus.COMPLETED,
      });
      await h.prisma.review.create({
        data: {
          authorId: traveler.id,
          targetId: provider.id,
          listingId: listing.id,
          bookingId: booking.id,
          rating: 5,
          comment: 'Đánh giá công khai đủ điều kiện uy tín.',
          status: 'PUBLISHED',
        },
      });
    }
    for (let index = 0; index < 5; index += 1) {
      const traveler = await createUser(h);
      await createBooking(h, {
        travelerId: traveler.id,
        listingId: listing.id,
        status: BookingStatus.COMPLETED,
      });
    }

    const mine = await http(h, provider.accessToken).get('/reputation/me');
    const publicResult = await http(h).get(`/reputation/users/${provider.id}`);

    expect(mine.status).toBe(200);
    expect(mine.body.badges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'TRUSTED_PROVIDER', achieved: true }),
      ]),
    );
    expect(publicResult.status).toBe(200);
    expect(publicResult.body.badges).toContainEqual({
      code: 'TRUSTED_PROVIDER',
      label: 'Provider uy tín',
    });
    expect(publicResult.body).not.toHaveProperty('metrics');
    expect(JSON.stringify(publicResult.body)).not.toContain('cancel');
  });

  it('excludes provider and system cancellations from traveler rate', async () => {
    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const traveler = await createUser(h);
    const listing = await createListing(h, provider.id);
    for (let index = 0; index < 5; index += 1) {
      await createBooking(h, {
        travelerId: traveler.id,
        listingId: listing.id,
        status: BookingStatus.COMPLETED,
      });
    }
    await h.prisma.booking.createMany({
      data: [CancelledBy.PROVIDER, CancelledBy.SYSTEM].map(
        (cancelledBy, index) => ({
          travelerId: traveler.id,
          listingId: listing.id,
          startDate: new Date(`2026-10-${10 + index}T00:00:00Z`),
          endDate: new Date(`2026-10-${11 + index}T00:00:00Z`),
          totalPrice: 100000,
          status: BookingStatus.CANCELLED,
          cancelledBy,
        }),
      ),
    });

    const result = await http(h, traveler.accessToken).get('/reputation/me');
    const badge = result.body.badges.find(
      (item: { code: string }) => item.code === 'RELIABLE_TRAVELER',
    );
    expect(badge.achieved).toBe(true);
    expect(
      badge.metrics.find(
        (metric: { key: string }) => metric.key === 'selfCancellationRate',
      ).current,
    ).toBe(0);
  });
});
