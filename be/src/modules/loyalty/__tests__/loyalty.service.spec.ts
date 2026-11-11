import { jest } from '@jest/globals';
import { BookingStatus, LoyaltyTxType, Prisma, VoucherType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SystemConfigService } from '../../system-config/system-config.service';
import { LoyaltyService } from '../loyalty.service';

const D = (n: number) => new Prisma.Decimal(n);

function earnSetup(opts: { status?: BookingStatus; duplicate?: boolean; createError?: Error } = {}) {
  const tx = {
    loyaltyTransaction: {
      findFirst: jest.fn<() => Promise<unknown>>().mockResolvedValue(opts.duplicate ? { id: 'x' } : null),
      create: opts.createError
        ? jest.fn<() => Promise<unknown>>().mockRejectedValue(opts.createError)
        : jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
    },
    loyaltyAccount: { upsert: jest.fn<() => Promise<unknown>>().mockResolvedValue({ balance: 3 }) },
    notification: { create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
  };
  const prisma = {
    booking: { findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({ travelerId: 'u1', status: opts.status ?? BookingStatus.COMPLETED }) },
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  };
  const config = { get: jest.fn<() => Promise<number>>().mockResolvedValue(2) };
  return { tx, service: new LoyaltyService(prisma as unknown as PrismaService, config as unknown as SystemConfigService) };
}

describe('LoyaltyService.earnForBooking', () => {
  it('adds the configured points once for a completed booking', async () => {
    const { tx, service } = earnSetup();
    await expect(service.earnForBooking('b1')).resolves.toBe(2);
    expect(tx.loyaltyAccount.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { balance: { increment: 2 }, lifetimePoints: { increment: 2 } } }));
    expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: LoyaltyTxType.EARN, points: 2, balanceAfter: 3, refType: 'booking', refId: 'b1', expiresAt: expect.any(Date) }),
    }));
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the booking is not completed', async () => {
    const { tx, service } = earnSetup({ status: BookingStatus.IN_PROGRESS });
    await expect(service.earnForBooking('b1')).resolves.toBe(0);
    expect(tx.loyaltyAccount.upsert).not.toHaveBeenCalled();
  });

  it('does not add points twice for the same booking', async () => {
    const { tx, service } = earnSetup({ duplicate: true });
    await expect(service.earnForBooking('b1')).resolves.toBe(0);
    expect(tx.loyaltyAccount.upsert).not.toHaveBeenCalled();
  });

  it('treats a concurrent duplicate (unique violation) as already earned', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' });
    const { service } = earnSetup({ createError: err });
    await expect(service.earnForBooking('b1')).resolves.toBe(0);
  });

  it('safe variant swallows failures so completing a booking is never blocked', async () => {
    const { service } = earnSetup({ createError: new Error('db down') });
    await expect(service.earnForBookingSafe('b1')).resolves.toBeUndefined();
  });
});

describe('LoyaltyService.redeem', () => {
  function redeemSetup(over: { reward?: unknown; budget?: unknown; updated?: number } = {}) {
    const reward = over.reward === undefined
      ? { id: 'r1', name: 'Voucher 20k', pointsCost: 10, isActive: true, voucherType: VoucherType.FIXED, voucherValue: D(20_000), maxDiscount: null, validDays: 30 }
      : over.reward;
    const tx = {
      loyaltyReward: { findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(reward) },
      promoBudget: {
        upsert: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
        findUniqueOrThrow: jest.fn<() => Promise<unknown>>().mockResolvedValue(
          over.budget ?? { isActive: true, totalAmount: D(1_000_000), spentAmount: D(0), reservedAmount: D(0) },
        ),
      },
      $queryRaw: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      loyaltyAccount: {
        updateMany: jest.fn<() => Promise<{ count: number }>>().mockResolvedValue({ count: over.updated ?? 1 }),
        findUniqueOrThrow: jest.fn<() => Promise<unknown>>().mockResolvedValue({ balance: 5 }),
      },
      voucher: { create: jest.fn<(a: unknown) => Promise<unknown>>().mockImplementation(async () => ({ id: 'v1', code: 'LP-ABC', name: 'Voucher 20k', endsAt: new Date() })) },
      loyaltyTransaction: { create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
    };
    const prisma = { $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) };
    return { tx, service: new LoyaltyService(prisma as unknown as PrismaService, {} as SystemConfigService) };
  }

  it('turns points into a personal single-use voucher funded by the loyalty budget', async () => {
    const { tx, service } = redeemSetup();
    const result = await service.redeem('u1', 'r1');
    expect(result).toMatchObject({ balance: 5, voucher: { code: 'LP-ABC' } });
    expect(tx.loyaltyAccount.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1', balance: { gte: 10 } }, data: { balance: { decrement: 10 } } });
    const data = (tx.voucher.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(data).toMatchObject({ audience: 'PERSONAL', assignedUserId: 'u1', source: 'POINTS', totalQuota: 1, perUserLimit: 1, budgetId: 'loyalty-redeem' });
    expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'REDEEM', points: -10, balanceAfter: 5 }) }));
  });

  it('rejects when the user does not have enough points', async () => {
    const { tx, service } = redeemSetup({ updated: 0 });
    await expect(service.redeem('u1', 'r1')).rejects.toThrow('chưa đủ điểm');
    expect(tx.voucher.create).not.toHaveBeenCalled();
  });

  it('rejects when the loyalty budget cannot cover the voucher', async () => {
    const { tx, service } = redeemSetup({ budget: { isActive: true, totalAmount: D(10_000), spentAmount: D(0), reservedAmount: D(0) } });
    await expect(service.redeem('u1', 'r1')).rejects.toThrow('Quỹ đổi thưởng');
    expect(tx.loyaltyAccount.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an unknown or disabled reward', async () => {
    await expect(redeemSetup({ reward: null }).service.redeem('u1', 'r1')).rejects.toThrow('không tồn tại');
    await expect(redeemSetup({ reward: { isActive: false } }).service.redeem('u1', 'r1')).rejects.toThrow('không tồn tại');
  });
});
