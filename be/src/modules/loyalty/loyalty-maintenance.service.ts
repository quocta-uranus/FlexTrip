import { Injectable, Logger } from '@nestjs/common';
import { LoyaltyTxType, NotificationType, Prisma, RedemptionStatus, VoucherStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const EXPIRY_WARNING_DAYS = 3;

@Injectable()
export class LoyaltyMaintenanceService {
  private readonly logger = new Logger(LoyaltyMaintenanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async runNightly(now = new Date()) {
    const points = await this.expirePoints(now);
    const vouchers = await this.expireVouchers(now);
    const warned = await this.warnExpiringVouchers(now);
    return { ...points, vouchersExpired: vouchers, vouchersWarned: warned };
  }

  /**
   * Điểm dùng theo thứ tự cũ nhất trước (FIFO): phần điểm đã hết hạn mà chưa bị redeem/expire "tiêu" hết
   * chính là phần phải trừ. Không cần đánh dấu từng dòng EARN.
   */
  async expirePoints(now: Date) {
    const candidates = await this.prisma.loyaltyTransaction.groupBy({
      by: ['userId'],
      where: { type: LoyaltyTxType.EARN, expiresAt: { lte: now } },
      _sum: { points: true },
    });
    const day = now.toISOString().slice(0, 10);
    let usersExpired = 0;
    let pointsExpired = 0;

    for (const c of candidates) {
      try {
        const expired = await this.expireForUser(c.userId, c._sum.points ?? 0, day);
        if (expired > 0) { usersExpired++; pointsExpired += expired; }
      } catch (e) {
        // Chạy lại trong ngày là P2002 vì đã trừ rồi: bỏ qua; lỗi khác chỉ ghi log để không dừng cả lượt
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) {
          this.logger.error(`Không hết hạn được điểm của ${c.userId}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
    return { usersExpired, pointsExpired };
  }

  private expireForUser(userId: string, expiredEarned: number, day: string) {
    return this.prisma.$transaction(async (tx) => {
      // Khoá tài khoản để một lượt đổi điểm đồng thời không làm số dư lệch
      await tx.$queryRaw`SELECT "userId" FROM "LoyaltyAccount" WHERE "userId" = ${userId} FOR UPDATE`;
      const account = await tx.loyaltyAccount.findUnique({ where: { userId } });
      if (!account) return 0;

      const used = await tx.loyaltyTransaction.groupBy({
        by: ['type'],
        where: { userId, type: { in: [LoyaltyTxType.REDEEM, LoyaltyTxType.EXPIRE] } },
        _sum: { points: true },
      });
      const consumed = used.reduce((sum, u) => sum + Math.abs(u._sum.points ?? 0), 0);
      const toExpire = Math.min(account.balance, Math.max(0, expiredEarned - consumed));
      if (toExpire <= 0) return 0;

      const updated = await tx.loyaltyAccount.update({ where: { userId }, data: { balance: { decrement: toExpire } } });
      await tx.loyaltyTransaction.create({
        data: { userId, type: LoyaltyTxType.EXPIRE, points: -toExpire, balanceAfter: updated.balance, refType: 'expiry', refId: day, note: 'Điểm hết hạn' },
      });
      await tx.notification.create({
        data: {
          userId, type: NotificationType.SYSTEM, title: `${toExpire} điểm thưởng đã hết hạn`,
          body: 'Điểm nhận được từ lâu đã hết hạn. Đổi điểm sớm để không bỏ lỡ ưu đãi.', data: { href: '/profile/loyalty' },
        },
      });
      return toExpire;
    });
  }

  /** Chỉ chuyển trạng thái hiển thị; việc áp mã đã tự chặn theo endsAt. Voucher còn lượt đang giữ chỗ thì để nguyên. */
  async expireVouchers(now: Date) {
    const { count } = await this.prisma.voucher.updateMany({
      where: { status: VoucherStatus.ACTIVE, endsAt: { lt: now }, redemptions: { none: { status: RedemptionStatus.RESERVED } } },
      data: { status: VoucherStatus.EXPIRED },
    });
    return count;
  }

  async warnExpiringVouchers(now: Date) {
    const soon = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 86_400_000);
    const vouchers = await this.prisma.voucher.findMany({
      where: {
        status: VoucherStatus.ACTIVE, assignedUserId: { not: null }, endsAt: { gt: now, lte: soon },
        redemptions: { none: { status: { in: [RedemptionStatus.RESERVED, RedemptionStatus.APPLIED] } } },
      },
      select: { id: true, code: true, name: true, endsAt: true, assignedUserId: true },
    });
    let warned = 0;
    for (const v of vouchers) {
      // Mỗi voucher chỉ nhắc một lần
      const already = await this.prisma.notification.findFirst({
        where: { userId: v.assignedUserId!, data: { path: ['voucherExpiryFor'], equals: v.id } },
        select: { id: true },
      });
      if (already) continue;
      await this.prisma.notification.create({
        data: {
          userId: v.assignedUserId!, type: NotificationType.SYSTEM, title: 'Voucher sắp hết hạn',
          body: `"${v.name}" (mã ${v.code}) hết hạn ngày ${v.endsAt.toLocaleDateString('vi-VN')}.`,
          data: { voucherExpiryFor: v.id, href: '/profile/vouchers' },
        },
      });
      warned++;
    }
    return warned;
  }
}
