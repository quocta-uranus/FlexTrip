import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { LoyaltyMaintenanceService } from './loyalty-maintenance.service';

export const LOYALTY_MAINTENANCE_QUEUE = 'loyalty-maintenance';
const NIGHTLY_JOB = 'nightly-loyalty-maintenance';

@Processor(LOYALTY_MAINTENANCE_QUEUE)
export class LoyaltyMaintenanceProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(LoyaltyMaintenanceProcessor.name);

  constructor(
    @InjectQueue(LOYALTY_MAINTENANCE_QUEUE) private readonly queue: Queue,
    private readonly service: LoyaltyMaintenanceService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      NIGHTLY_JOB,
      { pattern: '0 4 * * *' },
      { name: NIGHTLY_JOB, data: {}, opts: { removeOnComplete: 10, removeOnFail: 5 } },
    );
  }

  async process(job: Job) {
    if (job.name !== NIGHTLY_JOB) return;
    this.logger.log(`Loyalty maintenance: ${JSON.stringify(await this.service.runNightly())}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} failed: ${err.message}`);
  }
}
