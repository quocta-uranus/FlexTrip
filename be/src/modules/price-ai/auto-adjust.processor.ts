import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { AutoAdjustService } from './auto-adjust.service';

export const PRICE_AUTO_ADJUST_QUEUE = 'price-auto-adjust';
export const NIGHTLY_JOB = 'nightly-price-adjust';

@Processor(PRICE_AUTO_ADJUST_QUEUE)
export class AutoAdjustProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(AutoAdjustProcessor.name);

  constructor(
    @InjectQueue(PRICE_AUTO_ADJUST_QUEUE) private queue: Queue,
    private autoAdjust: AutoAdjustService,
  ) {
    super();
  }

  // Schedule the nightly job at 2:00 AM every day
  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      NIGHTLY_JOB,
      { pattern: '0 2 * * *' }, // 2 AM daily
      { name: NIGHTLY_JOB, data: {}, opts: { removeOnComplete: 10, removeOnFail: 5 } },
    );
    this.logger.log('Nightly auto-adjust job scheduled at 02:00 daily');
  }

  async process(job: Job): Promise<void> {
    if (job.name !== NIGHTLY_JOB) return;

    this.logger.log('Running nightly price auto-adjust...');
    const result = await this.autoAdjust.runNightlyAdjust();
    this.logger.log(
      `Nightly auto-adjust done: ${result.adjusted} adjusted, ${result.skipped} skipped out of ${result.processed}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} failed: ${err.message}`);
  }
}
