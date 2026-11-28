import { BookingStatus, PaymentStatus } from '@prisma/client';
import { PaymentsService } from '../payments.service';

// Plain functions because the suite runs as ESM, where the `jest` global is unavailable
function setup(opts: { status: BookingStatus; holdExpired?: boolean }) {
  const booking = {
    id: 'b1', status: opts.status, travelerId: 't1',
    holdExpiresAt: new Date(Date.now() + (opts.holdExpired ? -60_000 : 60_000)),
    listing: { title: 'Lều', providerId: 'p1' },
  };
  const payment = {
    id: 'pay1', status: PaymentStatus.PENDING as PaymentStatus, rentalPaidAt: null as Date | null,
    depositAmount: 100, rentalAmount: 200, gatewayOrderCode: 'D', rentalOrderCode: 'R', gatewayTransId: null,
  };
  const walletTx: Array<{ type: string; amount: number }> = [];

  const prisma = {
    $transaction: (run: (tx: unknown) => Promise<unknown>) => run(prisma),
    paymentWebhookLog: { create: () => Promise.resolve(), updateMany: () => Promise.resolve() },
    payment: {
      findFirst: () => Promise.resolve({ ...payment, booking }),
      findUniqueOrThrow: () => Promise.resolve({ ...payment, booking }),
      updateMany: ({ where, data }: { where: { status?: { notIn: PaymentStatus[] }; rentalPaidAt?: null }; data: object }) => {
        if (where.status?.notIn.includes(payment.status)) return Promise.resolve({ count: 0 });
        if (where.rentalPaidAt === null && payment.rentalPaidAt) return Promise.resolve({ count: 0 });
        Object.assign(payment, data);
        return Promise.resolve({ count: 1 });
      },
      update: ({ data }: { data: { status?: PaymentStatus } }) => {
        if (data.status) payment.status = data.status;
        return Promise.resolve(payment);
      },
    },
    booking: {
      findUnique: () => Promise.resolve(null),
      findUniqueOrThrow: () => Promise.resolve(booking),
      updateMany: ({ where, data }: { where: { status: BookingStatus; OR?: unknown }; data: { status: BookingStatus } }) => {
        const expired = !!where.OR && booking.holdExpiresAt.getTime() < Date.now();
        if (booking.status !== where.status || expired) return Promise.resolve({ count: 0 });
        booking.status = data.status;
        return Promise.resolve({ count: 1 });
      },
    },
    wallet: { upsert: () => Promise.resolve({ walletId: 'w1', availableBalance: 0 }) },
    walletTransaction: { create: ({ data }: { data: { type: string; amount: number } }) => Promise.resolve(walletTx.push(data)) },
    refundRecord: { create: () => Promise.resolve() },
    notification: { create: () => Promise.resolve() },
  };
  const payos = { verifyWebhook: (b: { code: string }) => ({ isValid: true, success: true, orderCode: b.code, transactionId: 'x' }) };
  const vouchers = { onBookingCancelled: () => Promise.resolve() };
  const none = {};
  const args = [prisma, none, none, payos, none, none, vouchers, none, none, none, none];
  const service = new (PaymentsService as unknown as new (...a: unknown[]) => PaymentsService)(...args);

  return { booking, payment, walletTx, pay: (code: 'D' | 'R') => service.handlePayosWebhook({ code }) };
}

describe('PayOS money arriving late', () => {
  it('accepts a deposit paid within the hold', async () => {
    const t = setup({ status: BookingStatus.PENDING_PAYMENT });
    await t.pay('D');
    expect(t.booking.status).toBe(BookingStatus.PENDING_APPROVAL);
    expect(t.walletTx).toHaveLength(0);
  });

  it('refunds a deposit once and keeps a cancelled order cancelled', async () => {
    const t = setup({ status: BookingStatus.CANCELLED });
    await t.pay('D');
    await t.pay('D');
    expect(t.booking.status).toBe(BookingStatus.CANCELLED);
    expect(t.payment.status).toBe(PaymentStatus.REFUNDED);
    expect(t.walletTx).toEqual([expect.objectContaining({ type: 'REFUND', amount: 100 })]);
  });

  it('cancels and refunds when the hold has run out', async () => {
    const t = setup({ status: BookingStatus.PENDING_PAYMENT, holdExpired: true });
    await t.pay('D');
    expect(t.booking.status).toBe(BookingStatus.CANCELLED);
    expect(t.walletTx).toHaveLength(1);
  });

  it('refunds rental money for a cancelled order', async () => {
    const t = setup({ status: BookingStatus.CANCELLED });
    await t.pay('R');
    await t.pay('R');
    expect(t.walletTx).toEqual([expect.objectContaining({ type: 'REFUND', amount: 200 })]);
  });
});
