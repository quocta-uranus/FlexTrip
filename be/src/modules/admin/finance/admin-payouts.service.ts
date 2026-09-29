import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PayoutStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import { toNumber } from '../../../common/money.util';
import { toCsv } from '../../../common/csv.util';
import { RequestContext } from '../../../common/request-context';
import { GeneratePayoutsDto, ListPayoutsQueryDto, Reconciliation, UpdatePayoutDto } from './dto/admin-finance.dto';

const MAX_PERIOD_DAYS = 93;
const DAY = 24 * 3600_000;

const PAYOUT_INCLUDE = {
  provider: { select: { id: true, name: true, providerProfile: { select: { shopName: true, bankAccount: true } } } },
} satisfies Prisma.PayoutInclude;
type PayoutRow = Prisma.PayoutGetPayload<{ include: typeof PAYOUT_INCLUDE }>;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function reconciliationOf(p: { status: PayoutStatus; discrepancy: Prisma.Decimal | null }): Reconciliation {
  if (p.status !== PayoutStatus.PAID) return 'PENDING';
  return p.discrepancy?.isZero() ? 'MATCHED' : 'MISMATCH';
}

function toItem(p: PayoutRow) {
  return {
    id: p.id,
    provider: { id: p.provider.id, name: p.provider.name, shopName: p.provider.providerProfile?.shopName ?? null, bankAccount: p.provider.providerProfile?.bankAccount ?? null },
    periodStart: isoDate(p.periodStart), periodEnd: isoDate(p.periodEnd), paymentCount: p.paymentCount,
    grossAmount: toNumber(p.grossAmount)!, commissionAmount: toNumber(p.commissionAmount)!, expectedNet: toNumber(p.expectedNet)!,
    actualPaid: toNumber(p.actualPaid), discrepancy: toNumber(p.discrepancy), reconciliation: reconciliationOf(p),
    transferRef: p.transferRef, status: p.status, note: p.note, paidAt: p.paidAt,
  };
}

function reconciliationWhere(r?: Reconciliation): Prisma.PayoutWhereInput {
  if (r === 'PENDING') return { status: { not: PayoutStatus.PAID } };
  if (r === 'MATCHED') return { status: PayoutStatus.PAID, discrepancy: 0 };
  if (r === 'MISMATCH') return { status: PayoutStatus.PAID, discrepancy: { not: 0 } };
  return {};
}

@Injectable()
export class AdminPayoutsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async generate(dto: GeneratePayoutsDto, ctx: RequestContext) {
    const start = new Date(`${dto.periodStart}T00:00:00Z`);
    const end = new Date(`${dto.periodEnd}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start || (end.getTime() - start.getTime()) / DAY > MAX_PERIOD_DAYS)
      throw new BadRequestException({ code: 'INVALID_PERIOD', message: `Kỳ đối soát không hợp lệ (tối đa ${MAX_PERIOD_DAYS} ngày).` });
    const endExclusive = new Date(end.getTime() + DAY);

    const rows = await this.prisma.$queryRaw<
      { providerId: string; paymentCount: number; gross: Prisma.Decimal; commission: Prisma.Decimal }[]
    >`
      SELECT l."providerId" AS "providerId", COUNT(p.id)::int AS "paymentCount",
             SUM(p.amount) AS gross, SUM(p."platformFee") AS commission
      FROM "Payment" p
      JOIN "Booking" b ON b.id = p."bookingId"
      JOIN "Listing" l ON l.id = b."listingId"
      WHERE p.status::text = 'PAID' AND b.status::text = 'COMPLETED'
        AND b."endDate" >= ${start} AND b."endDate" < ${endExclusive}
      GROUP BY l."providerId"`;

    return this.prisma.$transaction(async (tx) => {
      const result = { created: 0, updated: 0, skipped: 0 };
      for (const r of rows) {
        const values = {
          paymentCount: r.paymentCount, grossAmount: r.gross, commissionAmount: r.commission,
          expectedNet: r.gross.minus(r.commission),
        };
        const key = { providerId_periodStart_periodEnd: { providerId: r.providerId, periodStart: start, periodEnd: end } };
        const existing = await tx.payout.findUnique({ where: key, select: { status: true } });
        if (!existing) {
          await tx.payout.create({ data: { providerId: r.providerId, periodStart: start, periodEnd: end, createdById: ctx.actorId, ...values } });
          result.created++;
        } else if (existing.status === PayoutStatus.PENDING) {
          await tx.payout.update({ where: key, data: values });
          result.updated++;
        } else {
          result.skipped++;
        }
      }
      await this.audit.log(tx, ctx, {
        action: 'PAYOUTS_GENERATED', entityType: 'Payout', entityId: null,
        after: { periodStart: dto.periodStart, periodEnd: dto.periodEnd, ...result },
      });
      return result;
    });
  }

  private where(q: ListPayoutsQueryDto): Prisma.PayoutWhereInput {
    return {
      ...(q.status ? { status: q.status } : {}),
      ...(q.providerId ? { providerId: q.providerId } : {}),
      ...reconciliationWhere(q.reconciliation),
    };
  }

  async list(q: ListPayoutsQueryDto) {
    const where = this.where(q);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payout.findMany({ where, include: PAYOUT_INCLUDE, orderBy: [{ periodEnd: 'desc' }, { createdAt: 'desc' }], ...skipTake(q) }),
      this.prisma.payout.count({ where }),
    ]);
    return paginate(rows.map(toItem), total, q);
  }

  async exportCsv(q: ListPayoutsQueryDto) {
    const rows = await this.prisma.payout.findMany({ where: this.where(q), include: PAYOUT_INCLUDE, orderBy: { periodEnd: 'desc' }, take: 10_000 });
    return toCsv(rows.map(toItem), [
      { header: 'Provider', value: (r) => r.provider.shopName ?? r.provider.name },
      { header: 'Kỳ từ', value: (r) => r.periodStart },
      { header: 'Kỳ đến', value: (r) => r.periodEnd },
      { header: 'Số GD', value: (r) => r.paymentCount },
      { header: 'Doanh thu', value: (r) => r.grossAmount },
      { header: 'Hoa hồng', value: (r) => r.commissionAmount },
      { header: 'Dự kiến chi', value: (r) => r.expectedNet },
      { header: 'Thực chi', value: (r) => r.actualPaid },
      { header: 'Chênh lệch', value: (r) => r.discrepancy },
      { header: 'Đối soát', value: (r) => r.reconciliation },
      { header: 'Trạng thái', value: (r) => r.status },
      { header: 'Mã CK', value: (r) => r.transferRef },
    ]);
  }

  async update(id: string, dto: UpdatePayoutDto, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const p = await tx.payout.findUnique({ where: { id } });
      if (!p) throw new NotFoundException({ code: 'PAYOUT_NOT_FOUND', message: 'Không tìm thấy payout.' });
      if (p.status === PayoutStatus.PAID && dto.status && dto.status !== PayoutStatus.PAID)
        throw new ConflictException({ code: 'PAYOUT_ALREADY_PAID', message: 'Payout đã chi trả, không thể đổi trạng thái.' });

      const status = dto.status ?? p.status;
      const actualPaid = dto.actualPaid !== undefined ? new Prisma.Decimal(dto.actualPaid) : p.actualPaid;
      const transferRef = dto.transferRef ?? p.transferRef;
      if (status === PayoutStatus.PAID && (actualPaid === null || !transferRef))
        throw new BadRequestException({ code: 'PAYMENT_DETAILS_REQUIRED', message: 'Cần nhập số tiền thực chi và mã chuyển khoản.' });

      const updated = await tx.payout.update({
        where: { id },
        data: {
          status, actualPaid, transferRef, note: dto.note ?? p.note,
          discrepancy: actualPaid === null ? null : actualPaid.minus(p.expectedNet),
          paidAt: status === PayoutStatus.PAID ? (p.paidAt ?? new Date()) : null,
        },
        include: PAYOUT_INCLUDE,
      });
      await this.audit.log(tx, ctx, {
        action: 'PAYOUT_UPDATED', entityType: 'Payout', entityId: id,
        before: { status: p.status, actualPaid: p.actualPaid, transferRef: p.transferRef, note: p.note },
        after: { status: updated.status, actualPaid: updated.actualPaid, transferRef: updated.transferRef, note: updated.note, discrepancy: updated.discrepancy },
      });
      return toItem(updated);
    });
  }
}
