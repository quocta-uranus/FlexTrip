import { BookingStatus, CancelledBy, ReviewStatus, Role } from '@prisma/client';
import { jest } from '@jest/globals';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { ReputationService } from './reputation.service';

describe('ReputationService', () => {
  const configValues: Record<string, number> = {
    trusted_provider_min_completed: 10,
    trusted_provider_min_rating: 4.5,
    trusted_provider_min_reviews: 5,
    reliable_traveler_min_completed: 5,
    reliable_traveler_max_cancel_rate: 10,
  };
  const userFindUnique =
    jest.fn<() => Promise<{ roles: Array<{ role: Role }> } | null>>();
  const bookingCount =
    jest.fn<(args: { where: Record<string, unknown> }) => Promise<number>>();
  const reviewAggregate = jest.fn<
    () => Promise<{
      _avg: { rating: number | null };
      _count: { _all: number };
    }>
  >();
  const configGet = jest.fn<(key: string) => Promise<number>>();
  const prisma = {
    user: { findUnique: userFindUnique },
    booking: { count: bookingCount },
    review: { aggregate: reviewAggregate },
  } as unknown as PrismaService;
  const config = { get: configGet } as unknown as SystemConfigService;
  const service = new ReputationService(prisma, config);

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(configValues, {
      trusted_provider_min_completed: 10,
      trusted_provider_min_rating: 4.5,
      trusted_provider_min_reviews: 5,
      reliable_traveler_min_completed: 5,
      reliable_traveler_max_cancel_rate: 10,
    });
    configGet.mockImplementation((key: string) =>
      Promise.resolve(configValues[key]),
    );
  });

  it('awards both badges to a qualifying multi-role user', async () => {
    userFindUnique.mockResolvedValue({
      roles: [{ role: Role.PROVIDER }, { role: Role.TRAVELER }],
    });
    bookingCount.mockImplementation(({ where }) => {
      if (where.listing) return Promise.resolve(10);
      if (where.status === BookingStatus.COMPLETED) return Promise.resolve(9);
      return Promise.resolve(1);
    });
    reviewAggregate.mockResolvedValue({
      _avg: { rating: 4.8 },
      _count: { _all: 5 },
    });

    const result = await service.getMine('user-1');

    expect(result.badges).toHaveLength(2);
    expect(result.badges.every((badge) => badge.achieved)).toBe(true);
    expect(reviewAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { targetId: 'user-1', status: ReviewStatus.PUBLISHED },
      }),
    );
  });

  it('counts only traveler self-cancellations and handles no bookings', async () => {
    userFindUnique.mockResolvedValue({ roles: [{ role: Role.TRAVELER }] });
    bookingCount.mockResolvedValue(0);

    const result = await service.getMine('traveler-1');
    const badge = result.badges[0];
    const cancelMetric = badge.metrics.find(
      (metric) => metric.key === 'selfCancellationRate',
    );

    expect(badge.achieved).toBe(false);
    expect(cancelMetric?.current).toBe(0);
    expect(bookingCount).toHaveBeenCalledWith({
      where: {
        travelerId: 'traveler-1',
        status: BookingStatus.CANCELLED,
        cancelledBy: CancelledBy.TRAVELER,
      },
    });
  });

  it.each([
    { completed: 9, rating: 4.8, reviews: 5, missing: 'completedBookings' },
    { completed: 10, rating: 4.4, reviews: 5, missing: 'averageRating' },
    { completed: 10, rating: 4.8, reviews: 4, missing: 'publishedReviews' },
  ])(
    'does not award Provider when $missing is below threshold',
    async ({ completed, rating, reviews, missing }) => {
      userFindUnique.mockResolvedValue({ roles: [{ role: Role.PROVIDER }] });
      bookingCount.mockResolvedValue(completed);
      reviewAggregate.mockResolvedValue({
        _avg: { rating },
        _count: { _all: reviews },
      });

      const badge = (await service.getMine('provider-1')).badges[0];

      expect(badge.achieved).toBe(false);
      expect(badge.metrics.find((metric) => metric.key === missing)?.met).toBe(
        false,
      );
    },
  );

  it('does not award Traveler when self-cancellation rate exceeds threshold', async () => {
    userFindUnique.mockResolvedValue({ roles: [{ role: Role.TRAVELER }] });
    bookingCount.mockImplementation(({ where }) =>
      Promise.resolve(where.status === BookingStatus.COMPLETED ? 5 : 1),
    );

    const badge = (await service.getMine('traveler-1')).badges[0];

    expect(badge.achieved).toBe(false);
    expect(
      badge.metrics.find((metric) => metric.key === 'selfCancellationRate')
        ?.current,
    ).toBe(16.67);
  });

  it('recalculates immediately when SystemConfig changes', async () => {
    userFindUnique.mockResolvedValue({ roles: [{ role: Role.PROVIDER }] });
    bookingCount.mockResolvedValue(10);
    reviewAggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { _all: 5 },
    });

    expect((await service.getMine('provider-1')).badges[0].achieved).toBe(true);
    configValues.trusted_provider_min_completed = 11;
    expect((await service.getMine('provider-1')).badges[0].achieved).toBe(
      false,
    );
  });

  it('public response contains achieved badge labels without private metrics', async () => {
    userFindUnique.mockResolvedValue({ roles: [{ role: Role.TRAVELER }] });
    bookingCount.mockImplementation(({ where }) =>
      Promise.resolve(where.status === BookingStatus.COMPLETED ? 5 : 0),
    );

    const result = await service.getPublic('traveler-1');

    expect(result).toEqual({
      userId: 'traveler-1',
      badges: [{ code: 'RELIABLE_TRAVELER', label: 'Traveler đáng tin cậy' }],
    });
    expect(JSON.stringify(result)).not.toContain('selfCancellationRate');
  });
});
