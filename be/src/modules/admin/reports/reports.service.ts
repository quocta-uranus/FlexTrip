import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma, ReportType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { toCsv } from '../../../common/csv.util';
import { resolveRange } from '../../../common/dto/date-range.dto';
import { toNumber } from '../../../common/money.util';

const ROW_LIMIT = 20_000;
const VN_OFFSET = Prisma.sql`INTERVAL '7 hours'`;

export const REPORT_LABELS: Record<ReportType, string> = {
  REVENUE: 'Doanh thu',
  BOOKINGS: 'Booking',
  COMMISSION: 'Hoa hồng',
};

export interface BuiltReport {
  csv: string;
  rowCount: number;
  filename: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** `from` / `to` are inclusive Vietnam calendar days (YYYY-MM-DD). */
  async build(type: ReportType, from: string, to: string): Promise<BuiltReport> {
    const range = resolveRange({ from, to }, 30);
    const body =
      type === ReportType.REVENUE ? await this.revenue(range)
      : type === ReportType.BOOKINGS ? await this.bookings(range)
      : await this.commission(range);
    return { ...body, filename: `bao-cao-${type.toLowerCase()}-${from}_${to}.csv` };
  }

  private async revenue({ from, to }: { from: Date; to: Date }) {
    const rows = await this.prisma.$queryRaw<
      { day: string; count: number; total: Prisma.Decimal; fee: Prisma.Decimal; net: Prisma.Decimal }[]
    >`
      SELECT to_char(date_trunc('day', p."createdAt" + ${VN_OFFSET}), 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS count, SUM(p."totalAmount") AS total,
             SUM(p."platformFee") AS fee, SUM(p."providerNet") AS net
      FROM "Payment" p
      WHERE p.status::text = ${PaymentStatus.PAID} AND p."createdAt" BETWEEN ${from} AND ${to}
      GROUP BY 1 ORDER BY 1`;
    const data = rows.map((r) => ({
      day: r.day, count: r.count, total: toNumber(r.total) ?? 0, fee: toNumber(r.fee) ?? 0, net: toNumber(r.net) ?? 0,
    }));
    const sum = (k: 'count' | 'total' | 'fee' | 'net') => data.reduce((n, r) => n + r[k], 0);
    const all = [...data, { day: 'Tổng', count: sum('count'), total: sum('total'), fee: sum('fee'), net: sum('net') }];
    return {
      rowCount: data.length,
      csv: toCsv(all, [
        { header: 'Ngày', value: (r) => r.day },
        { header: 'Số giao dịch', value: (r) => r.count },
        { header: 'Doanh thu (VND)', value: (r) => r.total },
        { header: 'Phí sàn (VND)', value: (r) => r.fee },
        { header: 'Provider nhận (VND)', value: (r) => r.net },
      ]),
    };
  }

  private async bookings({ from, to }: { from: Date; to: Date }) {
    const rows = await this.prisma.booking.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'asc' },
      take: ROW_LIMIT,
      select: {
        id: true, status: true, startDate: true, endDate: true, totalPrice: true, createdAt: true,
        traveler: { select: { name: true } },
        listing: { select: { title: true, provider: { select: { name: true } } } },
        payment: { select: { status: true } },
      },
    });
    return {
      rowCount: rows.length,
      csv: toCsv(rows, [
        { header: 'Mã booking', value: (r) => r.id },
        { header: 'Sản phẩm', value: (r) => r.listing.title },
        { header: 'Traveler', value: (r) => r.traveler.name },
        { header: 'Provider', value: (r) => r.listing.provider.name },
        { header: 'Ngày bắt đầu', value: (r) => r.startDate.toISOString().slice(0, 10) },
        { header: 'Ngày kết thúc', value: (r) => r.endDate.toISOString().slice(0, 10) },
        { header: 'Trạng thái', value: (r) => r.status },
        { header: 'Thanh toán', value: (r) => r.payment?.status ?? '' },
        { header: 'Tổng tiền (VND)', value: (r) => toNumber(r.totalPrice) },
        { header: 'Ngày tạo', value: (r) => r.createdAt },
      ]),
    };
  }

  private async commission({ from, to }: { from: Date; to: Date }) {
    const rows = await this.prisma.commissionLedger.findMany({
      where: { createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'asc' },
      take: ROW_LIMIT,
    });
    const staffIds = [...new Set(rows.map((r) => r.staffUserId).filter((id): id is string => !!id))];
    const staff = staffIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, name: true } })
      : [];
    const staffName = new Map(staff.map((s) => [s.id, s.name]));
    return {
      rowCount: rows.length,
      csv: toCsv(rows, [
        { header: 'Mã booking', value: (r) => r.bookingId },
        { header: 'Phí sàn (VND)', value: (r) => toNumber(r.platformFee) },
        { header: 'Hoa hồng staff (VND)', value: (r) => toNumber(r.staffFee) },
        { header: 'Provider nhận (VND)', value: (r) => toNumber(r.providerNet) },
        { header: 'Staff', value: (r) => (r.staffUserId ? staffName.get(r.staffUserId) ?? r.staffUserId : '') },
        { header: 'Trạng thái', value: (r) => r.status },
        { header: 'Ngày tạo', value: (r) => r.createdAt },
        { header: 'Ngày quyết toán', value: (r) => r.settledAt },
      ]),
    };
  }
}
