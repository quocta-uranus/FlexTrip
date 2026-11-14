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
import {
  REVIEW_ABANDON_AFTER_MS,
  REVIEW_MANUAL_FALLBACK_REASON,
  REVIEW_STALE_AFTER_MS,
} from '../review-moderation.constants';

describe('REVIEW-03 moderation hardening', () => {
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
    h.reviewAnalyzer.analyze.mockReset().mockResolvedValue({
      sentiment: 'POSITIVE',
      spamScore: 0,
      toxicityScore: 0,
      suspicionScore: 0,
      reasons: [],
    });
    h.reviewQueue.getJob.mockReset().mockResolvedValue(undefined);
    h.reviewQueue.add.mockClear();
  });

  async function setup(status: ReviewStatus = ReviewStatus.PENDING) {
    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const traveler = await createUser(h);
    await h.prisma.providerProfile.create({
      data: {
        userId: provider.id,
        shopName: 'Hardening Shop',
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
        comment: 'Dịch vụ tốt, chủ shop hỗ trợ nhiệt tình.',
        status,
      },
    });
    return { provider, traveler, review };
  }

  const ageReview = (id: string, ms: number) =>
    h.prisma
      .$executeRaw`UPDATE "Review" SET "updatedAt" = ${new Date(Date.now() - ms)} WHERE "id" = ${id}`;

  const notificationsFor = (userId: string) =>
    h.prisma.notification.findMany({ where: { userId, type: 'REVIEW' } });

  describe('manual fallback when AI is unavailable', () => {
    it('escalates a PENDING review to FLAGGED, notifies the author once, and is idempotent', async () => {
      const { traveler, review } = await setup();

      expect(await moderation.escalateToManual(review.id)).toBe(true);
      expect(await moderation.escalateToManual(review.id)).toBe(true);

      const stored = await h.prisma.review.findUniqueOrThrow({
        where: { id: review.id },
      });
      expect(stored).toMatchObject({
        status: 'FLAGGED',
        moderationNote: REVIEW_MANUAL_FALLBACK_REASON,
      });
      expect(await notificationsFor(traveler.id)).toHaveLength(1);
    });

    it('never touches a review that is already decided', async () => {
      const { review } = await setup(ReviewStatus.PUBLISHED);
      await h.prisma.review.update({
        where: { id: review.id },
        data: { moderatedAt: new Date() },
      });
      expect(await moderation.escalateToManual(review.id)).toBe(false);
      expect(
        (
          await h.prisma.review.findUniqueOrThrow({
            where: { id: review.id },
          })
        ).status,
      ).toBe('PUBLISHED');
    });

    it('fails open for a public review still waiting for its AI check', async () => {
      const { traveler, review } = await setup(ReviewStatus.PUBLISHED);

      expect(await moderation.escalateToManual(review.id)).toBe(true);
      expect(await moderation.escalateToManual(review.id)).toBe(false);

      const stored = await h.prisma.review.findUniqueOrThrow({
        where: { id: review.id },
      });
      expect(stored.status).toBe('PUBLISHED');
      expect(stored.moderatedAt).not.toBeNull();
      expect(stored.moderationNote).toBe(REVIEW_MANUAL_FALLBACK_REASON);
      expect(await notificationsFor(traveler.id)).toHaveLength(0);
    });

    it('notifies the author when AI succeeds but flags the review', async () => {
      const { traveler, review } = await setup();
      h.reviewAnalyzer.analyze.mockResolvedValue({
        sentiment: 'NEGATIVE',
        spamScore: 0,
        toxicityScore: 95,
        suspicionScore: 0,
        reasons: ['Nội dung xúc phạm'],
      });

      await moderation.analyze(review.id);

      expect(
        (await h.prisma.review.findUniqueOrThrow({ where: { id: review.id } }))
          .status,
      ).toBe('FLAGGED');
      expect(await notificationsFor(traveler.id)).toHaveLength(1);
    });
  });

  describe('pending review sweeper', () => {
    it('ignores recent reviews and reviews whose job is still in flight', async () => {
      const { review } = await setup();
      const fresh = await moderation.sweepStalePending();
      expect(fresh).toEqual({ requeued: 0, escalated: 0, skipped: 0 });

      await ageReview(review.id, REVIEW_STALE_AFTER_MS + 60_000);
      h.reviewQueue.getJob.mockResolvedValue({
        getState: async () => 'active',
        attemptsMade: 0,
      } as never);
      const inFlight = await moderation.sweepStalePending();
      expect(inFlight).toEqual({ requeued: 0, escalated: 0, skipped: 1 });
      expect(h.reviewQueue.add).not.toHaveBeenCalled();
    });

    it('escalates a review whose job has been stuck in the queue for over an hour', async () => {
      const { review } = await setup();
      await ageReview(review.id, REVIEW_ABANDON_AFTER_MS + 60_000);
      h.reviewQueue.getJob.mockResolvedValue({
        getState: async () => 'waiting',
        attemptsMade: 0,
      } as never);

      expect(await moderation.sweepStalePending()).toEqual({
        requeued: 0,
        escalated: 1,
        skipped: 0,
      });
    });

    it('re-enqueues a stale review that has no job (e.g. enqueue failed)', async () => {
      const { review } = await setup();
      await ageReview(review.id, REVIEW_STALE_AFTER_MS + 60_000);

      const result = await moderation.sweepStalePending();

      expect(result).toEqual({ requeued: 1, escalated: 0, skipped: 0 });
      expect(h.reviewQueue.add).toHaveBeenCalledWith(
        'analyze-review',
        { reviewId: review.id },
        expect.objectContaining({ jobId: `review-${review.id}` }),
      );
    });

    it('escalates a review abandoned for too long to manual moderation', async () => {
      const { review } = await setup();
      await ageReview(review.id, REVIEW_ABANDON_AFTER_MS + 60_000);

      const result = await moderation.sweepStalePending();

      expect(result).toEqual({ requeued: 0, escalated: 1, skipped: 0 });
      expect(
        (await h.prisma.review.findUniqueOrThrow({ where: { id: review.id } }))
          .status,
      ).toBe('FLAGGED');
    });

    it('re-enqueues a public review whose AI check never ran, and keeps it public if abandoned', async () => {
      const { review } = await setup(ReviewStatus.PUBLISHED);
      await ageReview(review.id, REVIEW_STALE_AFTER_MS + 60_000);

      expect(await moderation.sweepStalePending()).toEqual({
        requeued: 1,
        escalated: 0,
        skipped: 0,
      });

      await ageReview(review.id, REVIEW_ABANDON_AFTER_MS + 60_000);
      expect(await moderation.sweepStalePending()).toEqual({
        requeued: 0,
        escalated: 1,
        skipped: 0,
      });
      expect(
        (await h.prisma.review.findUniqueOrThrow({ where: { id: review.id } }))
          .status,
      ).toBe('PUBLISHED');
      expect(await moderation.sweepStalePending()).toEqual({
        requeued: 0,
        escalated: 0,
        skipped: 0,
      });
    });

    it('escalates when the job already failed all attempts', async () => {
      const { review } = await setup();
      await ageReview(review.id, REVIEW_STALE_AFTER_MS + 60_000);
      h.reviewQueue.getJob.mockResolvedValue({
        getState: async () => 'failed',
        attemptsMade: 3,
        failedReason: 'TIMEOUT',
      } as never);

      expect(await moderation.sweepStalePending()).toMatchObject({
        escalated: 1,
      });
    });
  });

  describe('queue status lookup', () => {
    it('reads each review job by id instead of scanning the whole queue', async () => {
      h.reviewQueue.getJob.mockImplementation(((id: string) =>
        Promise.resolve(
          id === 'review-a'
            ? {
                getState: async () => 'delayed',
                attemptsMade: 1,
                failedReason: 'TIMEOUT',
              }
            : undefined,
        )) as never);

      const statuses = await moderation.getQueueStatuses(['a', 'b']);

      expect(statuses.a).toEqual({ status: 'RETRYING', errorCode: 'TIMEOUT' });
      expect(statuses.b).toEqual({ status: 'NOT_QUEUED', errorCode: null });
    });

    it('re-queues by replacing a finished job that holds the same id', async () => {
      const remove = jest.fn(async () => undefined);
      h.reviewQueue.getJob.mockResolvedValue({
        getState: async () => 'failed',
        remove,
      } as never);

      expect(await moderation.enqueue('r1')).toBe(true);
      expect(remove).toHaveBeenCalled();
      expect(h.reviewQueue.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('flagged-on-submit notification', () => {
    it('tells the traveler right away when the rules flag their review', async () => {
      const { provider, traveler } = await setup();
      const booking = await createBooking(h, {
        travelerId: traveler.id,
        listingId: (await h.prisma.listing.findFirstOrThrow()).id,
        startDate: new Date(Date.now() - 3 * 86_400_000),
        endDate: new Date(Date.now() - 86_400_000),
      });

      const res = await http(h, traveler.accessToken).post('/reviews', {
        bookingId: booking.id,
        rating: 1,
        comment: 'Shop này là đồ lừa đảo, đừng thuê.',
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('FLAGGED');
      expect(await notificationsFor(traveler.id)).toHaveLength(1);
      expect(provider.id).toBeDefined();
    });
  });

  describe('provider response screening', () => {
    async function published() {
      const ctx = await setup(ReviewStatus.PUBLISHED);
      return ctx;
    }
    const respond = (token: string, id: string, response: string) =>
      http(h, token).put(`/reviews/${id}/response`, { response });

    it('rejects abusive replies by rule without calling AI or saving anything', async () => {
      const { provider, review } = await published();

      const res = await respond(
        provider.accessToken,
        review.id,
        'Khách này là thằng ngu, đừng tin.',
      );

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('RESPONSE_REJECTED');
      expect(h.reviewAnalyzer.analyze).not.toHaveBeenCalled();
      expect(
        (await h.prisma.review.findUniqueOrThrow({ where: { id: review.id } }))
          .response,
      ).toBeNull();
    });

    it('rejects replies the AI scores above the toxicity threshold', async () => {
      const { provider, review } = await published();
      h.reviewAnalyzer.analyze.mockResolvedValue({
        sentiment: 'NEGATIVE',
        spamScore: 0,
        toxicityScore: 90,
        suspicionScore: 0,
        reasons: [],
      });

      const res = await respond(
        provider.accessToken,
        review.id,
        'Bạn nên biết xấu hổ vì đã viết như vậy.',
      );

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('RESPONSE_REJECTED');
    });

    it('accepts a polite reply', async () => {
      const { provider, review } = await published();
      const res = await respond(
        provider.accessToken,
        review.id,
        'Cảm ơn bạn đã tin tưởng, hẹn gặp lại!',
      );
      expect(res.status).toBe(200);
      expect(res.body.response).toContain('Cảm ơn');
    });

    it('fails open when the AI is unavailable but the rules pass', async () => {
      const { provider, review } = await published();
      h.reviewAnalyzer.analyze.mockRejectedValue(new Error('GROQ_UNAVAILABLE'));

      const res = await respond(
        provider.accessToken,
        review.id,
        'Cảm ơn bạn đã góp ý, chúng tôi sẽ cải thiện.',
      );

      expect(res.status).toBe(200);
    });
  });
});
