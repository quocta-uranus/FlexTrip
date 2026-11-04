import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ReportSchedule } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ResendService } from '../../auth/services/resend.service';
import { RequestContext } from '../../../common/request-context';
import { CreateReportScheduleDto, UpdateReportScheduleDto } from './dto/admin-reports.dto';
import {
  REPORT_SCHEDULE_QUEUE, REPORT_TICK_EVERY_MS, REPORT_TICK_JOB, REPORT_TICK_SCHEDULER_ID,
} from './report-schedule.constants';
import { nextRunAfter, reportPeriod } from './report-schedule.util';
import { REPORT_LABELS, ReportsService } from './reports.service';

const FREQUENCY_LABELS = { WEEKLY: 'hàng tuần', MONTHLY: 'hàng tháng' } as const;

@Injectable()
export class AdminReportSchedulesService implements OnModuleInit {
  private readonly logger = new Logger(AdminReportSchedulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly reports: ReportsService,
    private readonly resend: ResendService,
    @InjectQueue(REPORT_SCHEDULE_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(REPORT_TICK_SCHEDULER_ID, { every: REPORT_TICK_EVERY_MS }, { name: REPORT_TICK_JOB });
  }

  list() {
    return this.prisma.reportSchedule.findMany({
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  create(dto: CreateReportScheduleDto, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.reportSchedule.create({
        data: {
          name: dto.name.trim(), type: dto.type, frequency: dto.frequency,
          recipients: [...new Set(dto.recipients.map((e) => e.trim().toLowerCase()))],
          nextRunAt: nextRunAfter(dto.frequency, new Date()),
          createdById: ctx.actorId,
        },
      });
      await this.audit.log(tx, ctx, { action: 'REPORT_SCHEDULE_CREATED', entityType: 'ReportSchedule', entityId: schedule.id, after: schedule });
      return schedule;
    });
  }

  update(id: string, dto: UpdateReportScheduleDto, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.reportSchedule.findUnique({ where: { id } });
      if (!before) throw new NotFoundException({ code: 'REPORT_SCHEDULE_NOT_FOUND', message: 'Không tìm thấy lịch gửi báo cáo.' });
      const frequency = dto.frequency ?? before.frequency;
      // Re-arm on frequency change or resume, otherwise a long-paused schedule fires immediately on stale data.
      const rearm = dto.frequency !== undefined || (dto.isActive === true && !before.isActive);
      const schedule = await tx.reportSchedule.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.frequency !== undefined ? { frequency: dto.frequency } : {}),
          ...(dto.recipients !== undefined ? { recipients: [...new Set(dto.recipients.map((e) => e.trim().toLowerCase()))] } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(rearm ? { nextRunAt: nextRunAfter(frequency, new Date()) } : {}),
        },
      });
      await this.audit.log(tx, ctx, { action: 'REPORT_SCHEDULE_UPDATED', entityType: 'ReportSchedule', entityId: id, before, after: schedule });
      return schedule;
    });
  }

  remove(id: string, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.reportSchedule.findUnique({ where: { id } });
      if (!before) throw new NotFoundException({ code: 'REPORT_SCHEDULE_NOT_FOUND', message: 'Không tìm thấy lịch gửi báo cáo.' });
      await tx.reportSchedule.delete({ where: { id } });
      await this.audit.log(tx, ctx, { action: 'REPORT_SCHEDULE_DELETED', entityType: 'ReportSchedule', entityId: id, before });
      return { id };
    });
  }

  /** Sends immediately for a spot check; the regular schedule is left untouched. */
  async runNow(id: string) {
    const schedule = await this.prisma.reportSchedule.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundException({ code: 'REPORT_SCHEDULE_NOT_FOUND', message: 'Không tìm thấy lịch gửi báo cáo.' });
    return { sent: await this.deliver(schedule, new Date()) };
  }

  /** Called by the repeatable tick job. The nextRunAt compare-and-set makes overlapping ticks send once. */
  async runDue(now = new Date()) {
    const due = await this.prisma.reportSchedule.findMany({ where: { isActive: true, nextRunAt: { lte: now } } });
    for (const schedule of due) {
      const claimed = await this.prisma.reportSchedule.updateMany({
        where: { id: schedule.id, nextRunAt: schedule.nextRunAt },
        data: { nextRunAt: nextRunAfter(schedule.frequency, now) },
      });
      if (claimed.count) await this.deliver(schedule, schedule.nextRunAt);
    }
    return due.length;
  }

  private async deliver(schedule: ReportSchedule, runAt: Date): Promise<boolean> {
    const { from, to } = reportPeriod(schedule.frequency, runAt);
    let error: string | null = null;
    try {
      const report = await this.reports.build(schedule.type, from, to);
      const label = REPORT_LABELS[schedule.type];
      const sent = await this.resend.sendReport(
        schedule.recipients,
        `[FlexTrip] Báo cáo ${label.toLowerCase()} ${FREQUENCY_LABELS[schedule.frequency]} (${from} → ${to})`,
        `${schedule.name}: báo cáo ${label.toLowerCase()} từ ${from} đến ${to}, gồm ${report.rowCount} dòng dữ liệu.`,
        { filename: report.filename, content: Buffer.from(report.csv, 'utf8') },
      );
      if (!sent) error = 'Gửi email thất bại';
    } catch (e) {
      error = (e as Error).message.slice(0, 300);
      this.logger.error(`Report schedule ${schedule.id} failed: ${error}`);
    }
    await this.prisma.reportSchedule.update({
      where: { id: schedule.id },
      data: { lastRunAt: new Date(), lastError: error },
    });
    return error === null;
  }
}
