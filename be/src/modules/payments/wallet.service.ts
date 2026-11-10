import { Injectable, BadRequestException } from '@nestjs/common';
import { WalletTxType, WalletTxStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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
    return { items, total, page, limit };
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
