import { jest } from '@jest/globals';
import { CancelledBy, PaymentStatus, Prisma, RedemptionStatus, Role, VoucherAudience, VoucherStatus, VoucherType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { VouchersService } from '../vouchers.service';

const D = (n: number) => new Prisma.Decimal(n);
const HOUR = 3_600_000;

function voucher(over: Record<string, unknown> = {}) {
  return {
    id: 'v1', code: 'FLEX', name: 'Flex', type: VoucherType.FIXED, value: D(50_000), maxDiscount: null,
    minOrderValue: D(0), category: null, audience: VoucherAudience.ALL, assignedUserId: null,
    status: VoucherStatus.ACTIVE, startsAt: new Date(Date.now() - HOUR), endsAt: new Date(Date.now() + HOUR),
    totalQuota: null, usedCount: 0, perUserLimit: 1, budgetId: 'b1',
    budget: { isActive: true, totalAmount: D(1_000_000), spentAmount: D(0), reservedAmount: D(0) },
    ...over,
  };
}

function setup(v: ReturnType<typeof voucher> | null, opts: { roles?: Role[]; used?: number; bookings?: number } = {}) {
  const db = {
    voucher: { findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(v) },
    userRole: { findMany: jest.fn<() => Promise<unknown>>().mockResolvedValue((opts.roles ?? [Role.TRAVELER]).map((role) => ({ role }))) },
    voucherRedemption: { count: jest.fn<() => Promise<number>>().mockResolvedValue(opts.used ?? 0) },
    booking: { count: jest.fn<() => Promise<number>>().mockResolvedValue(opts.bookings ?? 0) },
  };
  return { db, service: new VouchersService(db as unknown as PrismaService) };
}

// totalPrice 1.000.000, cọc 20% => tiền thuê trả sau 800.000
const INPUT = { totalPrice: 1_000_000, depositAmount: 200_000, category: 'camping' };
const quote = (s: VouchersService, code = 'flex') => s.quote('u1', code, INPUT);
const code = (e: unknown) => (e as { response: { code: string } }).response.code;

describe('VouchersService.quote', () => {
  it('rejects an unknown code', async () => {
    await expect(quote(setup(null).service)).rejects.toMatchObject({ response: { code: 'VOUCHER_NOT_FOUND' } });
  });

  it('normalizes the code and returns a fixed discount', async () => {
    const { db, service } = setup(voucher());
    await expect(quote(service, '  flex ')).resolves.toMatchObject({ voucherId: 'v1', discountAmount: 50_000 });
    expect(db.voucher.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { code: 'FLEX' } }));
  });

  it('caps a percent voucher by maxDiscount', async () => {
    const { service } = setup(voucher({ type: VoucherType.PERCENT, value: D(10), maxDiscount: D(30_000) }));
    await expect(quote(service)).resolves.toMatchObject({ discountAmount: 30_000 });
  });

  it('never discounts more than the rental part, so the deposit is untouched', async () => {
    const { service } = setup(voucher({ value: D(900_000) }));
    await expect(quote(service)).resolves.toMatchObject({ discountAmount: 800_000 });
  });

  it('is capped by what is left of the promo budget', async () => {
    const { service } = setup(voucher({ budget: { isActive: true, totalAmount: D(100_000), spentAmount: D(70_000), reservedAmount: D(10_000) } }));
    await expect(quote(service)).resolves.toMatchObject({ discountAmount: 20_000 });
  });

  it.each([
    ['inactive', { status: VoucherStatus.PAUSED }, {}, 'VOUCHER_INACTIVE'],
    ['not started', { startsAt: new Date(Date.now() + HOUR) }, {}, 'VOUCHER_NOT_STARTED'],
    ['expired', { endsAt: new Date(Date.now() - 1000) }, {}, 'VOUCHER_EXPIRED'],
    ['personal for someone else', { audience: VoucherAudience.PERSONAL, assignedUserId: 'other' }, {}, 'VOUCHER_NOT_ELIGIBLE'],
    ['provider-only account', {}, { roles: [Role.PROVIDER] }, 'VOUCHER_NOT_ELIGIBLE'],
    ['new-user voucher for a returning user', { audience: VoucherAudience.NEW_USER }, { bookings: 2 }, 'VOUCHER_NOT_ELIGIBLE'],
    ['wrong category', { category: 'tech' }, {}, 'VOUCHER_CATEGORY_MISMATCH'],
    ['order below minimum', { minOrderValue: D(2_000_000) }, {}, 'VOUCHER_MIN_ORDER'],
    ['quota exhausted', { totalQuota: 5, usedCount: 5 }, {}, 'VOUCHER_QUOTA_EXHAUSTED'],
    ['per-user limit reached', {}, { used: 1 }, 'VOUCHER_USER_LIMIT'],
    ['budget exhausted', { budget: { isActive: true, totalAmount: D(100), spentAmount: D(100), reservedAmount: D(0) } }, {}, 'VOUCHER_BUDGET_EXHAUSTED'],
    ['budget switched off', { budget: { isActive: false, totalAmount: D(100), spentAmount: D(0), reservedAmount: D(0) } }, {}, 'VOUCHER_BUDGET_EXHAUSTED'],
  ])('rejects: %s', async (_name, over, opts, expected) => {
    const { service } = setup(voucher(over), opts);
    await expect(quote(service).catch((e: unknown) => code(e))).resolves.toBe(expected);
  });

  it('allows a new-user voucher for a user with no active bookings', async () => {
    const { service } = setup(voucher({ audience: VoucherAudience.NEW_USER }), { bookings: 0 });
    await expect(quote(service)).resolves.toMatchObject({ discountAmount: 50_000 });
  });
});

describe('VouchersService.onBookingCancelled', () => {
  function cancelSetup(redemptionStatus: RedemptionStatus, paymentStatus: PaymentStatus | null) {
    const tx = {
      $queryRaw: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      voucherRedemption: { updateMany: jest.fn<() => Promise<{ count: number }>>().mockResolvedValue({ count: 1 }) },
      voucher: { update: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
      promoBudget: { update: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
      promoBudgetTransaction: { create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
    };
    const prisma = {
      voucherRedemption: {
        findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({
          id: 'r1', voucherId: 'v1', status: redemptionStatus, discountAmount: D(50_000),
          voucher: { budgetId: 'b1' },
          booking: { payment: paymentStatus ? { status: paymentStatus } : null },
        }),
      },
      $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
    };
    return { tx, service: new VouchersService(prisma as unknown as PrismaService) };
  }
  const finalStatus = (tx: ReturnType<typeof cancelSetup>['tx']) =>
    (tx.voucherRedemption.updateMany.mock.calls[0] as unknown as [{ data: { status: string } }])[0].data.status;

  it('releases the voucher when the hold expires before any deposit', async () => {
    const { tx, service } = cancelSetup(RedemptionStatus.RESERVED, PaymentStatus.PENDING);
    await service.onBookingCancelled('b', CancelledBy.SYSTEM);
    expect(finalStatus(tx)).toBe('RELEASED');
    expect(tx.voucher.update).toHaveBeenCalledWith(expect.objectContaining({ data: { usedCount: { decrement: 1 } } }));
    expect(tx.promoBudget.update).toHaveBeenCalledWith(expect.objectContaining({ data: { reservedAmount: { decrement: 50_000 } } }));
  });

  it('forfeits the voucher when the traveler cancels after paying the deposit, but frees the budget', async () => {
    const { tx, service } = cancelSetup(RedemptionStatus.RESERVED, PaymentStatus.REFUNDED);
    await service.onBookingCancelled('b', CancelledBy.TRAVELER);
    expect(finalStatus(tx)).toBe('FORFEITED');
    expect(tx.voucher.update).not.toHaveBeenCalled();
    expect(tx.promoBudget.update).toHaveBeenCalledWith(expect.objectContaining({ data: { reservedAmount: { decrement: 50_000 } } }));
  });

  it('forfeits when the balance is never paid (system cancel after deposit)', async () => {
    const { tx, service } = cancelSetup(RedemptionStatus.RESERVED, PaymentStatus.PAID);
    await service.onBookingCancelled('b', CancelledBy.SYSTEM);
    expect(finalStatus(tx)).toBe('FORFEITED');
  });

  it('gives the voucher back when the provider declines, even after the deposit', async () => {
    const { tx, service } = cancelSetup(RedemptionStatus.RESERVED, PaymentStatus.REFUNDED);
    await service.onBookingCancelled('b', CancelledBy.PROVIDER);
    expect(finalStatus(tx)).toBe('RELEASED');
    expect(tx.voucher.update).toHaveBeenCalled();
  });

  it('keeps an applied voucher when the traveler cancels (budget already spent)', async () => {
    const { tx, service } = cancelSetup(RedemptionStatus.APPLIED, PaymentStatus.PAID);
    await service.onBookingCancelled('b', CancelledBy.TRAVELER);
    expect(tx.voucherRedemption.updateMany).not.toHaveBeenCalled();
  });

  it('refunds the spent budget when the provider cancels an applied voucher', async () => {
    const { tx, service } = cancelSetup(RedemptionStatus.APPLIED, PaymentStatus.PAID);
    await service.onBookingCancelled('b', CancelledBy.PROVIDER);
    expect(finalStatus(tx)).toBe('RELEASED');
    expect(tx.promoBudget.update).toHaveBeenCalledWith(expect.objectContaining({ data: { spentAmount: { decrement: 50_000 } } }));
    expect(tx.promoBudgetTransaction.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amount: 50_000 }) }));
  });

  it('does nothing for a booking without a voucher', async () => {
    const prisma = { voucherRedemption: { findUnique: jest.fn<() => Promise<null>>().mockResolvedValue(null) }, $transaction: jest.fn() };
    await new VouchersService(prisma as unknown as PrismaService).onBookingCancelled('b', CancelledBy.TRAVELER);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
