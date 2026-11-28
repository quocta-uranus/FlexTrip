import { WalletService } from '../wallet.service';
import type { PrismaService } from '../../../prisma/prisma.service';

const BOOKING = 'cmwmwy534000nqx8p6s886i5d';
const PAYMENT = 'cmwmwy9zz000pqx8pabcdefgh';
const DISPUTE = 'cmwmx85sl002xqx8p6qavn4xz';

function serviceWith(items: object[]) {
  // Plain functions because the suite runs as ESM, where the `jest` global is unavailable
  const rows = (data: object[]) => ({ findMany: () => Promise.resolve(data) });
  const prisma = {
    wallet: { upsert: () => Promise.resolve({ walletId: 'w1' }) },
    walletTransaction: { ...rows(items), count: () => Promise.resolve(items.length) },
    payment: rows([{ id: PAYMENT, bookingId: BOOKING }]),
    dispute: rows([{ id: DISPUTE, bookingId: BOOKING }]),
    booking: rows([{ id: BOOKING, listing: { title: 'Lều 4 người' } }]),
  };
  return new WalletService(prisma as unknown as PrismaService);
}

const notesOf = async (items: object[]) =>
  (await serviceWith(items).getTransactions('u1')).items.map((t) => t.note);

describe('WalletService.getTransactions', () => {
  it('replaces ids in old notes with the listing title', async () => {
    await expect(
      notesOf([
        { refType: 'dispute-penalty', refId: DISPUTE, note: `Phạt bồi thường thiệt hại, tranh chấp ${DISPUTE}` },
        { refType: 'payment', refId: PAYMENT, note: `Giữ cọc booking ${BOOKING}` },
        { refType: 'payment', refId: PAYMENT, note: `Thanh toán tiền thuê booking ${BOOKING}` },
        { refType: 'booking', refId: BOOKING, note: `Hoàn tiền tranh chấp booking ${BOOKING}` },
      ]),
    ).resolves.toEqual([
      'Bồi thường thiệt hại do tranh chấp đơn thuê “Lều 4 người”',
      'Giữ cọc đơn thuê “Lều 4 người”',
      'Thanh toán tiền thuê đơn “Lều 4 người”',
      'Hoàn tiền do tranh chấp đơn thuê “Lều 4 người”',
    ]);
  });

  it('drops the id of a missing order and leaves other notes alone', async () => {
    await expect(
      notesOf([
        { refType: 'booking', refId: 'gone', note: 'Thu nhập từ booking cmwzzzzzzzzzzzzzzzzzzzzzz' },
        { refType: null, refId: null, note: 'Nạp ví qua PayOS' },
        { refType: null, refId: null, note: null },
      ]),
    ).resolves.toEqual(['Thu nhập từ đơn thuê', 'Nạp ví qua PayOS', null]);
  });
});
