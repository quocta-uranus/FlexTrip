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
import { ReviewModerationService } from '../review-moderation.service';
import {
  AUTHOR_DAILY_LIMIT,
  TARGET_HOURLY_LIMIT,
} from '../review-fraud-signals';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

describe('REVIEW lifecycle: deadline, edit, appeal, fraud signals, reminders', () => {
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

  async function world() {
    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const admin = await createUser(h, { roles: [Role.ADMIN] });
    await h.prisma.providerProfile.create({
      data: {
        userId: provider.id,
        shopName: 'Lifecycle Shop',
        ownerName: provider.name,
        category: ShopCategory.OTHER,
        pickupAddress: 'TP.HCM',
      },
    });
    const listing = await createListing(h, provider.id);
    return { provider, admin, listing };
  }

  async function completedBooking(
    travelerId: string,
    listingId: string,
    endedDaysAgo = 1,
  ) {
    return createBooking(h, {
      travelerId,
      listingId,
      startDate: daysAgo(endedDaysAgo + 2),
      endDate: daysAgo(endedDaysAgo),
    });
  }

  async function seedReview(
    w: Awaited<ReturnType<typeof world>>,
    o: {
      status?: ReviewStatus;
      comment?: string;
      authorId?: string;
      createdAt?: Date;
      moderatedAt?: Date | null;
      editedAt?: Date | null;
      appealedAt?: Date | null;
      withBooking?: boolean;
    } = {},
  ) {
    const traveler = o.authorId ? { id: o.authorId } : await createUser(h);
    const booking =
      o.withBooking === false
        ? null
        : await completedBooking(traveler.id, w.listing.id);
    const review = await h.prisma.review.create({
      data: {
        authorId: traveler.id,
        targetId: w.provider.id,
        listingId: w.listing.id,
        bookingId: booking?.id,
        rating: 5,
        comment: o.comment ?? `Dịch vụ rất tốt ${Math.random()}`,
        status: o.status ?? ReviewStatus.PUBLISHED,
        createdAt: o.createdAt,
        moderatedAt: o.moderatedAt,
        editedAt: o.editedAt,
        appealedAt: o.appealedAt,
      },
    });
    return { review };
  }

  const notifications = (userId: string) =>
    h.prisma.notification.findMany({ where: { userId, type: 'REVIEW' } });

  describe('review deadline', () => {
    it('rejects reviews after the window and honours the admin-configured window', async () => {
      const w = await world();
      const traveler = await createUser(h);
      const booking = await completedBooking(traveler.id, w.listing.id, 40);
      const body = {
        bookingId: booking.id,
        rating: 5,
        comment: 'Trải nghiệm rất tốt, sẽ quay lại.',
      };

      const late = await http(h, traveler.accessToken).post('/reviews', body);
      expect(late.status).toBe(409);
      expect(late.body.code).toBe('REVIEW_WINDOW_EXPIRED');

      await h.prisma.systemConfig.create({
        data: { key: 'review_window_days', value: 60 },
      });
      const ok = await http(h, traveler.accessToken).post('/reviews', body);
      expect(ok.status).toBe(201);
    });
  });

  describe('edit once', () => {
    it('keeps a clean edit public, queues a new AI check and updates the provider rating', async () => {
      const w = await world();
      const { review } = await seedReview(w);
      await h.prisma.providerProfile.update({
        where: { userId: w.provider.id },
        data: { ratingAvg: 5, reviewsCount: 1 },
      });
      const author = await loginAs(review.authorId);

      const res = await http(h, author).patch(`/reviews/${review.id}`, {
        rating: 4,
        comment: 'Sau khi dùng lâu hơn, tôi thấy dịch vụ ổn.',
      });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'PUBLISHED', rating: 4 });
      const stored = await h.prisma.review.findUniqueOrThrow({
        where: { id: review.id },
      });
      expect(stored.editedAt).not.toBeNull();
      expect(stored.moderatedAt).toBeNull();
      expect(stored.sentiment).toBe('UNKNOWN');
      const profile = await h.prisma.providerProfile.findUniqueOrThrow({
        where: { userId: w.provider.id },
      });
      expect(profile.reviewsCount).toBe(1);
      expect(Number(profile.ratingAvg)).toBe(4);
      expect(h.reviewQueue.add).toHaveBeenCalledWith(
        'analyze-review',
        { reviewId: review.id },
        expect.anything(),
      );
      expect(
        await h.prisma.auditLog.count({
          where: { entityId: review.id, action: 'REVIEW_EDITED' },
        }),
      ).toBe(1);
    });

    it('allows only one edit', async () => {
      const w = await world();
      const { review } = await seedReview(w);
      const author = await loginAs(review.authorId);
      const body = {
        rating: 4,
        comment: 'Nội dung đã được chỉnh sửa lần một.',
      };

      expect(
        (await http(h, author).patch(`/reviews/${review.id}`, body)).status,
      ).toBe(200);
      await h.prisma.review.update({
        where: { id: review.id },
        data: { status: 'PUBLISHED' },
      });
      const again = await http(h, author).patch(`/reviews/${review.id}`, body);
      expect(again.status).toBe(409);
      expect(again.body.code).toBe('REVIEW_ALREADY_EDITED');
    });

    it('blocks other users, pending reviews and edits after the window', async () => {
      const w = await world();
      const { review } = await seedReview(w);
      const author = await loginAs(review.authorId);
      const stranger = await createUser(h);
      const body = { rating: 3, comment: 'Nội dung chỉnh sửa hợp lệ của tôi.' };

      expect(
        (
          await http(h, stranger.accessToken).patch(
            `/reviews/${review.id}`,
            body,
          )
        ).status,
      ).toBe(403);

      await h.prisma.review.update({
        where: { id: review.id },
        data: { status: 'PENDING' },
      });
      const pending = await http(h, author).patch(
        `/reviews/${review.id}`,
        body,
      );
      expect(pending.body.code).toBe('REVIEW_NOT_EDITABLE');

      await h.prisma.review.update({
        where: { id: review.id },
        data: {
          status: 'PUBLISHED',
          createdAt: new Date(Date.now() - 49 * HOUR),
        },
      });
      const late = await http(h, author).patch(`/reviews/${review.id}`, body);
      expect(late.status).toBe(409);
      expect(late.body.code).toBe('REVIEW_EDIT_WINDOW_EXPIRED');
    });

    it('counts the edit window of a rejected review from the rejection time', async () => {
      const w = await world();
      const { review } = await seedReview(w, {
        status: 'REJECTED',
        createdAt: daysAgo(10),
        moderatedAt: new Date(),
      });
      const author = await loginAs(review.authorId);

      const res = await http(h, author).patch(`/reviews/${review.id}`, {
        rating: 4,
        comment: 'Tôi đã viết lại đánh giá cho lịch sự hơn.',
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PUBLISHED');
    });

    it('flags an edit that breaks the rules and tells the author', async () => {
      const w = await world();
      const { review } = await seedReview(w);
      const author = await loginAs(review.authorId);

      const res = await http(h, author).patch(`/reviews/${review.id}`, {
        rating: 1,
        comment: 'Shop này là đồ lừa đảo, đừng thuê.',
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('FLAGGED');
      expect(await notifications(review.authorId)).toHaveLength(1);
    });
  });

  describe('appeal a rejected review', () => {
    it('sends a rejected review back to the admin queue with the traveler reason', async () => {
      const w = await world();
      const { review } = await seedReview(w, {
        status: 'REJECTED',
        moderatedAt: new Date(),
      });
      const author = await loginAs(review.authorId);

      const res = await http(h, author).post(`/reviews/${review.id}/appeal`, {
        reason: 'Tôi đã thuê thật và đánh giá hoàn toàn đúng sự thật.',
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('FLAGGED');
      const list = await http(h, w.admin.accessToken).get(
        '/admin/reviews?status=FLAGGED',
      );
      expect(list.body.items[0]).toMatchObject({
        id: review.id,
        appealNote: 'Tôi đã thuê thật và đánh giá hoàn toàn đúng sự thật.',
      });
      expect(list.body.items[0].appealedAt).toBeTruthy();

      const approved = await http(h, w.admin.accessToken).patch(
        `/admin/reviews/${review.id}/moderate`,
        { decision: 'APPROVE' },
      );
      expect(approved.status).toBe(200);
      expect(approved.body.status).toBe('PUBLISHED');
    });

    it('allows one appeal, only for rejected reviews, only by the author and within 7 days', async () => {
      const w = await world();
      const reason = { reason: 'Đánh giá của tôi hoàn toàn trung thực.' };

      const published = await seedReview(w);
      const pubAuthor = await loginAs(published.review.authorId);
      expect(
        (
          await http(h, pubAuthor).post(
            `/reviews/${published.review.id}/appeal`,
            reason,
          )
        ).body.code,
      ).toBe('REVIEW_NOT_APPEALABLE');

      const appealed = await seedReview(w, {
        status: 'REJECTED',
        moderatedAt: new Date(),
        appealedAt: new Date(),
      });
      const apAuthor = await loginAs(appealed.review.authorId);
      expect(
        (
          await http(h, apAuthor).post(
            `/reviews/${appealed.review.id}/appeal`,
            reason,
          )
        ).body.code,
      ).toBe('REVIEW_ALREADY_APPEALED');

      const old = await seedReview(w, {
        status: 'REJECTED',
        moderatedAt: daysAgo(8),
      });
      const oldAuthor = await loginAs(old.review.authorId);
      expect(
        (
          await http(h, oldAuthor).post(
            `/reviews/${old.review.id}/appeal`,
            reason,
          )
        ).body.code,
      ).toBe('REVIEW_APPEAL_WINDOW_EXPIRED');

      const stranger = await createUser(h);
      const fresh = await seedReview(w, {
        status: 'REJECTED',
        moderatedAt: new Date(),
      });
      expect(
        (
          await http(h, stranger.accessToken).post(
            `/reviews/${fresh.review.id}/appeal`,
            reason,
          )
        ).status,
      ).toBe(403);
    });
  });

  describe('GET /reviews/mine action flags', () => {
    it('tells the client when a review can still be edited or appealed', async () => {
      const w = await world();
      const live = await seedReview(w);
      const author = await loginAs(live.review.authorId);
      const rejected = await seedReview(w, {
        authorId: live.review.authorId,
        status: 'REJECTED',
        moderatedAt: new Date(),
      });

      const mine = await http(h, author).get('/reviews/mine');
      const byId = Object.fromEntries(
        mine.body.map((r: { id: string }) => [r.id, r]),
      );
      expect(byId[live.review.id]).toMatchObject({
        canEdit: true,
        canAppeal: false,
      });
      expect(byId[rejected.review.id]).toMatchObject({
        canEdit: true,
        canAppeal: true,
      });

      await h.prisma.review.update({
        where: { id: live.review.id },
        data: { editedAt: new Date() },
      });
      const after = await http(h, author).get('/reviews/mine');
      expect(
        after.body.find((r: { id: string }) => r.id === live.review.id).canEdit,
      ).toBe(false);
    });
  });

  describe('fraud signals feed suspicionScore', () => {
    it('flags a long comment copied from another review', async () => {
      const w = await world();
      const text = 'Chủ shop giao xe đúng giờ, xe sạch sẽ và rất thân thiện.';
      await seedReview(w, { comment: text });
      const { review } = await seedReview(w, {
        status: 'PENDING',
        comment: text.toUpperCase(),
      });

      await moderation.analyze(review.id);

      const stored = await h.prisma.review.findUniqueOrThrow({
        where: { id: review.id },
      });
      expect(stored).toMatchObject({ status: 'FLAGGED', suspicionScore: 80 });
      expect(JSON.stringify(stored.analysisReasons)).toContain('trùng');
    });

    it('does not treat short generic comments as duplicates', async () => {
      const w = await world();
      await seedReview(w, { comment: 'Rất tốt, hài lòng.' });
      const { review } = await seedReview(w, {
        status: 'PENDING',
        comment: 'Rất tốt, hài lòng.',
      });

      await moderation.analyze(review.id);

      expect(
        (await h.prisma.review.findUniqueOrThrow({ where: { id: review.id } }))
          .status,
      ).toBe('PUBLISHED');
    });

    it('marks an account that floods reviews within 24 hours as suspicious but keeps the review public', async () => {
      const w = await world();
      const spammer = await createUser(h);
      let last = '';
      for (let i = 0; i < AUTHOR_DAILY_LIMIT; i += 1) {
        const { review } = await seedReview(w, {
          authorId: spammer.id,
          status: 'PENDING',
          comment: `Nhận xét số ${i} về chuyến thuê ở địa điểm khác nhau`,
        });
        last = review.id;
      }

      await moderation.analyze(last);

      const stored = await h.prisma.review.findUniqueOrThrow({
        where: { id: last },
      });
      expect(stored).toMatchObject({
        status: 'PUBLISHED',
        suspicionScore: 80,
      });
      expect(JSON.stringify(stored.analysisReasons)).toContain('24 giờ');
    });

    it('marks a provider that suddenly receives a burst of reviews as suspicious but keeps them public', async () => {
      const w = await world();
      let last = '';
      for (let i = 0; i < TARGET_HOURLY_LIMIT; i += 1) {
        const { review } = await seedReview(w, {
          status: 'PENDING',
          comment: `Khách khác nhau số ${i} nhận xét hoàn toàn riêng biệt`,
        });
        last = review.id;
      }

      await moderation.analyze(last);

      const stored = await h.prisma.review.findUniqueOrThrow({
        where: { id: last },
      });
      expect(stored).toMatchObject({
        status: 'PUBLISHED',
        suspicionScore: 80,
      });
      expect(JSON.stringify(stored.analysisReasons)).toContain(
        'thời gian ngắn',
      );
    });
  });

  describe('review reminders', () => {
    it('reminds once, only inside the review window and only when not yet reviewed', async () => {
      const w = await world();
      const traveler = await createUser(h);
      const due = await completedBooking(traveler.id, w.listing.id, 4);
      await completedBooking(traveler.id, w.listing.id, 1);
      await completedBooking(traveler.id, w.listing.id, 40);
      const reviewed = await completedBooking(traveler.id, w.listing.id, 5);
      await h.prisma.review.create({
        data: {
          authorId: traveler.id,
          targetId: w.provider.id,
          listingId: w.listing.id,
          bookingId: reviewed.id,
          rating: 5,
          comment: 'Đã đánh giá từ trước rồi nhé.',
          status: 'PUBLISHED',
        },
      });

      expect(await moderation.remindUnreviewedBookings()).toBe(1);
      expect(await moderation.remindUnreviewedBookings()).toBe(0);

      const sent = await notifications(traveler.id);
      expect(sent).toHaveLength(1);
      expect(sent[0].data).toMatchObject({ reminderFor: due.id });
    });
  });

  async function loginAs(userId: string): Promise<string> {
    const user = await h.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return h.jwt.signAsync(
      { sub: user.id, roles: [Role.TRAVELER] },
      { secret: process.env.JWT_ACCESS_SECRET },
    );
  }
});
