import { Injectable, Logger } from '@nestjs/common';
import { BookingStatus, NotificationType, Prisma, ReferralStatus, VoucherSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { issuePersonalVoucher } from '../vouchers/issue-personal-voucher';
import { randomCode } from '../vouchers/voucher-code.util';
import { paginate, skipTake } from '../../common/dto/pagination.dto';
import { ReferralListQueryDto } from './dto/referrals.dto';
import { REFERRAL_BUDGET_ID, REFERRAL_BUDGET_NAME, RejectReason } from './referrals.constants';

/** Gộp các biến thể cùng một hộp thư: bỏ phần +tag, và dấu chấm với Gmail. */
export function emailRoot(email: string): string {
  const [local, domain] = email.trim().toLowerCase().split('@');
  const base = local.split('+')[0];
  return `${domain === 'gmail.com' || domain === 'googlemail.com' ? base.replace(/\./g, '') : base}@${domain}`;
}

const normalizeCode = (code: string) => code.trim().toUpperCase();

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: SystemConfigService,
  ) {}

  // ─── Mã giới thiệu của tôi ────────────────────────────────────────────────

  async getOrCreateCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { referralCode: true } });
    if (user.referralCode) return user.referralCode;

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const updated = await this.prisma.user.update({ where: { id: userId }, data: { referralCode: randomCode(8) }, select: { referralCode: true } });
        return updated.referralCode!;
      } catch (e) {
        // Trùng mã (unique) thì thử mã khác
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
      }
    }
    throw new Error('Không tạo được mã giới thiệu, vui lòng thử lại');
  }

  async me(userId: string) {
    const [code, grouped, refereeVnd, referrerVnd, cap] = await Promise.all([
      this.getOrCreateCode(userId),
      this.prisma.referral.groupBy({ by: ['status'], where: { referrerId: userId }, _count: { _all: true } }),
      this.config.get('referral_referee_voucher_vnd'),
      this.config.get('referral_referrer_voucher_vnd'),
      this.config.get('referral_monthly_cap'),
    ]);
    const count = (s: ReferralStatus) => grouped.find((g) => g.status === s)?._count._all ?? 0;
    return {
      code,
      stats: {
        registered: count('REGISTERED'),
        rewarded: count('REWARDED') + count('QUALIFIED'),
        rejected: count('REJECTED'),
      },
      rewards: { refereeVoucherVnd: refereeVnd, referrerVoucherVnd: referrerVnd, monthlyCap: cap },
    };
  }

  async list(userId: string, query: ReferralListQueryDto) {
    const where = { referrerId: userId };
    const [items, total] = await Promise.all([
      this.prisma.referral.findMany({
        where, orderBy: { createdAt: 'desc' }, ...skipTake(query),
        select: { id: true, status: true, createdAt: true, rewardedAt: true, referee: { select: { name: true } } },
      }),
      this.prisma.referral.count({ where }),
    ]);
    return paginate(
      items.map((r) => ({
        id: r.id,
        // Chỉ lộ tên đã che: người giới thiệu không cần biết đầy đủ thông tin của bạn bè
        refereeName: maskName(r.referee.name),
        // REJECTED là kết quả của kiểm tra gian lận nên không giải thích lý do cho người dùng
        status: r.status === ReferralStatus.REJECTED ? ReferralStatus.REGISTERED : r.status,
        createdAt: r.createdAt,
        rewardedAt: r.rewardedAt,
      })),
      total,
      query,
    );
  }

  // ─── Đăng ký bằng mã ──────────────────────────────────────────────────────

  /** Ghi nhận người đăng ký đến từ mã giới thiệu. Mã sai hoặc lỗi bất kỳ không được làm hỏng việc đăng ký. */
  async attachSafe(refereeId: string, rawCode: string | undefined) {
    if (!rawCode?.trim()) return;
    await this.attach(refereeId, rawCode).catch((e: unknown) => {
      this.logger.error(`Không ghi nhận được mã giới thiệu cho user ${refereeId}: ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  private async attach(refereeId: string, rawCode: string) {
    const code = normalizeCode(rawCode);
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true, status: true, email: true, phone: true },
    });
    if (!referrer || referrer.status !== 'ACTIVE') return;

    const referee = await this.prisma.user.findUniqueOrThrow({ where: { id: refereeId }, select: { id: true, email: true, phone: true } });

    let rejectReason: string | null = null;
    if (referrer.id === referee.id) rejectReason = RejectReason.SELF;
    else if (referrer.phone && referee.phone && referrer.phone === referee.phone) rejectReason = RejectReason.SAME_PHONE;
    else if (emailRoot(referrer.email) === emailRoot(referee.email)) rejectReason = RejectReason.SAME_EMAIL;

    await this.prisma.referral.create({
      data: {
        referrerId: referrer.id, refereeId, code,
        status: rejectReason ? ReferralStatus.REJECTED : ReferralStatus.REGISTERED,
        rejectReason,
      },
    });
  }

  async onEmailVerifiedSafe(refereeId: string) {
    await this.onEmailVerified(refereeId).catch((e: unknown) => {
      this.logger.error(`Không cấp được voucher chào mừng cho user ${refereeId}: ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  /** Voucher chào mừng chỉ cấp sau khi xác minh email, để không ai farm voucher bằng email ảo. */
  private async onEmailVerified(refereeId: string) {
    const referral = await this.prisma.referral.findUnique({ where: { refereeId } });
    if (!referral || referral.refereeVoucherId) return;

    const [value, validDays] = await Promise.all([
      this.config.get('referral_referee_voucher_vnd'),
      this.config.get('referral_voucher_valid_days'),
    ]);
    await this.prisma.$transaction(async (tx) => {
      // Khoá bằng update có điều kiện: gọi hai lần cùng lúc chỉ cấp một voucher
      const { count } = await tx.referral.updateMany({ where: { id: referral.id, refereeVoucherId: null }, data: { refereeVoucherId: 'pending' } });
      if (count === 0) return;
      const voucher = await issuePersonalVoucher(tx, {
        userId: refereeId, name: 'Quà chào mừng bạn mới', description: 'Tặng khi đăng ký bằng mã giới thiệu', value, validDays,
        source: VoucherSource.REFERRAL, codePrefix: 'RF', budgetId: REFERRAL_BUDGET_ID, budgetName: REFERRAL_BUDGET_NAME,
      });
      await tx.referral.update({ where: { id: referral.id }, data: { refereeVoucherId: voucher.id } });
      await tx.notification.create({
        data: {
          userId: refereeId, type: NotificationType.SYSTEM, title: 'Bạn nhận được voucher chào mừng',
          body: `Voucher ${value.toLocaleString('vi-VN')} ₫ (mã ${voucher.code}) đã có trong mục Voucher của tôi.`,
          data: { voucherId: voucher.id },
        },
      });
    });
  }

  // ─── Booking đầu tiên hoàn thành: thưởng người giới thiệu ─────────────────

  async onBookingCompletedSafe(bookingId: string) {
    await this.onBookingCompleted(bookingId).catch((e: unknown) => {
      this.logger.error(`Không xử lý được thưởng giới thiệu cho booking ${bookingId}: ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  async onBookingCompleted(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, select: { travelerId: true, status: true } });
    if (!booking || booking.status !== BookingStatus.COMPLETED) return;

    const referral = await this.prisma.referral.findUnique({ where: { refereeId: booking.travelerId } });
    // Referral chỉ tạo lúc đăng ký nên booking hoàn thành đầu tiên luôn gặp trạng thái REGISTERED
    if (!referral || referral.status !== ReferralStatus.REGISTERED) return;

    const [value, validDays, cap] = await Promise.all([
      this.config.get('referral_referrer_voucher_vnd'),
      this.config.get('referral_voucher_valid_days'),
      this.config.get('referral_monthly_cap'),
    ]);

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.referral.updateMany({
        where: { id: referral.id, status: ReferralStatus.REGISTERED },
        data: { status: ReferralStatus.QUALIFIED, qualifiedBookingId: bookingId },
      });
      if (count === 0) return;

      const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
      const rewardedThisMonth = await tx.referral.count({
        where: { referrerId: referral.referrerId, status: ReferralStatus.REWARDED, rewardedAt: { gte: monthStart } },
      });
      if (rewardedThisMonth >= cap) {
        await tx.referral.update({ where: { id: referral.id }, data: { status: ReferralStatus.REJECTED, rejectReason: RejectReason.CAP_REACHED } });
        return;
      }

      const voucher = await issuePersonalVoucher(tx, {
        userId: referral.referrerId, name: 'Thưởng giới thiệu bạn bè', description: 'Bạn của bạn đã hoàn thành đơn thuê đầu tiên',
        value, validDays, source: VoucherSource.REFERRAL, codePrefix: 'RF', budgetId: REFERRAL_BUDGET_ID, budgetName: REFERRAL_BUDGET_NAME,
      });
      await tx.referral.update({
        where: { id: referral.id },
        data: { status: ReferralStatus.REWARDED, referrerVoucherId: voucher.id, rewardedAt: new Date() },
      });
      await tx.notification.create({
        data: {
          userId: referral.referrerId, type: NotificationType.SYSTEM, title: 'Bạn nhận được voucher giới thiệu',
          body: `Bạn của bạn đã hoàn thành đơn thuê đầu tiên. Voucher ${value.toLocaleString('vi-VN')} ₫ (mã ${voucher.code}) đã có trong mục Voucher của tôi.`,
          data: { voucherId: voucher.id },
        },
      });
    });
  }
}

function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] ?? '';
  return parts.length > 1 ? `${parts[0][0]}. ${last}` : `${last.slice(0, 1)}***`;
}
