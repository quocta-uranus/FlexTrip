import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WithdrawStatus, WalletTxType, WalletTxStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EscrowService } from '../../payments/escrow.service';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import { toNumber } from '../../../common/money.util';
import { RequestContext } from '../../../common/request-context';

export class ProcessWithdrawDto {
  action: 'approve' | 'reject';
  transferRef?: string;
  adminNote?: string;
}

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  roles: { select: { role: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminWithdrawService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly escrow: EscrowService,
  ) {}

  async list(status?: WithdrawStatus, page = 1, limit = 20) {
    const where: Prisma.WithdrawRequestWhereInput = status ? { status } : {};
    const q = { page, limit };
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.withdrawRequest.findMany({
        where,
        include: { user: { select: USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.withdrawRequest.count({ where }),
    ]);

    return paginate(
      rows.map((r) => ({
        id: r.id,
        user: r.user,
        amount: toNumber(r.amount)!,
        bankName: r.bankName,
        bankAccount: r.bankAccount,
        accountName: r.accountName,
        status: r.status,
        note: r.note,
        adminNote: r.adminNote,
        processedAt: r.processedAt,
        createdAt: r.createdAt,
      })),
      total,
      q,
    );
  }

  async process(id: string, dto: ProcessWithdrawDto, ctx: RequestContext) {
    const req = await this.prisma.withdrawRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu rút tiền');
    if (req.status !== WithdrawStatus.PENDING) {
      throw new BadRequestException('Yêu cầu đã được xử lý trước đó');
    }
    if (dto.action === 'approve' && !dto.transferRef) {
      throw new BadRequestException('Cần nhập mã chuyển khoản khi duyệt');
    }

    const amount = Number(req.amount);

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: req.userId } });

      if (dto.action === 'approve') {
        // Deduct frozen balance — money leaves the platform
        await tx.wallet.update({
          where: { userId: req.userId },
          data: { frozenBalance: { decrement: amount } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.walletId,
            type: WalletTxType.PAYOUT,
            status: WalletTxStatus.SETTLED,
            amount,
            balanceAfter: wallet.availableBalance,
            note: `Rút tiền được duyệt — mã CK: ${dto.transferRef}`,
          },
        });
      } else {
        // Reject — unfreeze back to available
        await tx.wallet.update({
          where: { userId: req.userId },
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
            balanceAfter: wallet.availableBalance,
            note: `Hoàn lại số dư do yêu cầu rút bị từ chối`,
          },
        });
      }

      const updated = await tx.withdrawRequest.update({
        where: { id },
        data: {
          status: dto.action === 'approve' ? WithdrawStatus.APPROVED : WithdrawStatus.REJECTED,
          adminNote: dto.adminNote,
          processedAt: new Date(),
        },
      });

      await this.audit.log(tx, ctx, {
        action: dto.action === 'approve' ? 'WITHDRAW_APPROVED' : 'WITHDRAW_REJECTED',
        entityType: 'WithdrawRequest',
        entityId: id,
        before: { status: req.status },
        after: { status: updated.status, transferRef: dto.transferRef, adminNote: dto.adminNote },
      });

      return updated;
    });
  }

  async platformSummary() {
    const [escrowBalance, platformRevenue, pendingWithdrawals] = await Promise.all([
      this.escrow.getBalance(),
      this.prisma.commissionLedger.aggregate({ _sum: { platformFee: true } }),
      this.prisma.withdrawRequest.aggregate({
        where: { status: WithdrawStatus.PENDING },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      escrowBalance,
      platformRevenue: toNumber(platformRevenue._sum.platformFee) ?? 0,
      pendingWithdrawalAmount: toNumber(pendingWithdrawals._sum.amount) ?? 0,
      pendingWithdrawalCount: pendingWithdrawals._count,
    };
  }
}
