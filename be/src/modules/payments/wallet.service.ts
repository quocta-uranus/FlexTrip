import { Injectable, BadRequestException } from '@nestjs/common';
import { WalletTxType, WalletTxStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ID = 'c[a-z0-9]{24}';
// Wording of notes stored before they carried the listing title; specific patterns come first
const LEGACY_NOTES: Array<[RegExp, (order: string, title: string) => string]> = [
  [new RegExp(`Phạt bồi thường thiệt hại, tranh chấp ${ID}`), (order) => `Bồi thường thiệt hại do tranh chấp ${order}`],
  [new RegExp(`Nhận bồi thường thiệt hại, tranh chấp ${ID}`), (order) => `Nhận bồi thường thiệt hại do tranh chấp ${order}`],
  [new RegExp(`Hoàn tiền tranh chấp booking ${ID}`), (order) => `Hoàn tiền do tranh chấp ${order}`],
  [new RegExp(`tiền thuê booking ${ID}`), (_, title) => `tiền thuê đơn${title}`],
  [new RegExp(`booking ${ID}`), (order) => order],
];

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureWallet(userId: string) {
    return this.prisma.wallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async getBalance(userId: string) {
    const wallet = await this.ensureWallet(userId);
    return {
      availableBalance: Number(wallet.availableBalance),
      frozenBalance: Number(wallet.frozenBalance),
      pendingBalance: Number(wallet.pendingBalance),
      currency: wallet.currency,
    };
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const wallet = await this.ensureWallet(userId);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.walletId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.walletId } }),
    ]);
    return { items: await this.hideIdsInNotes(items), total, page, limit };
  }

  // Rewritten on read so that old rows need no database update
  private async hideIdsInNotes<T extends { refType: string | null; refId: string | null; note: string | null }>(items: T[]) {
    const legacy = items.filter((t) => LEGACY_NOTES.some(([pattern]) => pattern.test(t.note ?? '')));
    if (!legacy.length) return items;

    const idsOf = (refType: string) => legacy.flatMap((t) => (t.refType === refType && t.refId ? [t.refId] : []));
    const [payments, disputes] = await Promise.all([
      this.prisma.payment.findMany({ where: { id: { in: idsOf('payment') } }, select: { id: true, bookingId: true } }),
      this.prisma.dispute.findMany({ where: { id: { in: idsOf('dispute-penalty') } }, select: { id: true, bookingId: true } }),
    ]);
    const bookingIdByRef = new Map([...payments, ...disputes].map((r) => [r.id, r.bookingId]));
    const bookingIdOf = (t: T) => (t.refType === 'booking' ? t.refId : bookingIdByRef.get(t.refId ?? '')) ?? '';

    const bookings = await this.prisma.booking.findMany({
      where: { id: { in: legacy.map(bookingIdOf) } },
      select: { id: true, listing: { select: { title: true } } },
    });
    const titleByBooking = new Map(bookings.map((b) => [b.id, b.listing.title]));

    return items.map((t) => {
      if (!legacy.includes(t)) return t;
      const found = titleByBooking.get(bookingIdOf(t));
      // A deleted order still must not show its id
      const title = found ? ` “${found}”` : '';
      const note = LEGACY_NOTES.reduce(
        (text, [pattern, wording]) => text.replace(pattern, () => wording(`đơn thuê${title}`, title)),
        t.note ?? '',
      );
      return { ...t, note };
    });
  }

  async credit(userId: string, amount: number, opts: {
    type?: WalletTxType;
    refType?: string;
    refId?: string;
    note?: string;
    metadata?: Record<string, unknown>;
  } = {}) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.update({
        where: { userId },
        data: { availableBalance: { increment: amount } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.walletId,
          type: opts.type ?? WalletTxType.CREDIT,
          status: WalletTxStatus.SETTLED,
          amount,
          balanceAfter: wallet.availableBalance,
          refType: opts.refType,
          refId: opts.refId,
          note: opts.note,
          metadata: opts.metadata as object,
        },
      });
      return wallet;
    });
  }

  async debit(userId: string, amount: number, opts: {
    type?: WalletTxType;
    refType?: string;
    refId?: string;
    note?: string;
  } = {}) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet || Number(wallet.availableBalance) < amount) {
        throw new BadRequestException('Số dư không đủ');
      }
      const updated = await tx.wallet.update({
        where: { userId },
        data: { availableBalance: { decrement: amount } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.walletId,
          type: opts.type ?? WalletTxType.DEBIT,
          status: WalletTxStatus.SETTLED,
          amount,
          balanceAfter: updated.availableBalance,
          refType: opts.refType,
          refId: opts.refId,
          note: opts.note,
        },
      });
      return updated;
    });
  }

  async freeze(userId: string, amount: number, opts: { refType?: string; refId?: string; note?: string } = {}) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet || Number(wallet.availableBalance) < amount) {
        throw new BadRequestException('Số dư không đủ để giữ cọc');
      }
      const updated = await tx.wallet.update({
        where: { userId },
        data: {
          availableBalance: { decrement: amount },
          frozenBalance: { increment: amount },
        },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.walletId,
          type: WalletTxType.FREEZE,
          status: WalletTxStatus.SETTLED,
          amount,
          balanceAfter: updated.availableBalance,
          refType: opts.refType,
          refId: opts.refId,
          note: opts.note,
        },
      });
      return updated;
    });
  }

  async unfreeze(userId: string, amount: number, opts: { refType?: string; refId?: string; note?: string } = {}) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet || Number(wallet.frozenBalance) < amount) {
        throw new BadRequestException('Số dư đóng băng không đủ');
      }
      const updated = await tx.wallet.update({
        where: { userId },
        data: {
          frozenBalance: { decrement: amount },
          availableBalance: { increment: amount },
        },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.walletId,
          type: WalletTxType.UNFREEZE,
          status: WalletTxStatus.SETTLED,
          amount,
          balanceAfter: updated.availableBalance,
          refType: opts.refType,
          refId: opts.refId,
          note: opts.note,
        },
      });
      return updated;
    });
  }

  // Forfeit frozen deposit from traveler to provider (e.g. late cancellation)
  async forfeitFrozenToProvider(
    travelerUserId: string,
    providerUserId: string,
    amount: number,
    opts: { refType?: string; refId?: string; note?: string } = {},
  ) {
    return this.prisma.$transaction(async (tx) => {
      const travelerWallet = await tx.wallet.findUnique({ where: { userId: travelerUserId } });
      if (!travelerWallet || Number(travelerWallet.frozenBalance) < amount) {
        throw new BadRequestException('Số dư đóng băng của traveler không đủ');
      }

      const [updatedTraveler, updatedProvider] = await Promise.all([
        tx.wallet.update({
          where: { userId: travelerUserId },
          data: { frozenBalance: { decrement: amount } },
        }),
        tx.wallet.upsert({
          where: { userId: providerUserId },
          create: { userId: providerUserId, availableBalance: amount },
          update: { availableBalance: { increment: amount } },
        }),
      ]);

      await tx.walletTransaction.createMany({
        data: [
          {
            walletId: travelerWallet.walletId,
            type: WalletTxType.DEBIT,
            status: WalletTxStatus.SETTLED,
            amount,
            balanceAfter: updatedTraveler.availableBalance,
            refType: opts.refType,
            refId: opts.refId,
            note: opts.note ?? 'Phạt cọc do hủy muộn',
          },
          {
            walletId: updatedProvider.walletId,
            type: WalletTxType.CREDIT,
            status: WalletTxStatus.SETTLED,
            amount,
            balanceAfter: updatedProvider.availableBalance,
            refType: opts.refType,
            refId: opts.refId,
            note: opts.note ?? 'Nhận cọc phạt từ traveler',
          },
        ],
      });
    });
  }
}
