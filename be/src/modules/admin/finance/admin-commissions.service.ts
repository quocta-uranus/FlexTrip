import { Injectable } from '@nestjs/common';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LedgerStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import { DateRangeQueryDto, resolveRange } from '../../../common/dto/date-range.dto';
import { toNumber } from '../../../common/money.util';

export class ListCommissionsQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20;

  @ApiPropertyOptional() @IsOptional()
  staffId?: string;

  @ApiPropertyOptional({ enum: LedgerStatus }) @IsOptional()
  status?: LedgerStatus;
}

// CommissionLedger only has a payment relation; booking + staff fetched via payment.booking and staffUserId
const LEDGER_INCLUDE = {
  payment: {
    select: {
      id: true, gateway: true, totalAmount: true,
      booking: {
        select: {
          id: true, startDate: true, endDate: true,
          listing: { select: { title: true } },
          traveler: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.CommissionLedgerInclude;

type LedgerRow = Prisma.CommissionLedgerGetPayload<{ include: typeof LEDGER_INCLUDE }>;

@Injectable()
export class AdminCommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListCommissionsQueryDto) {
    const hasRange = q.from || q.to;
    const { from, to } = resolveRange(q, 30);
    const where: Prisma.CommissionLedgerWhereInput = {
      ...(hasRange ? { createdAt: { gte: from, lte: to } } : {}),
      ...(q.staffId ? { staffUserId: q.staffId } : {}),
      ...(q.status ? { status: q.status } : {}),
    };

    const { skip, take } = skipTake(q);

    const [rows, total, totals] = await Promise.all([
      this.prisma.commissionLedger.findMany({
        where, include: LEDGER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip, take,
      }),
      this.prisma.commissionLedger.count({ where }),
      this.prisma.commissionLedger.aggregate({
        where,
        _sum: { platformFee: true, staffFee: true, providerNet: true },
        _count: { _all: true },
      }),
    ]);

    // Batch-fetch staff names for rows that have staffUserId
    const staffIds = [...new Set(rows.map(r => r.staffUserId).filter(Boolean))] as string[];
    const staffMap = staffIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true } })
          .then(list => Object.fromEntries(list.map(u => [u.id, u.name])))
      : {} as Record<string, string>;

    return {
      ...paginate(rows.map(r => toRow(r, staffMap)), total, q),
      summary: {
        count: totals._count._all,
        platformFee: toNumber(totals._sum.platformFee) ?? 0,
        staffFee: toNumber(totals._sum.staffFee) ?? 0,
        providerNet: toNumber(totals._sum.providerNet) ?? 0,
      },
    };
  }

  async detail(bookingId: string) {
    const ledger = await this.prisma.commissionLedger.findFirst({
      where: { bookingId },
      include: LEDGER_INCLUDE,
    });
    if (!ledger) return null;

    const staff = ledger.staffUserId
      ? await this.prisma.user.findUnique({ where: { id: ledger.staffUserId }, select: { id: true, name: true, email: true } })
      : null;

    return { ...toRow(ledger, ledger.staffUserId && staff ? { [ledger.staffUserId]: staff.name } : {}), staff };
  }

  async byStaff(staffId: string, q: DateRangeQueryDto) {
    const { from, to } = resolveRange(q, 30);
    const where: Prisma.CommissionLedgerWhereInput = {
      staffUserId: staffId,
      status: LedgerStatus.SETTLED,
      createdAt: { gte: from, lte: to },
    };

    const [rows, agg, staff] = await Promise.all([
      this.prisma.commissionLedger.findMany({
        where,
        include: {
          payment: {
            select: {
              booking: { select: { id: true, startDate: true, endDate: true, listing: { select: { title: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.commissionLedger.aggregate({ where, _sum: { staffFee: true }, _count: { _all: true } }),
      this.prisma.user.findUnique({ where: { id: staffId }, select: { id: true, name: true, email: true } }),
    ]);

    return {
      staff,
      totalEarned: toNumber(agg._sum.staffFee) ?? 0,
      bookingCount: agg._count._all,
      rows: rows.map(r => ({
        bookingId: r.bookingId,
        listingTitle: r.payment?.booking?.listing?.title,
        startDate: r.payment?.booking?.startDate,
        endDate: r.payment?.booking?.endDate,
        staffFee: toNumber(r.staffFee),
        settledAt: r.settledAt,
      })),
    };
  }
}

function toRow(r: LedgerRow, staffMap: Record<string, string>) {
  return {
    id: r.id,
    bookingId: r.bookingId,
    listingTitle: r.payment?.booking?.listing?.title,
    travelerName: r.payment?.booking?.traveler?.name,
    startDate: r.payment?.booking?.startDate,
    endDate: r.payment?.booking?.endDate,
    gateway: r.payment?.gateway,
    platformFee: toNumber(r.platformFee),
    staffFee: toNumber(r.staffFee),
    providerNet: toNumber(r.providerNet),
    staffId: r.staffUserId,
    staffName: r.staffUserId ? (staffMap[r.staffUserId] ?? null) : null,
    status: r.status,
    settledAt: r.settledAt,
    createdAt: r.createdAt,
  };
}
