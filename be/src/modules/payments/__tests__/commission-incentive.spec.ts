import { jest } from '@jest/globals';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CommissionService } from '../commission.service';
import { EscrowService } from '../escrow.service';

const D = (n: number) => new Prisma.Decimal(n);

function setup(opts: { incentive?: { isTopRated: boolean; feeDiscountPct: number; validUntil: Date } | null; staff?: boolean }) {
  const ledgerUpsert = jest.fn<(a: unknown) => Promise<unknown>>().mockResolvedValue({});
  const walletUpsert = jest.fn<(a: unknown) => Promise<unknown>>().mockResolvedValue({ walletId: 'w', availableBalance: D(0) });
  const tx = {
    wallet: { upsert: walletUpsert },
    walletTransaction: { create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
    payment: { update: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) },
    commissionLedger: { upsert: ledgerUpsert },
  };
  const prisma = {
    booking: {
      findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        assignedStaffId: opts.staff ? 's1' : null,
        listing: { providerId: 'p1' },
        payment: { id: 'pay1', totalAmount: D(1_000_000), refundedAmount: D(0), depositAmount: D(300_000), rentalAmount: D(700_000), discountAmount: D(0), gateway: 'WALLET', rentalGateway: 'WALLET' },
      }),
    },
    commissionLedger: { findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(null) },
    providerIncentive: {
      findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(
        opts.incentive ? { isTopRated: opts.incentive.isTopRated, feeDiscountPct: D(opts.incentive.feeDiscountPct), validUntil: opts.incentive.validUntil } : null,
      ),
    },
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  };
  const escrow = { debit: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) };
  const service = new CommissionService(prisma as unknown as PrismaService, escrow as unknown as EscrowService);
  const created = () => (ledgerUpsert.mock.calls[0] as unknown as [{ create: Record<string, unknown> }])[0].create;
  return { service, created, escrow };
}

const future = new Date(Date.now() + 3_600_000);

describe('CommissionService.split with top-rated incentive', () => {
  it('keeps the standard 10% / 90% split when there is no incentive', async () => {
    const { service, created } = setup({});
    await service.split('b1');
    expect(created()).toMatchObject({ platformFee: 100_000, providerNet: 900_000, platformRate: 0.1, incentiveDiscountPct: 0 });
  });

  it('moves the discount from the platform fee to the provider and snapshots the rate', async () => {
    const { service, created } = setup({ incentive: { isTopRated: true, feeDiscountPct: 2, validUntil: future } });
    await service.split('b1');
    expect(created()).toMatchObject({ platformFee: 80_000, providerNet: 920_000, platformRate: 0.08, incentiveDiscountPct: 2 });
  });

  it('leaves the staff share at 2% and discounts only the platform fee', async () => {
    const { service, created } = setup({ staff: true, incentive: { isTopRated: true, feeDiscountPct: 2, validUntil: future } });
    await service.split('b1');
    expect(created()).toMatchObject({ staffFee: 20_000, platformFee: 60_000, providerNet: 920_000 });
  });

  it('ignores an expired incentive', async () => {
    const { service, created } = setup({ incentive: { isTopRated: true, feeDiscountPct: 2, validUntil: new Date(Date.now() - 1000) } });
    await service.split('b1');
    expect(created()).toMatchObject({ platformFee: 100_000, incentiveDiscountPct: 0 });
  });

  it('never lets the platform fee fall below the 5% floor', async () => {
    const { service, created } = setup({ incentive: { isTopRated: true, feeDiscountPct: 5, validUntil: future } });
    await service.split('b1');
    expect(created()).toMatchObject({ platformFee: 50_000, providerNet: 950_000, platformRate: 0.05 });
  });

  it('still adds up to the total: platform + staff + provider = price', async () => {
    const { service, created } = setup({ staff: true, incentive: { isTopRated: true, feeDiscountPct: 3, validUntil: future } });
    await service.split('b1');
    const c = created() as Record<string, number>;
    expect(c.platformFee + c.staffFee + c.providerNet).toBeCloseTo(1_000_000, 2);
  });
});
