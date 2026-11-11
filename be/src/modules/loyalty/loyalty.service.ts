import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BookingStatus, LoyaltyTxType, NotificationType, Prisma, VoucherAudience, VoucherSource, VoucherStatus, VoucherType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { paginate, skipTake } from '../../common/dto/pagination.dto';
import { LoyaltyTransactionsQueryDto } from './dto/loyalty.dto';
import { LOYALTY_BUDGET_ID, LOYALTY_BUDGET_NAME } from './loyalty.constants';
import { generateVoucherCode } from '../vouchers/voucher-code.util';

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(private readonly prisma: PrismaService, private readonly config: SystemConfigService) {}

  // ─── Earn ─────────────────────────────────────────────────────────────────

  /** Mỗi booking COMPLETED cộng điểm một lần; gọi lặp lại không cộng thêm. */
  async earnForBooking(bookingId: string): Promise<number> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { travelerId: true, status: true },
    });
    if (!booking || booking.status !== BookingStatus.COMPLETED) return 0;

    const [points, validDays] = await Promise.all([
      this.config.get('loyalty_points_per_order'),
      this.config.get('loyalty_points_valid_days'),
    ]);
    try {
      await this.prisma.$transaction(async (tx) => {
        const duplicate = await tx.loyaltyTransaction.findFirst({
          where: { userId: booking.travelerId, type: LoyaltyTxType.EARN, refType: 'booking', refId: bookingId },
          select: { id: true },
        });
        if (duplicate) throw new AlreadyEarned();

        const account = await tx.loyaltyAccount.upsert({
          where: { userId: booking.travelerId },
          create: { userId: booking.travelerId, balance: points, lifetimePoints: points },
          update: { balance: { increment: points }, lifetimePoints: { increment: points } },
        });
        await tx.loyaltyTransaction.create({
          data: {
            userId: booking.travelerId, type: LoyaltyTxType.EARN, points, balanceAfter: account.balance,
            refType: 'booking', refId: bookingId, note: 'Hoàn thành đơn thuê',
            expiresAt: new Date(Date.now() + validDays * 86_400_000),
          },
        });
        await tx.notification.create({
          data: {
            userId: booking.travelerId, type: NotificationType.SYSTEM, title: `Bạn nhận được ${points} điểm thưởng`,
            body: `Đơn thuê hoàn thành. Số dư hiện tại: ${account.balance} điểm.`, data: { href: '/profile/loyalty' },
          },
        });
      });
      return points;
    } catch (e) {
      // Hai lần gọi đồng thời: unique (userId, type, refType, refId) chặn lần thứ hai và rollback phần cộng điểm
      if (e instanceof AlreadyEarned || (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) return 0;
      throw e;
    }
  }

  /** Dùng khi hoàn thành booking: lỗi điểm thưởng không được làm hỏng bước chia hoa hồng. */
  async earnForBookingSafe(bookingId: string) {
    await this.earnForBooking(bookingId).catch((e: unknown) => {
      this.logger.error(`Không cộng được điểm cho booking ${bookingId}: ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  // ─── Đọc ──────────────────────────────────────────────────────────────────

  async me(userId: string) {
    const [account, pointsPerOrder, rewards] = await Promise.all([
      this.prisma.loyaltyAccount.findUnique({ where: { userId } }),
      this.config.get('loyalty_points_per_order'),
      this.prisma.loyaltyReward.findMany({ where: { isActive: true }, orderBy: { pointsCost: 'asc' } }),
    ]);
    const balance = account?.balance ?? 0;
    const next = rewards.find((r) => r.pointsCost > balance) ?? null;
    return {
      balance,
      lifetimePoints: account?.lifetimePoints ?? 0,
      pointsPerOrder,
      nextReward: next && { id: next.id, name: next.name, pointsCost: next.pointsCost, pointsNeeded: next.pointsCost - balance },
    };
  }

  async transactions(userId: string, query: LoyaltyTransactionsQueryDto) {
    const where = { userId };
    const [items, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, ...skipTake(query) }),
      this.prisma.loyaltyTransaction.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async rewards() {
    const rewards = await this.prisma.loyaltyReward.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { pointsCost: 'asc' }],
    });
    return rewards.map((r) => ({
      id: r.id,
      name: r.name,
      pointsCost: r.pointsCost,
      voucherType: r.voucherType,
      voucherValue: r.voucherValue.toNumber(),
      maxDiscount: r.maxDiscount?.toNumber() ?? null,
      validDays: r.validDays,
    }));
  }

  // ─── Redeem: điểm -> voucher cá nhân ──────────────────────────────────────

  async redeem(userId: string, rewardId: string) {
    return this.prisma.$transaction(async (tx) => {
      const reward = await tx.loyaltyReward.findUnique({ where: { id: rewardId } });
      if (!reward || !reward.isActive) throw new NotFoundException('Phần thưởng không tồn tại hoặc đã ngừng');

      // Khoá ngân sách để hai lượt đổi cùng lúc không cùng thấy "còn đủ"
      await tx.promoBudget.upsert({
        where: { id: LOYALTY_BUDGET_ID },
        create: { id: LOYALTY_BUDGET_ID, name: LOYALTY_BUDGET_NAME, totalAmount: 0 },
        update: {},
      });
      await tx.$queryRaw`SELECT "id" FROM "PromoBudget" WHERE "id" = ${LOYALTY_BUDGET_ID} FOR UPDATE`;
      const budget = await tx.promoBudget.findUniqueOrThrow({ where: { id: LOYALTY_BUDGET_ID } });

      // Với PERCENT, mức giảm lớn nhất chính là maxDiscount
      const faceValue = (reward.voucherType === VoucherType.PERCENT ? reward.maxDiscount : reward.voucherValue)?.toNumber() ?? 0;
      const left = budget.totalAmount.toNumber() - budget.spentAmount.toNumber() - budget.reservedAmount.toNumber();
      if (!budget.isActive || left < faceValue) {
        throw new BadRequestException('Quỹ đổi thưởng tạm hết, vui lòng thử lại sau');
      }

      const { count } = await tx.loyaltyAccount.updateMany({
        where: { userId, balance: { gte: reward.pointsCost } },
        data: { balance: { decrement: reward.pointsCost } },
      });
      if (count === 0) throw new BadRequestException('Bạn chưa đủ điểm để đổi phần thưởng này');
      const account = await tx.loyaltyAccount.findUniqueOrThrow({ where: { userId } });

      const now = new Date();
      const voucher = await tx.voucher.create({
        data: {
          code: generateVoucherCode('LP'),
          name: reward.name,
          description: `Đổi từ ${reward.pointsCost} điểm thưởng`,
          type: reward.voucherType,
          value: reward.voucherValue,
          maxDiscount: reward.maxDiscount,
          audience: VoucherAudience.PERSONAL,
          assignedUserId: userId,
          source: VoucherSource.POINTS,
          status: VoucherStatus.ACTIVE,
          startsAt: now,
          endsAt: new Date(now.getTime() + reward.validDays * 86_400_000),
          totalQuota: 1,
          perUserLimit: 1,
          budgetId: LOYALTY_BUDGET_ID,
        },
      });
      await tx.loyaltyTransaction.create({
        data: {
          userId, type: LoyaltyTxType.REDEEM, points: -reward.pointsCost, balanceAfter: account.balance,
          refType: 'voucher', refId: voucher.id, note: `Đổi "${reward.name}"`,
        },
      });

      return { balance: account.balance, voucher: { id: voucher.id, code: voucher.code, name: voucher.name, endsAt: voucher.endsAt } };
    });
  }
}

class AlreadyEarned extends Error {}
