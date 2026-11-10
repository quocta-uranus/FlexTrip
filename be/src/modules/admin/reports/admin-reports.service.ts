import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { RequestContext } from '../../../common/request-context';
import { ExportReportQueryDto } from './dto/admin-reports.dto';
import { ReportsService } from './reports.service';

const MAX_RANGE_DAYS = 366;
const DAY = 24 * 3600_000;

@Injectable()
export class AdminReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly reports: ReportsService,
  ) {}

  async export(q: ExportReportQueryDto, ctx: RequestContext): Promise<string> {
    const days = (Date.parse(q.to.slice(0, 10)) - Date.parse(q.from.slice(0, 10))) / DAY;
    if (days < 0) throw new BadRequestException({ code: 'INVALID_RANGE', message: 'Ngày bắt đầu phải trước ngày kết thúc.' });
    if (days >= MAX_RANGE_DAYS)
      throw new BadRequestException({ code: 'RANGE_TOO_LARGE', message: `Chỉ xuất tối đa ${MAX_RANGE_DAYS} ngày mỗi lần.` });

    const report = await this.reports.build(q.type, q.from, q.to);
    await this.prisma.$transaction((tx) =>
      this.audit.log(tx, ctx, {
        action: 'REPORT_EXPORTED', entityType: 'Report', after: { type: q.type, from: q.from, to: q.to, rows: report.rowCount },
      }),
    );
    return report.csv;
  }
}
