import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LoyaltyTxType, VoucherSource, VoucherType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { RequestContext } from '../../../common/request-context';
import { CreateRewardDto, UpdateRewardDto } from './dto/admin-loyalty.dto';

@Injectable()
export class AdminLoyaltyService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  listRewards() {
    return this.prisma.loyaltyReward.findMany({ orderBy: [{ sortOrder: 'asc' }, { pointsCost: 'asc' }] });
  }

  async createReward(dto: CreateRewardDto, ctx: RequestContext) {
    this.assertValid(dto.voucherType ?? VoucherType.FIXED, dto.voucherValue, dto.maxDiscount);
    return this.prisma.$transaction(async (tx) => {
      const reward = await tx.loyaltyReward.create({ data: dto });
      await this.audit.log(tx, ctx, { action: 'LOYALTY_REWARD_CREATED', entityType: 'LoyaltyReward', entityId: reward.id, after: reward });
      return reward;
    });
  }

  async updateReward(id: string, dto: UpdateRewardDto, ctx: RequestContext) {
    const before = await this.prisma.loyaltyReward.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Phần thưởng không tồn tại');
    this.assertValid(before.voucherType, dto.voucherValue ?? before.voucherValue.toNumber(), dto.maxDiscount ?? before.maxDiscount?.toNumber());
    return this.prisma.$transaction(async (tx) => {
      const after = await tx.loyaltyReward.update({ where: { id }, data: dto });
      await this.audit.log(tx, ctx, { action: 'LOYALTY_REWARD_UPDATED', entityType: 'LoyaltyReward', entityId: id, before, after });
      return after;
    });
  }

  async stats() {
    const [earned, redeemed, accounts, vouchers] = await Promise.all([
      this.prisma.loyaltyTransaction.aggregate({ where: { type: LoyaltyTxType.EARN }, _sum: { points: true } }),
      this.prisma.loyaltyTransaction.aggregate({ where: { type: LoyaltyTxType.REDEEM }, _sum: { points: true } }),
      this.prisma.loyaltyAccount.aggregate({ _count: { _all: true }, _sum: { balance: true } }),
      this.prisma.voucher.count({ where: { source: VoucherSource.POINTS } }),
    ]);
    return {
      pointsIssued: earned._sum.points ?? 0,
      pointsRedeemed: Math.abs(redeemed._sum.points ?? 0),
      pointsOutstanding: accounts._sum.balance ?? 0,
      accounts: accounts._count._all,
      vouchersIssued: vouchers,
    };
  }

  private assertValid(type: VoucherType, value: number, maxDiscount?: number | null) {
    if (type === VoucherType.PERCENT) {
      if (value > 100) throw new BadRequestException('Giảm theo phần trăm tối đa 100');
      if (!maxDiscount) throw new BadRequestException('Phần thưởng giảm theo phần trăm cần đặt mức giảm tối đa');
    }
  }
}
