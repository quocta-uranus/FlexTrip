import { jest } from '@jest/globals';
import { BookingStatus, ReferralStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SystemConfigService } from '../../system-config/system-config.service';
import { ReferralsService, emailRoot } from '../referrals.service';

const CONFIG: Record<string, number> = {
  referral_referee_voucher_vnd: 20_000, referral_referrer_voucher_vnd: 10_000, referral_voucher_valid_days: 30, referral_monthly_cap: 2,
};
const config = { get: jest.fn(async (k: string) => CONFIG[k]) } as unknown as SystemConfigService;

describe('emailRoot', () => {
  it('collapses +tags and Gmail dots so one inbox cannot refer itself', () => {
    expect(emailRoot('Foo.Bar+promo@gmail.com')).toBe('foobar@gmail.com');
    expect(emailRoot('a.b@company.vn')).toBe('a.b@company.vn');
    expect(emailRoot('a.b+x@company.vn')).toBe('a.b@company.vn');
  });
});

describe('ReferralsService.attachSafe', () => {
  function setup(referrer: Record<string, unknown> | null, referee: Record<string, unknown>) {
    const prisma = {
      user: {
        findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(referrer),
        findUniqueOrThrow: jest.fn<() => Promise<unknown>>().mockResolvedValue(referee),
      },
      referral: { create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
    };
    return { prisma, service: new ReferralsService(prisma as unknown as PrismaService, config) };
  }
  const created = (p: ReturnType<typeof setup>['prisma']) =>
    (p.referral.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }] | undefined)?.[0].data;

  it('records a normal referral as REGISTERED and normalizes the code', async () => {
    const { prisma, service } = setup({ id: 'r1', status: 'ACTIVE', email: 'a@x.com', phone: '0900000001' }, { id: 'u2', email: 'b@y.com', phone: '0900000002' });
    await service.attachSafe('u2', ' ab12cd34 ');
    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { referralCode: 'AB12CD34' } }));
    expect(created(prisma)).toMatchObject({ referrerId: 'r1', refereeId: 'u2', status: 'REGISTERED', rejectReason: null });
  });

  it('ignores an unknown or inactive referrer without failing registration', async () => {
    const a = setup(null, { id: 'u2', email: 'b@y.com' });
    await expect(a.service.attachSafe('u2', 'NOPE')).resolves.toBeUndefined();
    expect(a.prisma.referral.create).not.toHaveBeenCalled();
    const b = setup({ id: 'r1', status: 'SUSPENDED', email: 'a@x.com' }, { id: 'u2', email: 'b@y.com' });
    await b.service.attachSafe('u2', 'CODE');
    expect(b.prisma.referral.create).not.toHaveBeenCalled();
  });

  it('does nothing when no code is given', async () => {
    const { prisma, service } = setup(null, { id: 'u2', email: 'b@y.com' });
    await service.attachSafe('u2', undefined);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['same phone', { id: 'r1', status: 'ACTIVE', email: 'a@x.com', phone: '0900' }, { id: 'u2', email: 'b@y.com', phone: '0900' }, 'SAME_PHONE'],
    ['same mailbox', { id: 'r1', status: 'ACTIVE', email: 'a.b@gmail.com', phone: null }, { id: 'u2', email: 'ab+2@gmail.com', phone: null }, 'SAME_EMAIL'],
    ['self', { id: 'u2', status: 'ACTIVE', email: 'a@x.com', phone: null }, { id: 'u2', email: 'b@y.com', phone: null }, 'SELF'],
  ])('marks %s as REJECTED so no reward is paid', async (_n, referrer, referee, reason) => {
    const { prisma, service } = setup(referrer, referee);
    await service.attachSafe('u2', 'CODE');
    expect(created(prisma)).toMatchObject({ status: 'REJECTED', rejectReason: reason });
  });

  it('swallows database errors', async () => {
    const { prisma, service } = setup({ id: 'r1', status: 'ACTIVE', email: 'a@x.com' }, { id: 'u2', email: 'b@y.com' });
    prisma.referral.create.mockRejectedValue(new Error('db down'));
    await expect(service.attachSafe('u2', 'CODE')).resolves.toBeUndefined();
  });
});

describe('ReferralsService.onBookingCompleted', () => {
  function setup(opts: { referral?: Record<string, unknown> | null; claimed?: number; rewardedThisMonth?: number; status?: BookingStatus } = {}) {
    const tx = {
      referral: {
        updateMany: jest.fn<() => Promise<{ count: number }>>().mockResolvedValue({ count: opts.claimed ?? 1 }),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(opts.rewardedThisMonth ?? 0),
        update: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
      },
      promoBudget: { upsert: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
      voucher: { create: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'v1', code: 'RF-X' }) },
      notification: { create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
    };
    const prisma = {
      booking: { findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({ travelerId: 'u2', status: opts.status ?? BookingStatus.COMPLETED }) },
      referral: {
        findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(
          opts.referral === undefined ? { id: 'ref1', referrerId: 'r1', status: ReferralStatus.REGISTERED } : opts.referral,
        ),
      },
      $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
    };
    return { tx, service: new ReferralsService(prisma as unknown as PrismaService, config) };
  }
  const lastUpdate = (tx: ReturnType<typeof setup>['tx']) =>
    (tx.referral.update.mock.calls.at(-1) as unknown as [{ data: Record<string, unknown> }])[0].data;

  it('rewards the referrer with a personal voucher on the first completed booking', async () => {
    const { tx, service } = setup();
    await service.onBookingCompleted('b1');
    const voucher = (tx.voucher.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(voucher).toMatchObject({ assignedUserId: 'r1', source: 'REFERRAL', value: 10_000, totalQuota: 1, budgetId: 'referral-reward' });
    expect(lastUpdate(tx)).toMatchObject({ status: 'REWARDED', referrerVoucherId: 'v1' });
    expect(tx.notification.create).toHaveBeenCalled();
  });

  it.each([
    ['booking not completed', { status: BookingStatus.IN_PROGRESS }],
    ['no referral', { referral: null }],
    ['already rewarded', { referral: { id: 'ref1', referrerId: 'r1', status: ReferralStatus.REWARDED } }],
    ['rejected for fraud', { referral: { id: 'ref1', referrerId: 'r1', status: ReferralStatus.REJECTED } }],
    ['another call claimed it first', { claimed: 0 }],
  ])('pays nothing when: %s', async (_n, opts) => {
    const { tx, service } = setup(opts);
    await service.onBookingCompleted('b1');
    expect(tx.voucher.create).not.toHaveBeenCalled();
  });

  it('stops at the monthly cap and flags the referral instead of rewarding', async () => {
    const { tx, service } = setup({ rewardedThisMonth: 2 });
    await service.onBookingCompleted('b1');
    expect(tx.voucher.create).not.toHaveBeenCalled();
    expect(lastUpdate(tx)).toMatchObject({ status: 'REJECTED', rejectReason: 'CAP_REACHED' });
  });

  it('safe variant never throws into the booking completion flow', async () => {
    const { service } = setup();
    jest.spyOn(service, 'onBookingCompleted').mockRejectedValue(new Error('boom'));
    await expect(service.onBookingCompletedSafe('b1')).resolves.toBeUndefined();
  });
});

describe('ReferralsService.onEmailVerifiedSafe', () => {
  function setup(opts: { referral?: Record<string, unknown> | null; claimed?: number } = {}) {
    const tx = {
      referral: {
        updateMany: jest.fn<() => Promise<{ count: number }>>().mockResolvedValue({ count: opts.claimed ?? 1 }),
        update: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
      },
      promoBudget: { upsert: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
      voucher: { create: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'v1', code: 'RF-X' }) },
      notification: { create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
    };
    const prisma = {
      referral: { findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(opts.referral === undefined ? { id: 'ref1', refereeVoucherId: null } : opts.referral) },
      $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
    };
    return { tx, service: new ReferralsService(prisma as unknown as PrismaService, config) };
  }

  it('gives the new user a welcome voucher after email verification', async () => {
    const { tx, service } = setup();
    await service.onEmailVerifiedSafe('u2');
    const voucher = (tx.voucher.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(voucher).toMatchObject({ assignedUserId: 'u2', value: 20_000, source: 'REFERRAL' });
  });

  it.each([
    ['no referral', { referral: null }],
    ['voucher already issued', { referral: { id: 'ref1', refereeVoucherId: 'v0' } }],
    ['issued concurrently by another call', { claimed: 0 }],
  ])('issues nothing when: %s', async (_n, opts) => {
    const { tx, service } = setup(opts);
    await service.onEmailVerifiedSafe('u2');
    expect(tx.voucher.create).not.toHaveBeenCalled();
  });
});
