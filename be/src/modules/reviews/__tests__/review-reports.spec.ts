import { ReviewStatus, Role, ShopCategory } from '@prisma/client';
import {
  AuthHarness,
  resetDatabase,
} from '../../auth/__tests__/support/auth-harness';
import {
  createListing,
  createUser,
  http,
} from '../../admin/__tests__/support/admin-fixtures';
import { REVIEW_REPORT_DAILY_LIMIT } from '../review-moderation.constants';

describe('REVIEW-03 provider reports and response limits', () => {
  const h = new AuthHarness();

  beforeAll(() => h.open());
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
  });

  async function world() {
    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const otherProvider = await createUser(h, { roles: [Role.PROVIDER] });
    const admin = await createUser(h, { roles: [Role.ADMIN] });
    for (const owner of [provider, otherProvider]) {
      await h.prisma.providerProfile.create({
        data: {
          userId: owner.id,
          shopName: `Shop ${owner.id}`,
          ownerName: owner.name,
          category: ShopCategory.OTHER,
          pickupAddress: 'TP.HCM',
        },
      });
    }
    const listing = await createListing(h, provider.id);
    return { provider, otherProvider, admin, listing };
  }

  async function seedReview(
    w: Awaited<ReturnType<typeof world>>,
    status: ReviewStatus = ReviewStatus.PUBLISHED,
  ) {
    const traveler = await createUser(h);
    const review = await h.prisma.review.create({
      data: {
        authorId: traveler.id,
        targetId: w.provider.id,
        listingId: w.listing.id,
        rating: 1,
        comment: `Nhận xét riêng biệt số ${Math.random()}`,
        status,
      },
    });
    return { traveler, review };
  }

  const report = (token: string, id: string, body: object) =>
    http(h, token).post(`/reviews/${id}/report`, body);

  describe('provider reports a review', () => {
    it('stores one open report per provider and keeps the review public', async () => {
      const w = await world();
      const { review } = await seedReview(w);

      const res = await report(w.provider.accessToken, review.id, {
        reason: 'FAKE_REVIEW',
        details: 'Người này chưa từng thuê của shop.',
      });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ reason: 'FAKE_REVIEW', status: 'OPEN' });
      expect(
        (await h.prisma.review.findUniqueOrThrow({ where: { id: review.id } }))
          .status,
      ).toBe('PUBLISHED');
      expect(
        await h.prisma.auditLog.count({
          where: { entityId: review.id, action: 'REVIEW_REPORTED' },
        }),
      ).toBe(1);

      const again = await report(w.provider.accessToken, review.id, {
        reason: 'SPAM',
      });
      expect(again.status).toBe(409);
      expect(again.body.code).toBe('REVIEW_ALREADY_REPORTED');
    });

    it('validates input and who may report', async () => {
      const w = await world();
      const { review, traveler } = await seedReview(w);

      expect(
        (await report(w.provider.accessToken, review.id, { reason: 'OTHER' }))
          .status,
      ).toBe(400);
      expect(
        (await report(w.provider.accessToken, review.id, { reason: 'NOPE' }))
          .status,
      ).toBe(400);
      expect(
        (
          await report(w.otherProvider.accessToken, review.id, {
            reason: 'SPAM',
          })
        ).status,
      ).toBe(403);
      expect(
        (await report(traveler.accessToken, review.id, { reason: 'SPAM' }))
          .status,
      ).toBe(403);

      const hidden = await seedReview(w, ReviewStatus.FLAGGED);
      const notPublic = await report(w.provider.accessToken, hidden.review.id, {
        reason: 'SPAM',
      });
      expect(notPublic.status).toBe(409);
      expect(notPublic.body.code).toBe('REVIEW_NOT_REPORTABLE');
    });

    it('caps how many reports a provider can send per day', async () => {
      const w = await world();
      for (let i = 0; i < REVIEW_REPORT_DAILY_LIMIT; i += 1) {
        const { review } = await seedReview(w);
        expect(
          (await report(w.provider.accessToken, review.id, { reason: 'SPAM' }))
            .status,
        ).toBe(201);
      }
      const { review } = await seedReview(w);
      const over = await report(w.provider.accessToken, review.id, {
        reason: 'SPAM',
      });
      expect(over.status).toBe(409);
      expect(over.body.code).toBe('REPORT_LIMIT_REACHED');
    });

    it('shows the provider their own report state on received reviews', async () => {
      const w = await world();
      const reported = await seedReview(w);
      const clean = await seedReview(w);
      await report(w.provider.accessToken, reported.review.id, {
        reason: 'OFFENSIVE',
      });

      const list = await http(h, w.provider.accessToken).get(
        '/reviews/received',
      );
      const byId = Object.fromEntries(
        list.body.map((r: { id: string }) => [r.id, r]),
      );
      expect(byId[reported.review.id].myReport).toMatchObject({
        status: 'OPEN',
        reason: 'OFFENSIVE',
      });
      expect(byId[clean.review.id].myReport).toBeNull();
    });
  });

  describe('admin resolves reports', () => {
    it('lists reviews with open reports and supports the appealed filter', async () => {
      const w = await world();
      const reported = await seedReview(w);
      await seedReview(w);
      const appealed = await seedReview(w, ReviewStatus.FLAGGED);
      await h.prisma.review.update({
        where: { id: appealed.review.id },
        data: { appealedAt: new Date(), appealNote: 'Xin xem lại' },
      });
      await report(w.provider.accessToken, reported.review.id, {
        reason: 'SPAM',
        details: 'Nội dung quảng cáo',
      });

      const onlyReported = await http(h, w.admin.accessToken).get(
        '/admin/reviews?reported=true',
      );
      expect(onlyReported.body.items.map((r: { id: string }) => r.id)).toEqual([
        reported.review.id,
      ]);
      expect(onlyReported.body.items[0].openReports[0]).toMatchObject({
        reason: 'SPAM',
        details: 'Nội dung quảng cáo',
        reporter: { id: w.provider.id },
      });

      const onlyAppealed = await http(h, w.admin.accessToken).get(
        '/admin/reviews?appealed=true',
      );
      expect(onlyAppealed.body.items.map((r: { id: string }) => r.id)).toEqual([
        appealed.review.id,
      ]);
      expect(
        (
          await http(h, w.admin.accessToken).get(
            '/admin/reviews?appealed=false',
          )
        ).body.total,
      ).toBe(3);
    });

    it('upholds the report when the admin rejects the review and tells the provider', async () => {
      const w = await world();
      const { review } = await seedReview(w);
      await report(w.provider.accessToken, review.id, {
        reason: 'FAKE_REVIEW',
        details: 'Giả mạo',
      });

      const res = await http(h, w.admin.accessToken).patch(
        `/admin/reviews/${review.id}/moderate`,
        { decision: 'REJECT', note: 'Đánh giá giả mạo.' },
      );

      expect(res.status).toBe(200);
      const stored = await h.prisma.reviewReport.findFirstOrThrow({
        where: { reviewId: review.id },
      });
      expect(stored.status).toBe('UPHELD');
      expect(stored.resolvedById).toBe(w.admin.id);
      const note = await h.prisma.notification.findFirstOrThrow({
        where: { userId: w.provider.id, type: 'REVIEW' },
      });
      expect(note.title).toContain('được chấp nhận');
    });

    it('dismisses reports without touching the review', async () => {
      const w = await world();
      const { review } = await seedReview(w);
      await report(w.provider.accessToken, review.id, { reason: 'SPAM' });

      const res = await http(h, w.admin.accessToken).patch(
        `/admin/reviews/${review.id}/dismiss-reports`,
        { note: 'Nội dung hợp lệ, giữ nguyên.' },
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ dismissed: 1 });
      expect(
        (
          await h.prisma.reviewReport.findFirstOrThrow({
            where: { reviewId: review.id },
          })
        ).status,
      ).toBe('DISMISSED');
      expect(
        (await h.prisma.review.findUniqueOrThrow({ where: { id: review.id } }))
          .status,
      ).toBe('PUBLISHED');
      const note = await h.prisma.notification.findFirstOrThrow({
        where: { userId: w.provider.id, type: 'REVIEW' },
      });
      expect(note.body).toBe('Nội dung hợp lệ, giữ nguyên.');
      expect(
        await h.prisma.auditLog.count({
          where: { entityId: review.id, action: 'REVIEW_REPORTS_DISMISSED' },
        }),
      ).toBe(1);

      const none = await http(h, w.admin.accessToken).patch(
        `/admin/reviews/${review.id}/dismiss-reports`,
        {},
      );
      expect(none.status).toBe(409);
      expect(none.body.code).toBe('NO_OPEN_REPORTS');
    });

    it('lets only admins dismiss reports', async () => {
      const w = await world();
      const { review } = await seedReview(w);
      await report(w.provider.accessToken, review.id, { reason: 'SPAM' });
      expect(
        (
          await http(h, w.provider.accessToken).patch(
            `/admin/reviews/${review.id}/dismiss-reports`,
            {},
          )
        ).status,
      ).toBe(403);
    });
  });

  describe('provider response edit limit', () => {
    it('allows two edits after the first reply, then blocks', async () => {
      const w = await world();
      const { review } = await seedReview(w);
      const reply = (text: string) =>
        http(h, w.provider.accessToken).put(`/reviews/${review.id}/response`, {
          response: text,
        });

      expect((await reply('Cảm ơn bạn đã góp ý.')).status).toBe(200);
      expect(
        (await http(h, w.provider.accessToken).get('/reviews/received')).body[0]
          .responseEditsLeft,
      ).toBe(2);
      expect((await reply('Cảm ơn bạn, chúng tôi sẽ cải thiện.')).status).toBe(
        200,
      );
      expect((await reply('Chúng tôi xin lỗi vì sự bất tiện.')).status).toBe(
        200,
      );
      expect(
        (await http(h, w.provider.accessToken).get('/reviews/received')).body[0]
          .responseEditsLeft,
      ).toBe(0);

      const blocked = await reply('Một lần chỉnh sửa nữa.');
      expect(blocked.status).toBe(409);
      expect(blocked.body.code).toBe('RESPONSE_EDIT_LIMIT');
      expect(
        (await h.prisma.review.findUniqueOrThrow({ where: { id: review.id } }))
          .response,
      ).toBe('Chúng tôi xin lỗi vì sự bất tiện.');
    });
  });
});
