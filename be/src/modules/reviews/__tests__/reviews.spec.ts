import { BookingStatus, Role, ShopCategory } from '@prisma/client';
import { jest } from '@jest/globals';
import {
  AuthHarness,
  resetDatabase,
} from '../../auth/__tests__/support/auth-harness';
import {
  createBooking,
  createListing,
  createUser,
  http,
} from '../../admin/__tests__/support/admin-fixtures';
import { ReviewModerationService } from '../review-moderation.service';

describe('REVIEW-01 submit rating and review', () => {
  const h = new AuthHarness();
  let moderation: ReviewModerationService;

  beforeAll(async () => {
    await h.open();
    moderation = h.app.get(ReviewModerationService);
  });
  afterAll(() => h.close());
  beforeEach(async () => {
    await resetDatabase(h.prisma);
    h.redis.clear();
  });

  async function setup(status: BookingStatus = BookingStatus.COMPLETED) {
    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    await h.prisma.providerProfile.create({
      data: {
        userId: provider.id,
        shopName: 'Flex Shop',
        ownerName: provider.name,
        category: ShopCategory.OTHER,
        pickupAddress: 'TP.HCM',
      },
    });
    const traveler = await createUser(h);
    const stranger = await createUser(h);
    const listing = await createListing(h, provider.id);
    const booking = await createBooking(h, {
      travelerId: traveler.id,
      listingId: listing.id,
      status,
    });
    return { provider, traveler, stranger, listing, booking };
  }

  it('derives provider/listing, commits PENDING, then enqueues moderation', async () => {
    const { provider, traveler, listing, booking } = await setup();
    const result = await http(h, traveler.accessToken).post('/reviews', {
      bookingId: booking.id,
      rating: 5,
      comment: 'Sản phẩm rất tốt và đúng như mô tả.',
    });

    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({
      bookingId: booking.id,
      listingId: listing.id,
      rating: 5,
      status: 'PENDING',
    });
    expect(result.body).not.toHaveProperty('moderationNote');

    const stored = await h.prisma.review.findUniqueOrThrow({
      where: { bookingId: booking.id },
    });
    expect(stored.targetId).toBe(provider.id);
    const profile = await h.prisma.providerProfile.findUniqueOrThrow({
      where: { userId: provider.id },
    });
    expect(Number(profile.ratingAvg)).toBe(0);
    expect(profile.reviewsCount).toBe(0);
  });

  it('rejects non-owner and non-completed bookings', async () => {
    const pending = await setup(BookingStatus.CONFIRMED);
    expect(
      (
        await http(h, pending.traveler.accessToken).post('/reviews', {
          bookingId: pending.booking.id,
          rating: 4,
          comment: 'Nội dung đánh giá đủ dài.',
        })
      ).body.code,
    ).toBe('BOOKING_NOT_COMPLETED');
    expect(
      (
        await http(h, pending.stranger.accessToken).post('/reviews', {
          bookingId: pending.booking.id,
          rating: 4,
          comment: 'Nội dung đánh giá đủ dài.',
        })
      ).status,
    ).toBe(403);
  });

  it('flags deterministic abuse and excludes it from the public list and aggregate', async () => {
    const { provider, traveler, listing, booking } = await setup();
    const result = await http(h, traveler.accessToken).post('/reviews', {
      bookingId: booking.id,
      rating: 1,
      comment: 'Đây là đồ lừa đảo, đồ lừa đảo, đồ lừa đảo.',
    });
    expect(result.body.status).toBe('FLAGGED');
    expect((await http(h).get(`/listings/${listing.id}/reviews`)).body).toEqual(
      [],
    );
    const profile = await h.prisma.providerProfile.findUniqueOrThrow({
      where: { userId: provider.id },
    });
    expect(profile.reviewsCount).toBe(0);
  });

  it('stores the toxicity floor even when enqueueing AI fails', async () => {
    const { traveler, booking } = await setup();
    jest.spyOn(moderation, 'enqueue').mockResolvedValueOnce(false);
    const result = await http(h, traveler.accessToken).post('/reviews', {
      bookingId: booking.id,
      rating: 1,
      comment: 'shop như cặc, đụ mẹ',
    });

    expect(result.body.status).toBe('FLAGGED');
    const stored = await h.prisma.review.findUniqueOrThrow({
      where: { bookingId: booking.id },
    });
    expect(stored).toMatchObject({
      status: 'FLAGGED',
      spamScore: 0,
      toxicityScore: 80,
      moderationSource: 'RULE',
    });
  });

  it('stores the spam floor even when enqueueing AI fails', async () => {
    const { traveler, booking } = await setup();
    jest.spyOn(moderation, 'enqueue').mockResolvedValueOnce(false);
    const result = await http(h, traveler.accessToken).post('/reviews', {
      bookingId: booking.id,
      rating: 5,
      comment: 'aaaaaaaaaaaaaaaaaaaa đây là nội dung spam thử nghiệm',
    });

    expect(result.body.status).toBe('FLAGGED');
    const stored = await h.prisma.review.findUniqueOrThrow({
      where: { bookingId: booking.id },
    });
    expect(stored).toMatchObject({
      status: 'FLAGGED',
      spamScore: 80,
      moderationSource: 'RULE',
    });
  });

  it('allows only one review when submissions race', async () => {
    const { traveler, booking } = await setup();
    const payload = {
      bookingId: booking.id,
      rating: 5,
      comment: 'Trải nghiệm thuê sản phẩm rất tốt.',
    };
    const results = await Promise.all([
      http(h, traveler.accessToken).post('/reviews', payload),
      http(h, traveler.accessToken).post('/reviews', payload),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      await h.prisma.review.count({ where: { bookingId: booking.id } }),
    ).toBe(1);
  });

  it('validates fields and does not accept client-controlled target data', async () => {
    const { traveler, booking } = await setup();
    expect(
      (
        await http(h, traveler.accessToken).post('/reviews', {
          bookingId: booking.id,
          rating: 6,
          comment: 'ngắn',
          targetId: 'attacker-choice',
        })
      ).status,
    ).toBe(400);
  });

  it('keeps the committed review pending when enqueue fails', async () => {
    const { traveler, booking } = await setup();
    jest.spyOn(moderation, 'enqueue').mockResolvedValueOnce(false);
    const result = await http(h, traveler.accessToken).post('/reviews', {
      bookingId: booking.id,
      rating: 4,
      comment: 'Đánh giá hợp lệ nhưng Redis đang tạm thời bị lỗi.',
    });
    expect(result.status).toBe(201);
    expect(result.body.status).toBe('PENDING');
    expect(
      await h.prisma.review.count({ where: { bookingId: booking.id } }),
    ).toBe(1);
  });
});
