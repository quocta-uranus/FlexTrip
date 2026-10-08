import { ReviewStatus, Role, ShopCategory } from '@prisma/client';
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

describe('REVIEW-02 provider response', () => {
  const h = new AuthHarness();

  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => {
    await resetDatabase(h.prisma);
    h.redis.clear();
  });

  async function setup(status: ReviewStatus = ReviewStatus.PUBLISHED) {
    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const otherProvider = await createUser(h, { roles: [Role.PROVIDER] });
    const traveler = await createUser(h);
    const admin = await createUser(h, { roles: [Role.ADMIN] });

    for (const owner of [provider, otherProvider]) {
      await h.prisma.providerProfile.create({
        data: {
          userId: owner.id,
          shopName: `${owner.name} Shop`,
          ownerName: owner.name,
          category: ShopCategory.OTHER,
          pickupAddress: 'TP.HCM',
        },
      });
    }

    const listing = await createListing(h, provider.id);
    const booking = await createBooking(h, {
      travelerId: traveler.id,
      listingId: listing.id,
    });
    const review = await h.prisma.review.create({
      data: {
        authorId: traveler.id,
        targetId: provider.id,
        listingId: listing.id,
        bookingId: booking.id,
        rating: 5,
        comment: 'Sản phẩm tốt và Provider hỗ trợ nhiệt tình.',
        status,
      },
    });

    return { provider, otherProvider, traveler, admin, listing, review };
  }

  it('lists only published reviews received by the current provider', async () => {
    const { provider, traveler, listing, review } = await setup();
    await h.prisma.review.create({
      data: {
        authorId: traveler.id,
        targetId: provider.id,
        listingId: listing.id,
        rating: 2,
        comment: 'Đánh giá đang chờ kiểm duyệt nội dung.',
        status: ReviewStatus.FLAGGED,
      },
    });

    const result = await http(h, provider.accessToken).get('/reviews/received');

    expect(result.status).toBe(200);
    expect(result.body).toHaveLength(1);
    expect(result.body[0]).toMatchObject({
      id: review.id,
      listing: { id: listing.id, title: listing.title },
      author: { id: traveler.id, name: traveler.name },
    });
  });

  it('creates then updates a response with audit and one notification', async () => {
    const { provider, traveler, review } = await setup();

    const created = await http(h, provider.accessToken).put(
      `/reviews/${review.id}/response`,
      { response: ' Cảm ơn bạn đã tin tưởng dịch vụ! ' },
    );
    const updated = await http(h, provider.accessToken).put(
      `/reviews/${review.id}/response`,
      { response: 'Cảm ơn bạn, hẹn gặp lại trong chuyến tiếp theo.' },
    );

    expect(created.status).toBe(200);
    expect(created.body.response).toBe('Cảm ơn bạn đã tin tưởng dịch vụ!');
    expect(updated.status).toBe(200);
    expect(updated.body.response).toContain('hẹn gặp lại');
    expect(
      await h.prisma.notification.count({
        where: { userId: traveler.id, type: 'REVIEW' },
      }),
    ).toBe(1);
    expect(
      await h.prisma.auditLog.findMany({
        where: { entityId: review.id },
        orderBy: { createdAt: 'asc' },
        select: { action: true },
      }),
    ).toEqual([
      { action: 'REVIEW_RESPONSE_CREATED' },
      { action: 'REVIEW_RESPONSE_UPDATED' },
    ]);
  });

  it('rejects other providers, travelers and admins', async () => {
    const { otherProvider, traveler, admin, review } = await setup();
    const payload = { response: 'Phản hồi hợp lệ.' };

    expect(
      (
        await http(h, otherProvider.accessToken).put(
          `/reviews/${review.id}/response`,
          payload,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await http(h, traveler.accessToken).put(
          `/reviews/${review.id}/response`,
          payload,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await http(h, admin.accessToken).put(
          `/reviews/${review.id}/response`,
          payload,
        )
      ).status,
    ).toBe(403);
  });

  it('rejects non-published reviews and invalid content', async () => {
    const flagged = await setup(ReviewStatus.FLAGGED);
    expect(
      (
        await http(h, flagged.provider.accessToken).put(
          `/reviews/${flagged.review.id}/response`,
          { response: 'Phản hồi hợp lệ.' },
        )
      ).body.code,
    ).toBe('REVIEW_NOT_PUBLISHED');

    await resetDatabase(h.prisma);
    const published = await setup();
    expect(
      (
        await http(h, published.provider.accessToken).put(
          `/reviews/${published.review.id}/response`,
          { response: '   ' },
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await http(h, published.provider.accessToken).put(
          `/reviews/${published.review.id}/response`,
          { response: 'a'.repeat(2001) },
        )
      ).status,
    ).toBe(400);
  });

  it('creates only one notification when first responses race', async () => {
    const { provider, traveler, review } = await setup();
    const results = await Promise.all([
      http(h, provider.accessToken).put(`/reviews/${review.id}/response`, {
        response: 'Cảm ơn bạn đã đánh giá sản phẩm.',
      }),
      http(h, provider.accessToken).put(`/reviews/${review.id}/response`, {
        response: 'Cảm ơn phản hồi hữu ích của bạn.',
      }),
    ]);

    expect(results.every((result) => result.status === 200)).toBe(true);
    expect(
      await h.prisma.notification.count({
        where: { userId: traveler.id, type: 'REVIEW' },
      }),
    ).toBe(1);
    const actions = await h.prisma.auditLog.findMany({
      where: { entityId: review.id },
      select: { action: true },
    });
    expect(
      actions.filter((item) => item.action === 'REVIEW_RESPONSE_CREATED'),
    ).toHaveLength(1);
    expect(
      actions.filter((item) => item.action === 'REVIEW_RESPONSE_UPDATED'),
    ).toHaveLength(1);
  });
});
