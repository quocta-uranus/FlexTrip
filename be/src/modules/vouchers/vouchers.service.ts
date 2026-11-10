import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, CancelledBy, PaymentStatus, Prisma, RedemptionStatus, Role, VoucherAudience, VoucherStatus, VoucherType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { priceBooking, rentalDaysBetween } from '../booking/booking-price.util';
import { ValidateVoucherDto } from './dto/voucher.dto';
import { CONSUMING_STATUSES, VoucherErrorCode as E, VoucherErrorMessage } from './vouchers.constants';

type Db = Prisma.TransactionClient | PrismaService;

export interface VoucherQuoteInput {
  totalPrice: number;
  depositAmount: number;
  category: string;
}

export interface VoucherQuote {
  voucherId: string;
  code: string;
  name: string;
  discountAmount: number;
}

const normalizeCode = (code: string) => code.trim().toUpperCase();

function fail(code: string, message?: string): never {
  throw new BadRequestException({ code, message: message ?? VoucherErrorMessage[code] });
}

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Preview (không giữ chỗ) ──────────────────────────────────────────────

  async validate(userId: string, dto: ValidateVoucherDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: { price: true, depositRate: true, category: true, status: true },
    });
    if (!listing || listing.status !== 'ACTIVE') throw new NotFoundException('Listing không tồn tại');

    const rentalDays = rentalDaysBetween(new Date(dto.startDate), new Date(dto.endDate));
    if (rentalDays < 1) throw new BadRequestException('endDate không được trước startDate');

    const { totalPrice, depositAmount } = priceBooking({
      unitPrice: listing.price.toNumber(),
      quantity: dto.quantity ?? 1,
      rentalDays,
      depositRate: listing.depositRate.toNumber(),
    });
    const quote = await this.quote(userId, dto.code, { totalPrice, depositAmount, category: listing.category });
    const rentalAmount = totalPrice - depositAmount;

    return {
      code: quote.code,
      name: quote.name,
      discountAmount: quote.discountAmount,
      totalPrice,
      depositAmount,
      rentalAmount,
      payableRental: rentalAmount - quote.discountAmount,
    };
  }

  /** Kiểm tra mã và tính số tiền giảm; không ghi gì vào DB. */
  async quote(userId: string, rawCode: string, input: VoucherQuoteInput, db: Db = this.prisma): Promise<VoucherQuote> {
    const voucher = await db.voucher.findUnique({ where: { code: normalizeCode(rawCode) }, include: { budget: true } });
    if (!voucher) fail(E.NOT_FOUND);
    if (voucher.status !== VoucherStatus.ACTIVE) fail(E.INACTIVE);

    const now = new Date();
    if (voucher.startsAt > now) fail(E.NOT_STARTED);
    if (voucher.endsAt < now) fail(E.EXPIRED);

    const roles = await db.userRole.findMany({ where: { userId }, select: { role: true } });
    if (!roles.some((r) => r.role === Role.TRAVELER)) {
      fail(E.NOT_ELIGIBLE, 'Voucher chỉ dùng được khi thuê đồ với tài khoản Traveler');
    }
    if (voucher.audience === VoucherAudience.PERSONAL && voucher.assignedUserId !== userId) fail(E.NOT_ELIGIBLE);
    if (voucher.audience === VoucherAudience.NEW_USER && !(await this.isNewUser(userId, db))) fail(E.NOT_ELIGIBLE);

    if (voucher.category && voucher.category !== input.category) fail(E.CATEGORY_MISMATCH);
    if (input.totalPrice < voucher.minOrderValue.toNumber()) fail(E.MIN_ORDER);
    if (voucher.totalQuota !== null && voucher.usedCount >= voucher.totalQuota) fail(E.QUOTA_EXHAUSTED);

    const used = await db.voucherRedemption.count({
      where: { voucherId: voucher.id, userId, status: { in: [...CONSUMING_STATUSES] } },
    });
    if (used >= voucher.perUserLimit) fail(E.USER_LIMIT);

    const budgetLeft = this.budgetLeft(voucher.budget);
    if (!voucher.budget.isActive || budgetLeft <= 0) fail(E.BUDGET_EXHAUSTED);

    // Giảm vào tiền thuê trả sau, nên không bao giờ vượt phần tiền thuê (không tính cọc)
    const rentalAmount = input.totalPrice - input.depositAmount;
    let discount = voucher.type === VoucherType.PERCENT
      ? (input.totalPrice * voucher.value.toNumber()) / 100
      : voucher.value.toNumber();
    if (voucher.maxDiscount) discount = Math.min(discount, voucher.maxDiscount.toNumber());
    discount = Math.floor(Math.min(discount, rentalAmount, budgetLeft));
    if (discount <= 0) fail(E.NOT_APPLICABLE);

    return { voucherId: voucher.id, code: voucher.code, name: voucher.name, discountAmount: discount };
  }

  // ─── Giữ chỗ khi tạo booking (chạy trong transaction tạo booking) ─────────

  async reserve(tx: Prisma.TransactionClient, bookingId: string, userId: string, quote: VoucherQuote) {
    // Khoá voucher rồi ngân sách (luôn theo thứ tự này) để hai request cùng lúc không vượt quota/ngân sách
    await tx.$queryRaw`SELECT "id" FROM "Voucher" WHERE "id" = ${quote.voucherId} FOR UPDATE`;
    const voucher = await tx.voucher.findUniqueOrThrow({ where: { id: quote.voucherId } });
    await tx.$queryRaw`SELECT "id" FROM "PromoBudget" WHERE "id" = ${voucher.budgetId} FOR UPDATE`;
    const budget = await tx.promoBudget.findUniqueOrThrow({ where: { id: voucher.budgetId } });

    if (voucher.status !== VoucherStatus.ACTIVE || voucher.endsAt < new Date()) fail(E.INACTIVE);
    if (voucher.totalQuota !== null && voucher.usedCount >= voucher.totalQuota) fail(E.QUOTA_EXHAUSTED);
    const used = await tx.voucherRedemption.count({
      where: { voucherId: voucher.id, userId, status: { in: [...CONSUMING_STATUSES] } },
    });
    if (used >= voucher.perUserLimit) fail(E.USER_LIMIT);
    if (!budget.isActive || this.budgetLeft(budget) < quote.discountAmount) fail(E.BUDGET_EXHAUSTED);

    await tx.voucher.update({ where: { id: voucher.id }, data: { usedCount: { increment: 1 } } });
    await tx.promoBudget.update({ where: { id: budget.id }, data: { reservedAmount: { increment: quote.discountAmount } } });
    return tx.voucherRedemption.create({
      data: { voucherId: voucher.id, userId, bookingId, discountAmount: quote.discountAmount },
    });
  }

  // ─── Thu tiền thuê xong: ngân sách chuyển từ "giữ chỗ" sang "đã chi" ──────

  /** Trả về số tiền giảm đã chi (0 nếu booking không dùng voucher hoặc đã chi rồi). */
  async markApplied(tx: Prisma.TransactionClient, bookingId: string): Promise<number> {
    const redemption = await tx.voucherRedemption.findUnique({ where: { bookingId } });
    if (!redemption || redemption.status !== RedemptionStatus.RESERVED) return 0;

    const { count } = await tx.voucherRedemption.updateMany({
      where: { id: redemption.id, status: RedemptionStatus.RESERVED },
      data: { status: RedemptionStatus.APPLIED, appliedAt: new Date() },
    });
    if (count === 0) return 0;

    const amount = redemption.discountAmount.toNumber();
    const { budgetId } = await tx.voucher.findUniqueOrThrow({ where: { id: redemption.voucherId }, select: { budgetId: true } });
    await tx.promoBudget.update({
      where: { id: budgetId },
      data: { reservedAmount: { decrement: amount }, spentAmount: { increment: amount } },
    });
    await tx.promoBudgetTransaction.create({
      data: { budgetId, redemptionId: redemption.id, amount: -amount, note: `Giảm giá booking ${bookingId}` },
    });
    return amount;
  }

  // ─── Booking bị huỷ / hết hạn ─────────────────────────────────────────────

  /**
   * Traveler huỷ thì mất lượt dùng; provider huỷ/từ chối thì được trả lại. Chưa trả cọc (hết hạn giữ chỗ) cũng trả
   * lại vì traveler chưa thực sự dùng voucher. Phải gọi sau khi booking đã chuyển sang CANCELLED.
   */
  async onBookingCancelled(bookingId: string, cancelledBy: CancelledBy) {
    const redemption = await this.prisma.voucherRedemption.findUnique({
      where: { bookingId },
      include: { voucher: { select: { budgetId: true } }, booking: { select: { payment: { select: { status: true } } } } },
    });
    if (!redemption) return;
    if (redemption.status !== RedemptionStatus.RESERVED && redemption.status !== RedemptionStatus.APPLIED) return;

    // PENDING/FAILED nghĩa là cọc chưa vào; các trạng thái còn lại (kể cả REFUNDED do chính lần huỷ này) là đã trả cọc
    const paymentStatus = redemption.booking.payment?.status;
    const depositPaid = !!paymentStatus && paymentStatus !== PaymentStatus.PENDING && paymentStatus !== PaymentStatus.FAILED;

    let action: 'RELEASE' | 'FORFEIT' | 'KEEP';
    if (cancelledBy === CancelledBy.PROVIDER) action = 'RELEASE';
    else if (redemption.status === RedemptionStatus.APPLIED) action = 'KEEP';
    else action = depositPaid ? 'FORFEIT' : 'RELEASE';
    if (action === 'KEEP') return;

    const amount = redemption.discountAmount.toNumber();
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Voucher" WHERE "id" = ${redemption.voucherId} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "PromoBudget" WHERE "id" = ${redemption.voucher.budgetId} FOR UPDATE`;

      const { count } = await tx.voucherRedemption.updateMany({
        where: { id: redemption.id, status: redemption.status },
        data: {
          status: action === 'RELEASE' ? RedemptionStatus.RELEASED : RedemptionStatus.FORFEITED,
          releasedAt: new Date(),
        },
      });
      if (count === 0) return;

      if (action === 'RELEASE') {
        await tx.voucher.update({ where: { id: redemption.voucherId }, data: { usedCount: { decrement: 1 } } });
      }
      if (redemption.status === RedemptionStatus.APPLIED) {
        // Chỉ xảy ra khi provider huỷ sau khi đã thu tiền thuê. Escrow giữ nguyên như phần tiền traveler đã trả
        // (luồng hoàn tiền hiện tại cũng không trừ escrow), chỉ trả lại ngân sách và lượt dùng.
        await tx.promoBudget.update({
          where: { id: redemption.voucher.budgetId },
          data: { spentAmount: { decrement: amount } },
        });
        await tx.promoBudgetTransaction.create({
          data: { budgetId: redemption.voucher.budgetId, redemptionId: redemption.id, amount, note: `Hoàn giảm giá booking ${bookingId}` },
        });
      } else {
        await tx.promoBudget.update({
          where: { id: redemption.voucher.budgetId },
          data: { reservedAmount: { decrement: amount } },
        });
      }
    });
  }

  // ─── Voucher của tôi ──────────────────────────────────────────────────────

  async mine(userId: string) {
    const now = new Date();
    const candidates = await this.prisma.voucher.findMany({
      where: {
        status: VoucherStatus.ACTIVE,
        startsAt: { lte: now },
        endsAt: { gte: now },
        OR: [
          { audience: { in: [VoucherAudience.ALL, VoucherAudience.NEW_USER] } },
          { assignedUserId: userId },
        ],
      },
      include: { budget: true },
      orderBy: { endsAt: 'asc' },
    });

    const usage = await this.prisma.voucherRedemption.groupBy({
      by: ['voucherId'],
      where: { userId, status: { in: [...CONSUMING_STATUSES] }, voucherId: { in: candidates.map((v) => v.id) } },
      _count: { _all: true },
    });
    const usedBy = new Map(usage.map((u) => [u.voucherId, u._count._all]));
    const isNew = candidates.some((v) => v.audience === VoucherAudience.NEW_USER) ? await this.isNewUser(userId) : false;

    const available = candidates
      .filter((v) => v.budget.isActive && this.budgetLeft(v.budget) > 0)
      .filter((v) => v.totalQuota === null || v.usedCount < v.totalQuota)
      .filter((v) => (usedBy.get(v.id) ?? 0) < v.perUserLimit)
      .filter((v) => v.audience !== VoucherAudience.NEW_USER || isNew)
      .map((v) => this.toView(v));

    const history = await this.prisma.voucherRedemption.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { voucher: { select: { code: true, name: true } } },
    });

    return {
      available,
      history: history.map((h) => ({
        id: h.id,
        code: h.voucher.code,
        name: h.voucher.name,
        bookingId: h.bookingId,
        discountAmount: h.discountAmount.toNumber(),
        status: h.status,
        createdAt: h.createdAt,
      })),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private budgetLeft(budget: { totalAmount: Prisma.Decimal; spentAmount: Prisma.Decimal; reservedAmount: Prisma.Decimal }) {
    return budget.totalAmount.toNumber() - budget.spentAmount.toNumber() - budget.reservedAmount.toNumber();
  }

  private async isNewUser(userId: string, db: Db = this.prisma) {
    const count = await db.booking.count({ where: { travelerId: userId, status: { not: BookingStatus.CANCELLED } } });
    return count === 0;
  }

  private toView(v: Prisma.VoucherGetPayload<object>) {
    return {
      id: v.id,
      code: v.code,
      name: v.name,
      description: v.description,
      type: v.type,
      value: v.value.toNumber(),
      maxDiscount: v.maxDiscount?.toNumber() ?? null,
      minOrderValue: v.minOrderValue.toNumber(),
      category: v.category,
      audience: v.audience,
      endsAt: v.endsAt,
    };
  }
}
