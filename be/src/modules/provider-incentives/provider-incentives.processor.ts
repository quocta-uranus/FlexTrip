import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { NIGHTLY_INCENTIVE_JOB, PROVIDER_INCENTIVE_QUEUE } from './provider-incentives.constants';
import { ProviderIncentivesService } from './provider-incentives.service';

@Processor(PROVIDER_INCENTIVE_QUEUE)
export class ProviderIncentivesProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(ProviderIncentivesProcessor.name);

  constructor(
    @InjectQueue(PROVIDER_INCENTIVE_QUEUE) private readonly queue: Queue,
    private readonly service: ProviderIncentivesService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      NIGHTLY_INCENTIVE_JOB,
      { pattern: '0 3 * * *' },
      { name: NIGHTLY_INCENTIVE_JOB, data: {}, opts: { removeOnComplete: 10, removeOnFail: 5 } },
    );
  }

  async process(job: Job) {
    if (job.name !== NIGHTLY_INCENTIVE_JOB) return;
    const r = await this.service.runNightly();
    this.logger.log(`Provider incentives: ${r.processed} xử lý, ${r.topRated} top-rated, ${r.failed} lỗi`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} failed: ${err.message}`);
  }
}
