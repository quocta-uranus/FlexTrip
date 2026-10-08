import { ReviewStatus, Role, ShopCategory } from '@prisma/client';
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

describe('REVIEW-03 AI and Admin moderation', () => {
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
    h.reviewAnalyzer.analyze.mockReset();
  });

  async function setup(status: ReviewStatus = ReviewStatus.PENDING) {
    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const traveler = await createUser(h);
    const admin = await createUser(h, { roles: [Role.ADMIN] });
    await h.prisma.providerProfile.create({
      data: {
        userId: provider.id,
        shopName: 'AI Review Shop',
        ownerName: provider.name,
        category: ShopCategory.OTHER,
        pickupAddress: 'TP.HCM',
      },
    });
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
        comment: 'Đánh giá đang chờ AI kiểm duyệt.',
        status,
      },
    });
    return { provider, traveler, admin, review };
  }

  it('publishes a clean review once and recalculates rating idempotently', async () => {
    const { provider, traveler, review } = await setup();
    h.reviewAnalyzer.analyze.mockResolvedValue({
      sentiment: 'POSITIVE',
      spamScore: 69,
      toxicityScore: 5,
      suspicionScore: 10,
      reasons: [
        'Đánh giá tích cực, không có dấu hiệu spam, không đáng ngờ, không gây hại.',
      ],
    });
    await moderation.analyze(review.id);
    await moderation.analyze(review.id);
    const stored = await h.prisma.review.findUniqueOrThrow({
      where: { id: review.id },
    });
    const profile = await h.prisma.providerProfile.findUniqueOrThrow({
      where: { userId: provider.id },
    });
    expect(stored.status).toBe('PUBLISHED');
    expect(stored.sentiment).toBe('POSITIVE');
    expect(profile.reviewsCount).toBe(1);
    expect(Number(profile.ratingAvg)).toBe(5);
    expect(
      await h.prisma.notification.count({
        where: { userId: traveler.id, type: 'REVIEW' },
      }),
    ).toBe(1);
    expect(h.reviewAnalyzer.analyze).toHaveBeenCalledTimes(1);
  });

  it.each(['spamScore', 'toxicityScore', 'suspicionScore'] as const)(
    'flags score at the threshold for %s',
    async (score) => {
      const { review } = await setup();
      h.reviewAnalyzer.analyze.mockResolvedValue({
        sentiment: 'NEGATIVE',
        spamScore: 1,
        toxicityScore: 1,
        suspicionScore: 1,
        reasons: ['Đáng ngờ'],
        [score]: 70,
      });
      await moderation.analyze(review.id);
      expect(
        (await h.prisma.review.findUniqueOrThrow({ where: { id: review.id } }))
          .status,
      ).toBe('FLAGGED');
    },
  );

  it('flags profanity when AI returns a contradictory zero toxicity score', async () => {
    const { admin, review } = await setup();
    await h.prisma.review.update({
      where: { id: review.id },
      data: { comment: 'shop như cặc, đụ mẹ' },
    });
    h.reviewAnalyzer.analyze.mockResolvedValue({
      sentiment: 'NEGATIVE',
      spamScore: 0,
      toxicityScore: 0,
      suspicionScore: 0,
      reasons: ['User used profanity and offensive language.'],
    });

    await moderation.analyze(review.id);

    const stored = await h.prisma.review.findUniqueOrThrow({
      where: { id: review.id },
    });
    expect(stored).toMatchObject({
      status: 'FLAGGED',
      sentiment: 'NEGATIVE',
      toxicityScore: 80,
    });
    expect(stored.analysisReasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining('[RULE]'),
        expect.stringContaining('[AI]'),
      ]),
    );

    const response = await http(h, admin.accessToken).get(
      '/admin/reviews?status=FLAGGED',
    );
    expect(response.body.items[0].analysisSource).toBe('RULE_AND_AI');
    expect(response.body.items[0].displayReasons).toEqual([
      'Nội dung chứa từ ngữ tục tĩu hoặc xúc phạm.',
    ]);
    expect(response.body.items[0]).not.toHaveProperty('analysisReasons');
  });

  it('keeps a toxic review flagged when Groq is unavailable', async () => {
    const { review } = await setup();
    await h.prisma.review.update({
      where: { id: review.id },
      data: { comment: 'shop như cặc, đụ mẹ' },
    });
    h.reviewAnalyzer.analyze.mockRejectedValue(new Error('Groq unavailable'));

    await expect(moderation.analyze(review.id)).resolves.toBeUndefined();

    const stored = await h.prisma.review.findUniqueOrThrow({
      where: { id: review.id },
    });
    expect(stored).toMatchObject({
      status: 'FLAGGED',
      toxicityScore: 80,
      moderationSource: 'RULE',
    });
  });

  it('flags deterministic spam when AI returns contradictory zero scores', async () => {
    const { review } = await setup();
    await h.prisma.review.update({
      where: { id: review.id },
      data: {
        comment: 'aaaaaaaaaaaaaaaaaaaa đây là nội dung spam thử nghiệm',
      },
    });
    h.reviewAnalyzer.analyze.mockResolvedValue({
      sentiment: 'NEUTRAL',
      spamScore: 0,
      toxicityScore: 0,
      suspicionScore: 0,
      reasons: ['Nội dung có dấu hiệu spam và chứa ký tự lặp lại.'],
    });

    await moderation.analyze(review.id);

    const stored = await h.prisma.review.findUniqueOrThrow({
      where: { id: review.id },
    });
    expect(stored).toMatchObject({
      status: 'FLAGGED',
      sentiment: 'NEUTRAL',
      spamScore: 80,
    });
  });

  it.each([
    {
      rating: 5,
      sentiment: 'NEGATIVE' as const,
      comment: 'Sản phẩm rất tệ, bị hỏng và không giống mô tả.',
    },
    {
      rating: 1,
      sentiment: 'POSITIVE' as const,
      comment: 'Sản phẩm tuyệt vời, sạch sẽ và hỗ trợ rất tốt.',
    },
  ])(
    'flags a $rating-star review when rating and $sentiment sentiment conflict',
    async ({ rating, sentiment, comment }) => {
      const { review } = await setup();
      await h.prisma.review.update({
        where: { id: review.id },
        data: { rating, comment },
      });
      h.reviewAnalyzer.analyze.mockResolvedValue({
        sentiment,
        spamScore: 0,
        toxicityScore: 0,
        suspicionScore: 0,
        reasons: ['Nội dung và số sao được phân tích độc lập.'],
      });

      await moderation.analyze(review.id);

      const stored = await h.prisma.review.findUniqueOrThrow({
        where: { id: review.id },
      });
      expect(stored).toMatchObject({
        status: 'FLAGGED',
        sentiment,
        suspicionScore: 80,
      });
      expect(stored.analysisReasons).toContain(
        '[RULE] Số sao và nội dung đánh giá có dấu hiệu mâu thuẫn.',
      );
    },
  );

  it('does not raise suspicion for a rating consistent with its sentiment', async () => {
    const { review } = await setup();
    h.reviewAnalyzer.analyze.mockResolvedValue({
      sentiment: 'POSITIVE',
      spamScore: 0,
      toxicityScore: 0,
      suspicionScore: 0,
      reasons: ['Nội dung tích cực và phù hợp với số sao.'],
    });

    await moderation.analyze(review.id);

    const stored = await h.prisma.review.findUniqueOrThrow({
      where: { id: review.id },
    });
    expect(stored).toMatchObject({
      status: 'PUBLISHED',
      sentiment: 'POSITIVE',
      suspicionScore: 0,
    });
  });

  it('lets only Admin list, approve, reject and reanalyze reviews', async () => {
    const { admin, traveler, review } = await setup(ReviewStatus.FLAGGED);
    jest.spyOn(moderation, 'enqueue').mockResolvedValueOnce(true);
    expect(
      (await http(h, traveler.accessToken).get('/admin/reviews')).status,
    ).toBe(403);
    expect(
      (await http(h, admin.accessToken).get('/admin/reviews?status=FLAGGED'))
        .body.total,
    ).toBe(1);
    expect(
      (
        await http(h, admin.accessToken).patch(
          `/admin/reviews/${review.id}/moderate`,
          { decision: 'REJECT' },
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await http(h, admin.accessToken).patch(
          `/admin/reviews/${review.id}/moderate`,
          { decision: 'APPROVE' },
        )
      ).status,
    ).toBe(200);
    const reanalyze = await http(h, admin.accessToken).post(
      `/admin/reviews/${review.id}/reanalyze`,
      {},
    );
    expect(reanalyze.status).toBe(202);
    expect(reanalyze.body).toMatchObject({ status: 'PENDING', queued: true });
    expect(
      await h.prisma.auditLog.count({ where: { entityId: review.id } }),
    ).toBe(2);
  });

  it('shows the rejection reason only to the Traveler who authored the review', async () => {
    const { admin, provider, traveler, review } = await setup(
      ReviewStatus.FLAGGED,
    );
    const reason = 'Nội dung có dấu hiệu spam.';

    const rejected = await http(h, admin.accessToken).patch(
      `/admin/reviews/${review.id}/moderate`,
      { decision: 'REJECT', note: reason },
    );
    expect(rejected.status).toBe(200);

    const mine = await http(h, traveler.accessToken).get('/reviews/mine');
    expect(mine.body[0]).toMatchObject({
      id: review.id,
      status: 'REJECTED',
      rejectionReason: reason,
    });
    expect(mine.body[0]).not.toHaveProperty('moderationNote');

    expect(
      (await http(h).get(`/listings/${review.listingId}/reviews`)).body,
    ).toEqual([]);
    expect(
      (await http(h, provider.accessToken).get('/reviews/received')).body,
    ).toEqual([]);
  });
});
