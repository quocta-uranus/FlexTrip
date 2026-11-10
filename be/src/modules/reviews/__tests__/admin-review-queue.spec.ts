import {
  ReviewModerationSource,
  ReviewReportReason,
  ReviewStatus,
  Role,
  ShopCategory,
} from '@prisma/client';
import {
  AuthHarness,
  resetDatabase,
} from '../../auth/__tests__/support/auth-harness';
import {
  createListing,
  createUser,
  http,
} from '../../admin/__tests__/support/admin-fixtures';

const HOUR = 3_600_000;
const ago = (hours: number) => new Date(Date.now() - hours * HOUR);

describe('REVIEW-03 admin queue: SLA, summary and bulk moderation', () => {
  const h = new AuthHarness();

  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => {
    await resetDatabase(h.prisma);
    h.redis.clear();
  });

  async function world() {
    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const admin = await createUser(h, { roles: [Role.ADMIN] });
    const traveler = await createUser(h);
    await h.prisma.providerProfile.create({
      data: {
        userId: provider.id,
        shopName: 'Queue Shop',
        ownerName: provider.name,
        category: ShopCategory.OTHER,
        pickupAddress: 'TP.HCM',
      },
    });
    const listing = await createListing(h, provider.id);
    return { provider, admin, traveler, listing };
  }

  type World = Awaited<ReturnType<typeof world>>;

  const seed = (
    w: World,
    data: Partial<Parameters<typeof h.prisma.review.create>[0]['data']> = {},
  ) =>
    h.prisma.review.create({
      data: {
        authorId: w.traveler.id,
        targetId: w.provider.id,
        listingId: w.listing.id,
        rating: 4,
        comment: `Nhận xét riêng biệt ${Math.random()}`,
        status: ReviewStatus.FLAGGED,
        ...data,
      } as Parameters<typeof h.prisma.review.create>[0]['data'],
    });

  describe('SLA and summary', () => {
    async function mixedQueue(w: World) {
      const fresh = await seed(w, { moderatedAt: ago(1), createdAt: ago(2) });
      const stale = await seed(w, { moderatedAt: ago(30), createdAt: ago(31) });
      const appealedStale = await seed(w, {
        status: ReviewStatus.FLAGGED,
        moderatedAt: ago(40),
        appealedAt: ago(30),
        createdAt: ago(50),
      });
      const appealedRecently = await seed(w, {
        moderatedAt: ago(40),
        appealedAt: ago(1),
        createdAt: ago(50),
      });
      const suspicious = await seed(w, {
        status: ReviewStatus.PUBLISHED,
        suspicionScore: 80,
        moderationSource: ReviewModerationSource.AI,
      });
      const reported = await seed(w, { status: ReviewStatus.PUBLISHED });
      await h.prisma.reviewReport.create({
        data: {
          reviewId: reported.id,
          reporterId: w.provider.id,
          reason: ReviewReportReason.SPAM,
        },
      });
      return {
        fresh,
        stale,
        appealedStale,
        appealedRecently,
        suspicious,
        reported,
      };
    }

    it('counts each group with the same rule as its list filter', async () => {
      const w = await world();
      await mixedQueue(w);
      const admin = http(h, w.admin.accessToken);

      const summary = await admin.get('/admin/reviews/summary');
      expect(summary.status).toBe(200);
      expect(summary.body).toEqual({
        flagged: 4,
        overdue: 2,
        appealed: 2,
        reported: 1,
        suspicious: 1,
        slaHours: 24,
      });
      const listed = async (query: string) =>
        (await admin.get(`/admin/reviews?${query}`)).body.total;
      expect(await listed('status=FLAGGED')).toBe(summary.body.flagged);
      expect(await listed('overdue=true')).toBe(summary.body.overdue);
      expect(await listed('reported=true')).toBe(summary.body.reported);
      expect(await listed('suspicious=true')).toBe(summary.body.suspicious);
    });

    it('measures an appealed review from the appeal, not from when it was hidden', async () => {
      const w = await world();
      const q = await mixedQueue(w);
      const list = await http(h, w.admin.accessToken).get(
        '/admin/reviews?overdue=true',
      );
      const ids = list.body.items.map((r: { id: string }) => r.id);
      expect(ids.sort()).toEqual([q.stale.id, q.appealedStale.id].sort());
      expect(ids).not.toContain(q.appealedRecently.id);
      expect(ids).not.toContain(q.fresh.id);
    });

    it('marks overdue items and gives the due time', async () => {
      const w = await world();
      const q = await mixedQueue(w);
      const items = (
        await http(h, w.admin.accessToken).get('/admin/reviews?status=FLAGGED')
      ).body.items as {
        id: string;
        overdue: boolean;
        slaDueAt: string | null;
        waitingSince: string | null;
      }[];
      const byId = Object.fromEntries(items.map((r) => [r.id, r]));

      expect(byId[q.stale.id].overdue).toBe(true);
      expect(byId[q.fresh.id].overdue).toBe(false);
      expect(
        new Date(byId[q.fresh.id].slaDueAt!).getTime() -
          new Date(byId[q.fresh.id].waitingSince!).getTime(),
      ).toBe(24 * HOUR);

      const published = (
        await http(h, w.admin.accessToken).get('/admin/reviews?suspicious=true')
      ).body.items[0];
      expect(published).toMatchObject({
        overdue: false,
        slaDueAt: null,
        waitingSince: null,
      });
    });

    it('follows the configured SLA', async () => {
      const w = await world();
      await mixedQueue(w);
      await h.prisma.systemConfig.create({
        data: { key: 'review_sla_hours', value: 48 },
      });
      const summary = await http(h, w.admin.accessToken).get(
        '/admin/reviews/summary',
      );
      expect(summary.body).toMatchObject({ overdue: 0, slaHours: 48 });
    });

    it('lists the longest-waiting review first when sorted oldest', async () => {
      const w = await world();
      const q = await mixedQueue(w);
      const items = (
        await http(h, w.admin.accessToken).get(
          '/admin/reviews?status=FLAGGED&sort=oldest',
        )
      ).body.items as { id: string }[];
      expect(items[0].id).toBe(q.appealedStale.id);
      const newest = (
        await http(h, w.admin.accessToken).get(
          '/admin/reviews?status=FLAGGED&sort=newest',
        )
      ).body.items as { id: string }[];
      expect(newest[0].id).toBe(q.fresh.id);
      expect(
        (await http(h, w.admin.accessToken).get('/admin/reviews?sort=sideways'))
          .status,
      ).toBe(400);
    });
  });

  describe('bulk moderation', () => {
    const bulk = (token: string, body: object) =>
      http(h, token).post('/admin/reviews/bulk-moderate', body);

    it('approves many reviews at once, updates the rating and logs each one', async () => {
      const w = await world();
      const reviews = await Promise.all([seed(w), seed(w), seed(w)]);

      const res = await bulk(w.admin.accessToken, {
        ids: reviews.map((r) => r.id),
        decision: 'APPROVE',
      });

      expect(res.status).toBe(200);
      expect(res.body.failed).toEqual([]);
      expect(res.body.succeeded.sort()).toEqual(
        reviews.map((r) => r.id).sort(),
      );
      expect(
        await h.prisma.review.count({
          where: { status: ReviewStatus.PUBLISHED },
        }),
      ).toBe(3);
      expect(
        (
          await h.prisma.providerProfile.findUniqueOrThrow({
            where: { userId: w.provider.id },
          })
        ).reviewsCount,
      ).toBe(3);
      expect(
        await h.prisma.auditLog.count({ where: { action: 'REVIEW_APPROVED' } }),
      ).toBe(3);
    });

    it('rejects many with one note and tells each author', async () => {
      const w = await world();
      const other = await createUser(h);
      const a = await seed(w);
      const b = await seed(w, { authorId: other.id });

      const res = await bulk(w.admin.accessToken, {
        ids: [a.id, b.id],
        decision: 'REJECT',
        note: 'Nội dung vi phạm chính sách.',
      });

      expect(res.body.succeeded).toHaveLength(2);
      expect(
        await h.prisma.review.count({
          where: { status: ReviewStatus.REJECTED },
        }),
      ).toBe(2);
      for (const authorId of [w.traveler.id, other.id])
        expect(
          await h.prisma.notification.count({
            where: { userId: authorId, title: 'Đánh giá không được duyệt' },
          }),
        ).toBeGreaterThanOrEqual(1);
    });

    it('reports failures per review and still processes the rest', async () => {
      const w = await world();
      const ok = await seed(w);
      const rejected = await seed(w, { status: ReviewStatus.REJECTED });

      const res = await bulk(w.admin.accessToken, {
        ids: [ok.id, rejected.id, 'does-not-exist'],
        decision: 'APPROVE',
      });

      expect(res.status).toBe(200);
      expect(res.body.succeeded).toEqual([ok.id]);
      expect(res.body.failed).toEqual([
        expect.objectContaining({
          id: rejected.id,
          code: 'INVALID_REVIEW_TRANSITION',
        }),
        expect.objectContaining({ id: 'does-not-exist', code: 'ERROR' }),
      ]);
      expect(
        (
          await h.prisma.review.findUniqueOrThrow({
            where: { id: rejected.id },
          })
        ).status,
      ).toBe('REJECTED');
    });

    it('validates the request and allows only admins', async () => {
      const w = await world();
      const review = await seed(w);
      const admin = w.admin.accessToken;

      expect(
        (await bulk(admin, { ids: [review.id], decision: 'REJECT' })).status,
      ).toBe(400);
      expect((await bulk(admin, { ids: [], decision: 'APPROVE' })).status).toBe(
        400,
      );
      expect(
        (
          await bulk(admin, {
            ids: [review.id, review.id],
            decision: 'APPROVE',
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await bulk(admin, {
            ids: Array.from({ length: 51 }, (_, i) => `id-${i}`),
            decision: 'APPROVE',
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await bulk(w.traveler.accessToken, {
            ids: [review.id],
            decision: 'APPROVE',
          })
        ).status,
      ).toBe(403);
      expect(
        (await h.prisma.review.findUniqueOrThrow({ where: { id: review.id } }))
          .status,
      ).toBe('FLAGGED');
    });
  });
});
