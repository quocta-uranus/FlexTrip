import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SUPPORT_TRIAGE_QUEUE, SupportTriageJob, TRIAGE_TICKET_JOB } from './support.constants';
import { TicketTriageService } from './ticket-triage.service';

@Processor(SUPPORT_TRIAGE_QUEUE, { concurrency: 3 })
export class SupportTriageProcessor extends WorkerHost {
  private readonly logger = new Logger(SupportTriageProcessor.name);

  constructor(private readonly triage: TicketTriageService) {
    super();
  }

  async process(job: Job<SupportTriageJob>): Promise<void> {
    if (job.name !== TRIAGE_TICKET_JOB) {
      this.logger.warn(`Unknown support triage job: ${job.name}`);
      return;
    }
    await this.triage.triage(job.data.ticketId);
  }
}
