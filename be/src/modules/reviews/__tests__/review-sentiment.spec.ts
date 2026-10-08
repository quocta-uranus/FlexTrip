import { ReviewSentiment, ReviewStatus, Role } from '@prisma/client';
import {
  AuthHarness,
  resetDatabase,
} from '../../auth/__tests__/support/auth-harness';
import {
  createAdmin,
  createUser,
  http,
} from '../../admin/__tests__/support/admin-fixtures';

describe('REVIEW-04 sentiment dashboard', () => {
  const h = new AuthHarness();

  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => {
    await resetDatabase(h.prisma);
    h.redis.clear();
  });

  async function setup() {
    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const otherProvider = await createUser(h, { roles: [Role.PROVIDER] });
    const traveler = await createUser(h);
    const admin = await createAdmin(h);
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    await h.prisma.review.createMany({
      data: [
        {
          authorId: traveler.id,
          targetId: provider.id,
          rating: 5,
          comment: 'Tốt',
          status: ReviewStatus.PUBLISHED,
          sentiment: ReviewSentiment.POSITIVE,
          createdAt: recent,
        },
        {
          authorId: traveler.id,
          targetId: provider.id,
          rating: 4,
          comment: 'Ổn',
          status: ReviewStatus.PUBLISHED,
          sentiment: ReviewSentiment.NEUTRAL,
          createdAt: recent,
        },
        {
          authorId: traveler.id,
          targetId: provider.id,
          rating: 3,
          comment: 'Review cũ',
          status: ReviewStatus.PUBLISHED,
          sentiment: ReviewSentiment.UNKNOWN,
          createdAt: recent,
        },
        {
          authorId: traveler.id,
          targetId: provider.id,
          rating: 1,
          comment: 'Đã loại',
          status: ReviewStatus.REJECTED,
          sentiment: ReviewSentiment.NEGATIVE,
          createdAt: recent,
        },
        {
          authorId: traveler.id,
          targetId: otherProvider.id,
          rating: 1,
          comment: 'Provider khác',
          status: ReviewStatus.PUBLISHED,
          sentiment: ReviewSentiment.NEGATIVE,
          createdAt: recent,
        },
      ],
    });
    return { provider, otherProvider, traveler, admin };
  }

  it('returns only published reviews for the current provider and reports unknown separately', async () => {
    const { provider } = await setup();
    const result = await http(h, provider.accessToken).get(
      '/reviews/sentiment?range=30',
    );

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      provider: { id: provider.id },
      rangeDays: 30,
      granularity: 'DAY',
      totalReviews: 3,
      analyzedReviews: 2,
      unknownReviews: 1,
      sentiment: {
        positive: { count: 1, percentage: 50 },
        neutral: { count: 1, percentage: 50 },
        negative: { count: 0, percentage: 0 },
      },
    });
    expect(result.body.trend).toHaveLength(1);
  });

  it('supports weekly/monthly grouping and validates the requested range', async () => {
    const { provider } = await setup();
    expect(
      (await http(h, provider.accessToken).get('/reviews/sentiment?range=90'))
        .body.granularity,
    ).toBe('WEEK');
    expect(
      (await http(h, provider.accessToken).get('/reviews/sentiment?range=365'))
        .body.granularity,
    ).toBe('MONTH');
    expect(
      (await http(h, provider.accessToken).get('/reviews/sentiment?range=7'))
        .status,
    ).toBe(400);
  });

  it('lets Admin select a Provider without exposing another Provider to a Provider account', async () => {
    const { provider, otherProvider, admin } = await setup();
    const adminResult = await http(h, admin.accessToken).get(
      `/reviews/sentiment?range=30&providerId=${provider.id}`,
    );
    expect(adminResult.status).toBe(200);
    expect(adminResult.body.provider.id).toBe(provider.id);
    expect(
      (await http(h, admin.accessToken).get('/reviews/sentiment?range=30')).body
        .code,
    ).toBe('PROVIDER_ID_REQUIRED');

    const providerResult = await http(h, provider.accessToken).get(
      `/reviews/sentiment?range=30&providerId=${otherProvider.id}`,
    );
    expect(providerResult.body.provider.id).toBe(provider.id);
  });

  it('rejects Traveler access', async () => {
    const { traveler } = await setup();
    expect(
      (await http(h, traveler.accessToken).get('/reviews/sentiment?range=30'))
        .status,
    ).toBe(403);
  });
});
