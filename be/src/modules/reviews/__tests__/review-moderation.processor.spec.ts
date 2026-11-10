import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { Job, UnrecoverableError, Worker } from 'bullmq';
import {
  GroqApiError,
  GroqRateLimitError,
  ReviewAnalysisTimeoutError,
  ReviewAnalysisValidationError,
} from '../review-ai-analyzer.service';
import {
  REVIEW_ANALYZE_JOB,
  REVIEW_SWEEP_JOB,
  ReviewModerationJob,
} from '../review-moderation.constants';
import { ReviewModerationProcessor } from '../review-moderation.processor';
import { ReviewModerationService } from '../review-moderation.service';

describe('REVIEW-03 moderation retry policy', () => {
  const analyze = jest.fn<ReviewModerationService['analyze']>();
  const moderation = { analyze } as unknown as ReviewModerationService;
  const config = {
    get: jest.fn(() => undefined),
  } as unknown as ConfigService;
  const processor = new ReviewModerationProcessor(moderation, config);
  const job = {
    name: REVIEW_ANALYZE_JOB,
    data: { reviewId: 'review-1' },
  } as Job<ReviewModerationJob>;

  beforeEach(() => analyze.mockReset());

  it.each([
    new ReviewAnalysisValidationError('invalid JSON'),
    new GroqApiError(400, 'json_validate_failed'),
  ])('does not retry permanent output errors', async (error) => {
    analyze.mockRejectedValueOnce(error);
    await expect(processor.process(job)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
  });

  it.each([
    [new ReviewAnalysisTimeoutError(), 'TIMEOUT'],
    [new GroqApiError(503), 'GROQ_UNAVAILABLE'],
  ])('keeps transient failures retryable', async (error, code) => {
    analyze.mockRejectedValueOnce(error);
    await expect(processor.process(job)).rejects.toThrow(code as string);
  });

  it('pauses the queue through BullMQ instead of sleeping when Groq rate-limits', async () => {
    const rateLimitQueue = jest.fn<ReviewModerationService['rateLimitQueue']>();
    const limited = new ReviewModerationProcessor(
      { analyze, rateLimitQueue } as unknown as ReviewModerationService,
      config,
    );
    analyze.mockRejectedValueOnce(new GroqRateLimitError(1_500));

    await expect(limited.process(job)).rejects.toThrow(
      Worker.RateLimitError().message,
    );
    expect(rateLimitQueue).toHaveBeenCalledWith(1_500);
  });

  describe('manual fallback', () => {
    const escalateToManual =
      jest.fn<ReviewModerationService['escalateToManual']>();
    const sweepStalePending =
      jest.fn<ReviewModerationService['sweepStalePending']>();
    const remindUnreviewedBookings =
      jest.fn<ReviewModerationService['remindUnreviewedBookings']>();
    const p = new ReviewModerationProcessor(
      {
        analyze,
        escalateToManual,
        sweepStalePending,
        remindUnreviewedBookings,
      } as unknown as ReviewModerationService,
      config,
    );
    const failedJob = (attemptsMade: number) =>
      ({
        name: REVIEW_ANALYZE_JOB,
        data: { reviewId: 'review-1' },
        attemptsMade,
        opts: { attempts: 3 },
      }) as unknown as Job<ReviewModerationJob>;

    beforeEach(() => {
      escalateToManual.mockReset().mockResolvedValue(true);
      sweepStalePending.mockReset();
      remindUnreviewedBookings.mockReset().mockResolvedValue(0);
    });

    it('keeps the review pending while retries remain', async () => {
      await p.onFailed(failedJob(1), new Error('TIMEOUT'));
      expect(escalateToManual).not.toHaveBeenCalled();
    });

    it('escalates to manual moderation once retries are exhausted', async () => {
      await p.onFailed(failedJob(3), new Error('TIMEOUT'));
      expect(escalateToManual).toHaveBeenCalledWith('review-1');
    });

    it('escalates immediately on permanent failures', async () => {
      await p.onFailed(
        failedJob(1),
        new UnrecoverableError('INVALID_AI_OUTPUT'),
      );
      expect(escalateToManual).toHaveBeenCalledWith('review-1');
    });

    it('runs the sweeper job', async () => {
      sweepStalePending.mockResolvedValue({
        requeued: 0,
        escalated: 0,
        skipped: 0,
      });
      await p.process({
        name: REVIEW_SWEEP_JOB,
        data: {},
      } as unknown as Job<ReviewModerationJob>);
      expect(sweepStalePending).toHaveBeenCalled();
      expect(remindUnreviewedBookings).toHaveBeenCalled();
    });
  });
});
