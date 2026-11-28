import { BookingStatus, PaymentGateway, PaymentStatus } from '@prisma/client';
import { AdminOverdueService } from './admin-overdue.service';
import { daysPast, vietnamToday } from '../../booking/overdue.util';
import { suggestLateFee } from '../../booking/late-fee.util';
import type { RequestContext } from '../../../common/request-context';

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(vietnamToday().getTime() - n * DAY);

// Plain functions because the suite runs as ESM, where the `jest` global is unavailable
function setup(opts: { overdueDays: number; gateway?: PaymentGateway; rentalPaid?: boolean }) {
  const gateway = opts.gateway ?? PaymentGateway.WALLET;
  const wallets: Record<string, { availableBalance: number; frozenBalance: number }> = {
    traveler: { availableBalance: 0, frozenBalance: 100 },
    provider: { availableBalance: 0, frozenBalance: 0 },
  };
  let escrowOut = 0;
  let strikes = 0;
  const booking = {
    id: 'b1', status: BookingStatus.CONFIRMED as BookingStatus, travelerId: 'traveler', startDate: daysAgo(opts.overdueDays),
    listing: { title: 'Lều', providerId: 'provider' },
    payment: {
      id: 'p1', status: PaymentStatus.PAID, gateway, rentalGateway: opts.rentalPaid ? gateway : null,
      rentalPaidAt: opts.rentalPaid ? new Date() : null, depositAmount: 100, rentalAmount: 200,
    },
  };
  type Change = { increment?: number; decrement?: number };
  const prisma = {
    $transaction: (run: (tx: unknown) => Promise<unknown>) => run(prisma),
    booking: {
      findUnique: () => Promise.resolve(booking),
      updateMany: () => {
        if (booking.status !== BookingStatus.CONFIRMED) return Promise.resolve({ count: 0 });
        booking.status = BookingStatus.CANCELLED;
        return Promise.resolve({ count: 1 });
      },
    },
    wallet: {
      upsert: ({ where, update }: { where: { userId: string }; update: Record<string, Change> }) => {
        const w = wallets[where.userId];
        w.availableBalance += update.availableBalance?.increment ?? 0;
        w.frozenBalance -= update.frozenBalance?.decrement ?? 0;
        return Promise.resolve({ walletId: where.userId, ...w });
      },
    },
    walletTransaction: { create: () => Promise.resolve() },
    refundRecord: { create: () => Promise.resolve() },
    payment: { update: () => Promise.resolve() },
    providerProfile: { updateMany: () => Promise.resolve(strikes++) },
    notification: { createMany: () => Promise.resolve() },
  };
  const service = new AdminOverdueService(
    prisma as never,
    { log: () => Promise.resolve() } as never,
    { debit: (amount: number) => Promise.resolve((escrowOut += amount)) } as never,
    { onBookingCancelled: () => Promise.resolve() } as never,
  );
  return {
    wallets,
    escrowOut: () => escrowOut,
    strikes: () => strikes,
    resolve: (fault: 'TRAVELER_NO_SHOW' | 'PROVIDER_FAULT' | 'PLATFORM_FAULT') =>
      service.resolveHandover('b1', { fault }, { actorId: 'admin' } as RequestContext),
  };
}

describe('AdminOverdueService.resolveHandover', () => {
  it('no-show with the balance paid: deposit to provider, balance back to traveler', async () => {
    const t = setup({ overdueDays: 2, rentalPaid: true });
    t.wallets.traveler.frozenBalance = 0;
    await expect(t.resolve('TRAVELER_NO_SHOW')).resolves.toMatchObject({ refunded: 200, toProvider: 100 });
    expect(t.wallets.traveler.availableBalance).toBe(200);
    expect(t.wallets.provider.availableBalance).toBe(100);
    expect(t.escrowOut()).toBe(300);
  });

  it('no-show with a frozen wallet deposit: the hold moves to the provider', async () => {
    const t = setup({ overdueDays: 2 });
    await t.resolve('TRAVELER_NO_SHOW');
    expect(t.wallets.traveler).toEqual({ availableBalance: 0, frozenBalance: 0 });
    expect(t.wallets.provider.availableBalance).toBe(100);
    expect(t.escrowOut()).toBe(0);
  });

  it('provider fault: full refund and a strike; gateway money never touches escrow', async () => {
    const t = setup({ overdueDays: 1, gateway: PaymentGateway.PAYOS, rentalPaid: true });
    await expect(t.resolve('PROVIDER_FAULT')).resolves.toMatchObject({ refunded: 300, toProvider: 0 });
    expect(t.strikes()).toBe(1);
    expect(t.escrowOut()).toBe(0);
  });

  it('refuses a no-show during the contact period and an order that is not overdue', async () => {
    await expect(setup({ overdueDays: 1 }).resolve('TRAVELER_NO_SHOW')).rejects.toThrow('2 ngày');
    await expect(setup({ overdueDays: 0 }).resolve('PLATFORM_FAULT')).rejects.toThrow('chưa quá hạn');
  });

  it('cannot be applied twice', async () => {
    const t = setup({ overdueDays: 2 });
    await t.resolve('PLATFORM_FAULT');
    await expect(t.resolve('PLATFORM_FAULT')).rejects.toThrow('chờ bàn giao');
  });
});

describe('late return fee', () => {
  const rental = { startDate: daysAgo(7), endDate: daysAgo(3), totalPrice: 500, checkedInAt: daysAgo(7), checkedOutAt: null };

  it('multiplies days late by the daily price', () => {
    expect(daysPast(rental.endDate)).toBe(3);
    expect(suggestLateFee(rental)).toEqual({ lateDays: 3, dailyPrice: 100, amount: 300, returned: false });
  });

  it('stops counting at the return and ignores rentals never handed over', () => {
    expect(suggestLateFee({ ...rental, checkedOutAt: daysAgo(2) })).toMatchObject({ lateDays: 1, returned: true });
    expect(suggestLateFee({ ...rental, checkedInAt: null })).toBeNull();
  });
});
