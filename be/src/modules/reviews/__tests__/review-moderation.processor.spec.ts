import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { Job, UnrecoverableError } from 'bullmq';
import {
  GroqApiError,
  GroqRateLimitError,
  ReviewAnalysisTimeoutError,
  ReviewAnalysisValidationError,
} from '../review-ai-analyzer.service';
import {
  REVIEW_ANALYZE_JOB,
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
    [new GroqRateLimitError(0), 'RATE_LIMITED'],
    [new ReviewAnalysisTimeoutError(), 'TIMEOUT'],
    [new GroqApiError(503), 'GROQ_UNAVAILABLE'],
  ])('keeps transient failures retryable', async (error, code) => {
    analyze.mockRejectedValueOnce(error);
    await expect(processor.process(job)).rejects.toThrow(code as string);
  });
});
