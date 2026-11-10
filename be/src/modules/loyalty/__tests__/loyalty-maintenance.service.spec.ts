import { jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { LoyaltyMaintenanceService } from '../loyalty-maintenance.service';

function setup(opts: { earnedExpired: number; consumed: number; balance: number }) {
  const tx = {
    $queryRaw: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    loyaltyAccount: {
      findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({ balance: opts.balance }),
      update: jest.fn<(a: unknown) => Promise<unknown>>().mockImplementation(async () => ({ balance: 0 })),
    },
    loyaltyTransaction: {
      groupBy: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([{ type: 'REDEEM', _sum: { points: -opts.consumed } }]),
      create: jest.fn<(a: unknown) => Promise<unknown>>().mockResolvedValue({}),
    },
    notification: { create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
  };
  const prisma = {
    loyaltyTransaction: { groupBy: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([{ userId: 'u1', _sum: { points: opts.earnedExpired } }]) },
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  };
  return { tx, service: new LoyaltyMaintenanceService(prisma as unknown as PrismaService) };
}
const expiredPoints = (tx: ReturnType<typeof setup>['tx']) =>
  (tx.loyaltyTransaction.create.mock.calls[0] as unknown as [{ data: { points: number } }] | undefined)?.[0].data.points;

describe('LoyaltyMaintenanceService.expirePoints', () => {
  const now = new Date('2026-11-10T04:00:00Z');

  it('expires old points that were never spent', async () => {
    const { tx, service } = setup({ earnedExpired: 5, consumed: 0, balance: 8 });
    await expect(service.expirePoints(now)).resolves.toEqual({ usersExpired: 1, pointsExpired: 5 });
    expect(expiredPoints(tx)).toBe(-5);
  });

  it('counts spent points against the oldest points first, so redeemed points never expire twice', async () => {
    const { tx, service } = setup({ earnedExpired: 5, consumed: 5, balance: 3 });
    await expect(service.expirePoints(now)).resolves.toEqual({ usersExpired: 0, pointsExpired: 0 });
    expect(tx.loyaltyTransaction.create).not.toHaveBeenCalled();
  });

  it('only expires the unspent remainder', async () => {
    const { tx, service } = setup({ earnedExpired: 10, consumed: 7, balance: 6 });
    await service.expirePoints(now);
    expect(expiredPoints(tx)).toBe(-3);
  });

  it('never takes the balance below zero', async () => {
    const { tx, service } = setup({ earnedExpired: 10, consumed: 0, balance: 4 });
    await service.expirePoints(now);
    expect(expiredPoints(tx)).toBe(-4);
  });

  it('writes one EXPIRE row per day so a re-run is a no-op (unique violation is ignored)', async () => {
    const { tx, service } = setup({ earnedExpired: 5, consumed: 0, balance: 5 });
    tx.loyaltyTransaction.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
    await expect(service.expirePoints(now)).resolves.toEqual({ usersExpired: 0, pointsExpired: 0 });
    expect((tx.loyaltyTransaction.create.mock.calls[0] as unknown as [{ data: { refId: string } }])[0].data.refId).toBe('2026-11-10');
  });
});
