import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, UnrecoverableError } from 'bullmq';
import {
  REVIEW_ANALYZE_JOB,
  REVIEW_MODERATION_QUEUE,
  ReviewModerationJob,
} from './review-moderation.constants';
import { ReviewModerationService } from './review-moderation.service';
import {
  GroqApiError,
  GroqRateLimitError,
  GroqUnavailableError,
  ReviewAnalysisTimeoutError,
  ReviewAnalysisValidationError,
} from './review-ai-analyzer.service';

@Processor(REVIEW_MODERATION_QUEUE, {
  concurrency: 3,
  limiter: { max: 25, duration: 60_000 },
})
export class ReviewModerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReviewModerationProcessor.name);

  constructor(
    private readonly moderation: ReviewModerationService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<ReviewModerationJob>): Promise<void> {
    if (this.config.get<string>('REVIEW_MODERATION_WORKER_DISABLED') === 'true')
      return;
    if (job.name !== REVIEW_ANALYZE_JOB) {
      this.logger.warn(`Unknown review moderation job: ${job.name}`);
      return;
    }
    try {
      await this.moderation.analyze(job.data.reviewId);
    } catch (error) {
      if (error instanceof GroqRateLimitError) {
        this.logger.warn(
          `Groq rate limit for review ${job.data.reviewId}; retrying after ${error.retryAfterMs}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, error.retryAfterMs));
        throw new Error(error.code);
      }
      if (
        error instanceof ReviewAnalysisValidationError ||
        (error instanceof GroqApiError &&
          error.status >= 400 &&
          error.status < 500)
      )
        throw new UnrecoverableError('INVALID_AI_OUTPUT');
      if (error instanceof ReviewAnalysisTimeoutError)
        throw new Error(error.code);
      if (
        error instanceof GroqUnavailableError ||
        error instanceof GroqApiError
      )
        throw new Error('GROQ_UNAVAILABLE');
      throw new Error('GROQ_UNAVAILABLE');
    }
  }
}
