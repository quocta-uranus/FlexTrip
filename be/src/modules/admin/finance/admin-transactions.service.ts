import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import { DateRangeQueryDto, resolveRange } from '../../../common/dto/date-range.dto';
import { toNumber } from '../../../common/money.util';
import { toCsv } from '../../../common/csv.util';
import { pctChange } from '../../../common/stats.util';
import { ListTransactionsQueryDto } from './dto/admin-finance.dto';

const EXPORT_LIMIT = 10_000;

const TX_INCLUDE = {
  booking: { select: { id: true, listing: { select: { provider: { select: { id: true, name: true } } } } } },
} satisfies Prisma.PaymentInclude;

type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof TX_INCLUDE }>;

function toItem(p: PaymentRow) {
  return {
    id: p.id, bookingId: p.bookingId, amount: toNumber(p.totalAmount)!, platformFee: toNumber(p.platformFee)!,
    providerNet: toNumber(p.providerNet)!, status: p.status, gateway: p.gateway,
    transactionId: p.gatewayTransId, provider: p.booking.listing.provider, createdAt: p.createdAt,
  };
}

function monthStartVn(): string {
  const now = new Date(Date.now() + 7 * 3600_000);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

@Injectable()
export class AdminTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  private where(q: ListTransactionsQueryDto): Prisma.PaymentWhereInput {
    const range = q.from || q.to ? resolveRange(q, 30) : null;
    return {
      ...(q.status ? { status: q.status } : {}),
      ...(q.providerId ? { booking: { listing: { providerId: q.providerId } } } : {}),
      ...(range ? { createdAt: { gte: range.from, lte: range.to } } : {}),
    };
  }

  async list(q: ListTransactionsQueryDto) {
    const where = this.where(q);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({ where, include: TX_INCLUDE, orderBy: { createdAt: 'desc' }, ...skipTake(q) }),
      this.prisma.payment.count({ where }),
    ]);
    return paginate(rows.map(toItem), total, q);
  }

  async exportCsv(q: ListTransactionsQueryDto): Promise<string> {
    const rows = await this.prisma.payment.findMany({
      where: this.where(q), include: TX_INCLUDE, orderBy: { createdAt: 'desc' }, take: EXPORT_LIMIT,
    });
    return toCsv(rows.map(toItem), [
      { header: 'Mã GD', value: (r) => r.id },
      { header: 'Booking', value: (r) => r.bookingId },
      { header: 'Provider', value: (r) => r.provider.name },
      { header: 'Số tiền', value: (r) => r.amount },
      { header: 'Phí sàn', value: (r) => r.platformFee },
      { header: 'Provider nhận', value: (r) => r.providerNet },
      { header: 'Trạng thái', value: (r) => r.status },
      { header: 'Cổng thanh toán', value: (r) => r.gateway },
      { header: 'Ngày tạo', value: (r) => r.createdAt },
    ]);
  }

  private async totals(from: Date, to: Date) {
    const createdAt = { gte: from, lte: to };
    const [paid, refunded] = await Promise.all([
      this.prisma.payment.aggregate({ where: { status: PaymentStatus.PAID, createdAt }, _sum: { totalAmount: true, platformFee: true } }),
      this.prisma.payment.aggregate({ where: { status: PaymentStatus.REFUNDED, createdAt }, _sum: { refundedAmount: true } }),
    ]);
    const revenue = toNumber(paid._sum.totalAmount) ?? 0;
    const commission = toNumber(paid._sum.platformFee) ?? 0;
    return { totalRevenue: revenue, platformCommission: commission, providerPayouts: revenue - commission, refundVolume: toNumber(refunded._sum.refundedAmount) ?? 0 };
  }

  async summary(q: DateRangeQueryDto) {
    const r = resolveRange({ from: q.from ?? monthStartVn(), to: q.to }, 30);
    const [cur, prev, recon] = await Promise.all([
      this.totals(r.from, r.to),
      this.totals(r.prevFrom, r.prevTo),
      this.prisma.$queryRaw<{ matched: number; pending: number; mismatch: number }[]>`
        SELECT
          COUNT(*) FILTER (WHERE "status"::text <> 'PAID')::int AS pending,
          COUNT(*) FILTER (WHERE "status"::text = 'PAID' AND "discrepancy" = 0)::int AS matched,
          COUNT(*) FILTER (WHERE "status"::text = 'PAID' AND "discrepancy" <> 0)::int AS mismatch
        FROM "Payout" WHERE "periodEnd" BETWEEN ${r.from}::date AND ${r.to}::date`,
    ]);
    const changes = Object.fromEntries(
      (Object.keys(cur) as (keyof typeof cur)[]).map((k) => [k, pctChange(cur[k], prev[k])]),
    );
    return { from: r.from, to: r.to, ...cur, changes, reconciliation: recon[0] };
  }
}
