import { jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SystemConfigService } from '../../system-config/system-config.service';
import { ReputationService } from '../../reputation/reputation.service';
import { GroqJsonService } from '../../support/groq-json.service';
import { ProviderIncentivesService } from '../provider-incentives.service';

function setup(opts: { trusted?: boolean; stats?: 'great' | 'poor'; previous?: { isTopRated: boolean } | null; ai?: unknown } = {}) {
  const great = opts.stats !== 'poor';
  const prisma = {
    review: {
      aggregate: jest.fn<() => Promise<unknown>>().mockResolvedValue({ _avg: { rating: great ? 4.9 : 3 }, _count: { _all: great ? 40 : 6 } }),
      count: jest.fn<() => Promise<number>>().mockResolvedValue(great ? 38 : 1),
    },
    booking: { count: jest.fn<(a: { where: { status: string } }) => Promise<number>>().mockImplementation(async (a) => (a.where.status === 'COMPLETED' ? (great ? 60 : 8) : great ? 1 : 6)) },
    providerProfile: { findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({ cancellationStrikes: great ? 0 : 2, responseTimeH: great ? 2 : 30 }) },
    providerIncentive: {
      findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(opts.previous === undefined ? null : opts.previous),
      upsert: jest.fn<(a: unknown) => Promise<unknown>>().mockImplementation(async () => ({})),
    },
    notification: { create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
  };
  const config = { get: jest.fn(async (k: string) => ({ top_rated_min_score: 80, top_rated_fee_discount_pct: 2 })[k]) };
  const reputation = { getPublic: jest.fn<() => Promise<unknown>>().mockResolvedValue({ badges: opts.trusted === false ? [] : [{ code: 'TRUSTED_PROVIDER' }] }) };
  const groq = { complete: jest.fn<() => Promise<unknown>>().mockResolvedValue(opts.ai ?? null) };
  const service = new ProviderIncentivesService(
    prisma as unknown as PrismaService, config as unknown as SystemConfigService,
    reputation as unknown as ReputationService, groq as unknown as GroqJsonService,
  );
  const saved = () => (prisma.providerIncentive.upsert.mock.calls[0] as unknown as [{ create: Record<string, unknown> }])[0].create;
  return { prisma, groq, service, saved };
}

describe('ProviderIncentivesService.computeFor', () => {
  it('grants the configured fee discount to a trusted, high-scoring provider and notifies once', async () => {
    const { prisma, service, saved } = setup();
    await service.computeFor('p1');
    expect(saved()).toMatchObject({ isTopRated: true, feeDiscountPct: 2 });
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it('requires the Trusted Provider badge even when the score is high', async () => {
    const { service, saved } = setup({ trusted: false });
    await service.computeFor('p1');
    expect(saved()).toMatchObject({ isTopRated: false, feeDiscountPct: 0 });
  });

  it('removes the discount and tells the provider when the score drops', async () => {
    const { prisma, service, saved } = setup({ stats: 'poor', previous: { isTopRated: true } });
    await service.computeFor('p1');
    expect(saved()).toMatchObject({ isTopRated: false, feeDiscountPct: 0 });
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it('does not re-notify when the status did not change', async () => {
    const { prisma, service } = setup({ previous: { isTopRated: true } });
    await service.computeFor('p1');
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('expires the incentive about 48h out so a dead job cannot extend it forever', async () => {
    const { service, saved } = setup();
    await service.computeFor('p1');
    const hours = ((saved().validUntil as Date).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(47.9);
    expect(hours).toBeLessThanOrEqual(48);
  });

  it('uses the AI text only as the explanation and never to decide the outcome', async () => {
    const { service, saved } = setup({ stats: 'poor', ai: { summary: 'Bạn là top-rated tuyệt vời!' } });
    await service.computeFor('p1');
    expect(saved().isTopRated).toBe(false);
    expect(JSON.stringify(saved().reasons)).toContain('Bạn là top-rated tuyệt vời!');
  });

  it('falls back to the template explanation when AI is unavailable', async () => {
    const { service, saved } = setup({ stats: 'poor' });
    await service.computeFor('p1');
    expect(JSON.stringify(saved().reasons)).toContain('cần tối thiểu 80');
  });
});

describe('ProviderIncentivesService.mine', () => {
  it('reports no discount once validUntil has passed', async () => {
    const { prisma, service } = setup();
    prisma.providerIncentive.findUnique.mockResolvedValue({
      isTopRated: true, score: new Prisma.Decimal(90), feeDiscountPct: new Prisma.Decimal(2),
      validUntil: new Date(Date.now() - 1000), computedAt: new Date(), reasons: {},
    });
    await expect(service.mine('p1')).resolves.toMatchObject({ isTopRated: false, feeDiscountPct: 0 });
  });
});
