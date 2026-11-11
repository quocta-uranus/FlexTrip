import { Processor, WorkerHost } from '@nestjs/bullmq';
import { AdminReportSchedulesService } from './admin-report-schedules.service';
import { REPORT_SCHEDULE_QUEUE } from './report-schedule.constants';

@Processor(REPORT_SCHEDULE_QUEUE)
export class ReportScheduleProcessor extends WorkerHost {
  constructor(private readonly schedules: AdminReportSchedulesService) {
    super();
  }

  async process(): Promise<void> {
    await this.schedules.runDue();
  }
}
