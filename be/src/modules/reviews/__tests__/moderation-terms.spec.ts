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
import { ModerationLexiconService } from '../moderation-lexicon.service';

const DAY = 86_400_000;

describe('REVIEW-03 admin-editable moderation dictionary', () => {
  const h = new AuthHarness();
  let lexicon: ModerationLexiconService;

  beforeAll(async () => {
    await h.open();
    lexicon = h.app.get(ModerationLexiconService);
  });
  afterAll(() => h.close());
  beforeEach(async () => {
    await resetDatabase(h.prisma);
    h.redis.clear();
    lexicon.invalidate();
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
    const admin = await createUser(h, { roles: [Role.ADMIN] });
    const traveler = await createUser(h);
    await h.prisma.providerProfile.create({
      data: {
        userId: provider.id,
        shopName: 'Dictionary Shop',
        ownerName: provider.name,
        category: ShopCategory.OTHER,
        pickupAddress: 'TP.HCM',
      },
    });
    const listing = await createListing(h, provider.id);
    return { provider, admin, traveler, listing };
  }

  async function publishedReview(w: Awaited<ReturnType<typeof world>>) {
    return h.prisma.review.create({
      data: {
        authorId: w.traveler.id,
        targetId: w.provider.id,
        listingId: w.listing.id,
        rating: 3,
        comment: 'Lều ổn nhưng hơi nặng.',
        status: ReviewStatus.PUBLISHED,
      },
    });
  }

  const respond = (token: string, reviewId: string, response: string) =>
    http(h, token).put(`/reviews/${reviewId}/response`, { response });

  it('is admin only', async () => {
    const w = await world();
    expect(
      (await http(h, w.traveler.accessToken).get('/admin/moderation-terms'))
        .status,
    ).toBe(403);
    expect(
      (
        await http(h, w.provider.accessToken).post('/admin/moderation-terms', {
          term: 'đồ xấu xa',
          category: 'INSULT',
        })
      ).status,
    ).toBe(403);
    const list = await http(h, w.admin.accessToken).get(
      '/admin/moderation-terms',
    );
    expect(list.status).toBe(200);
    expect(list.body.custom).toEqual([]);
    expect(list.body.builtIn.length).toBeGreaterThan(50);
  });

  describe('adding a term', () => {
    it('takes effect at once for provider replies and new reviews', async () => {
      const w = await world();
      const review = await publishedReview(w);
      const admin = http(h, w.admin.accessToken);
      const text = 'Cảm ơn bạn, nhưng cái đồ xấu hoắc này đừng thuê nữa.';

      expect(
        (await respond(w.provider.accessToken, review.id, text)).status,
      ).toBe(200);
      await h.prisma.review.update({
        where: { id: review.id },
        data: { response: null, respondedAt: null },
      });

      const added = await admin.post('/admin/moderation-terms', {
        term: '  Xấu Hoắc ',
        category: 'INSULT',
      });
      expect(added.status).toBe(201);
      expect(added.body.term).toBe('xấu hoắc');

      const blocked = await respond(w.provider.accessToken, review.id, text);
      expect(blocked.status).toBe(400);
      expect(blocked.body.code).toBe('RESPONSE_REJECTED');

      const booking = await createBooking(h, {
        travelerId: w.traveler.id,
        listingId: w.listing.id,
        startDate: new Date(Date.now() - 3 * DAY),
        endDate: new Date(Date.now() - DAY),
      });
      const created = await http(h, w.traveler.accessToken).post('/reviews', {
        bookingId: booking.id,
        rating: 2,
        comment: 'Lều xấu hoắc, không như hình quảng cáo.',
      });
      expect(created.status).toBe(201);
      expect(created.body.status).toBe('FLAGGED');

      const test = await admin.post('/admin/moderation-terms/test', {
        text: 'xấu hoắc',
      });
      expect(test.body).toMatchObject({ flagged: true });
      expect(
        await h.prisma.auditLog.count({
          where: { action: 'MODERATION_TERM_ADDED' },
        }),
      ).toBe(1);
    });

    it.each([
      ['ab', 'TERM_TOO_SHORT'],
      ['a;b c', 'TERM_INVALID_CHARACTERS'],
      ['đồ khốn', 'TERM_EXISTS'],
      ['túi ngủ', 'TERM_MATCHES_SAFE_PHRASE'],
      ['thang', 'TERM_MATCHES_SAFE_PHRASE'],
    ])('rejects "%s" with %s', async (term, code) => {
      const w = await world();
      const res = await http(h, w.admin.accessToken).post(
        '/admin/moderation-terms',
        { term, category: 'INSULT' },
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.code).toBe(code);
      expect(await h.prisma.moderationTerm.count()).toBe(0);
    });

    it('rejects a duplicate of an admin-added term', async () => {
      const w = await world();
      const admin = http(h, w.admin.accessToken);
      const body = { term: 'xấu hoắc', category: 'INSULT' };
      expect((await admin.post('/admin/moderation-terms', body)).status).toBe(
        201,
      );
      const again = await admin.post('/admin/moderation-terms', body);
      expect(again.status).toBe(409);
      expect(again.body.code).toBe('TERM_EXISTS');
    });
  });

  describe('removing a term', () => {
    it('stops filtering at once and logs the change', async () => {
      const w = await world();
      const admin = http(h, w.admin.accessToken);
      const added = await admin.post('/admin/moderation-terms', {
        term: 'xấu hoắc',
        category: 'INSULT',
      });

      expect(
        (await admin.post('/admin/moderation-terms/test', { text: 'xấu hoắc' }))
          .body.flagged,
      ).toBe(true);
      expect(
        (await admin.delete(`/admin/moderation-terms/${added.body.id}`)).status,
      ).toBe(200);
      expect(
        (await admin.post('/admin/moderation-terms/test', { text: 'xấu hoắc' }))
          .body.flagged,
      ).toBe(false);
      expect(
        (await admin.delete(`/admin/moderation-terms/${added.body.id}`)).status,
      ).toBe(404);
      expect(
        await h.prisma.auditLog.count({
          where: { action: 'MODERATION_TERM_REMOVED' },
        }),
      ).toBe(1);
    });
  });

  describe('switching a built-in term off', () => {
    const body = { term: 'đồ khốn', category: 'INSULT' };

    it('lets a wrongly caught phrase through and can switch it back on', async () => {
      const w = await world();
      const admin = http(h, w.admin.accessToken);
      const text = { text: 'Bạn đúng là đồ khốn' };

      expect(
        (await admin.post('/admin/moderation-terms/test', text)).body.flagged,
      ).toBe(true);

      const off = await admin.put('/admin/moderation-terms/built-in', {
        ...body,
        disabled: true,
      });
      expect(off.status).toBe(200);
      expect(
        (await admin.post('/admin/moderation-terms/test', text)).body.flagged,
      ).toBe(false);
      const list = await admin.get('/admin/moderation-terms');
      expect(
        list.body.builtIn.find((t: { term: string }) => t.term === 'đồ khốn'),
      ).toMatchObject({ disabled: true });
      expect(list.body.custom).toEqual([]);

      const readd = await admin.post('/admin/moderation-terms', {
        term: 'đồ khốn',
        category: 'INSULT',
      });
      expect(readd.status).toBe(409);
      expect(readd.body.code).toBe('TERM_BUILT_IN_DISABLED');

      expect(
        (
          await admin.put('/admin/moderation-terms/built-in', {
            ...body,
            disabled: false,
          })
        ).status,
      ).toBe(200);
      expect(
        (await admin.post('/admin/moderation-terms/test', text)).body.flagged,
      ).toBe(true);
      expect(await h.prisma.moderationTerm.count()).toBe(0);
      expect(
        await h.prisma.auditLog.count({
          where: {
            action: {
              in: ['MODERATION_TERM_DISABLED', 'MODERATION_TERM_ENABLED'],
            },
          },
        }),
      ).toBe(2);
    });

    it('is a no-op when the state does not change and rejects unknown terms', async () => {
      const w = await world();
      const admin = http(h, w.admin.accessToken);
      await admin.put('/admin/moderation-terms/built-in', {
        ...body,
        disabled: false,
      });
      expect(await h.prisma.auditLog.count()).toBe(0);
      const unknown = await admin.put('/admin/moderation-terms/built-in', {
        term: 'không có từ này',
        category: 'INSULT',
        disabled: true,
      });
      expect(unknown.status).toBe(404);
    });
  });

  it('picks up a change made by another instance after the refresh interval', async () => {
    const w = await world();
    const admin = http(h, w.admin.accessToken);
    expect(
      (await admin.post('/admin/moderation-terms/test', { text: 'xấu hoắc' }))
        .body.flagged,
    ).toBe(false);
    await h.prisma.moderationTerm.create({
      data: { term: 'xấu hoắc', category: 'INSULT' },
    });
    // Still cached: this instance has not been told.
    expect(
      (await admin.post('/admin/moderation-terms/test', { text: 'xấu hoắc' }))
        .body.flagged,
    ).toBe(false);
    // Age the cache past the refresh interval instead of waiting a minute.
    const cache = (lexicon as unknown as { cache: { loadedAt: number } | null })
      .cache;
    expect(cache).not.toBeNull();
    cache!.loadedAt -= 61_000;
    expect(
      (await admin.post('/admin/moderation-terms/test', { text: 'xấu hoắc' }))
        .body.flagged,
    ).toBe(true);
  });

  describe('values the frontend used to hard-code', () => {
    it('serves the review window and edit hours from system config', async () => {
      const w = await world();
      const read = () => http(h, w.traveler.accessToken).get('/reviews/policy');

      expect((await read()).body).toEqual({
        reviewWindowDays: 30,
        reviewEditHours: 48,
      });
      await h.prisma.systemConfig.create({
        data: { key: 'review_window_days', value: 60 },
      });
      expect((await read()).body.reviewWindowDays).toBe(60);
      expect((await http(h).get('/reviews/policy')).status).toBe(401);
    });

    it('marks suspicious public reviews using the configured threshold', async () => {
      const w = await world();
      const make = (suspicionScore: number, source: 'AI' | 'ADMIN') =>
        h.prisma.review.create({
          data: {
            authorId: w.traveler.id,
            targetId: w.provider.id,
            listingId: w.listing.id,
            rating: 5,
            comment: `Nhận xét ${suspicionScore}-${source}-${Math.random()}`,
            status: ReviewStatus.PUBLISHED,
            suspicionScore,
            moderationSource: source,
          },
        });
      const high = await make(80, 'AI');
      const low = await make(40, 'AI');
      const approved = await make(80, 'ADMIN');
      const admin = http(h, w.admin.accessToken);
      const flags = async () =>
        Object.fromEntries(
          (await admin.get('/admin/reviews')).body.items.map(
            (r: { id: string; suspiciousPublic: boolean }) => [
              r.id,
              r.suspiciousPublic,
            ],
          ),
        );

      expect(await flags()).toEqual({
        [high.id]: true,
        [low.id]: false,
        [approved.id]: false,
      });
      await h.prisma.systemConfig.create({
        data: { key: 'review_suspicion_threshold', value: 30 },
      });
      expect((await flags())[low.id]).toBe(true);
    });
  });
});
