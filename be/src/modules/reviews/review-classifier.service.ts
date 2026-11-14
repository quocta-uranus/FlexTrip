import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LocalClassification } from './review-cascade';

const REQUEST_TIMEOUT_MS = 4_000;
const FAILURES_BEFORE_PAUSE = 3;
const PAUSE_MS = 30_000;

interface ClassifierResponse {
  results: Array<{
    toxicity: { toxic: number; label: string };
    sentiment: {
      label: LocalClassification['sentiment']['label'];
      confidence: number;
    };
  }>;
}

/**
 * Client for the local Vietnamese classifier service (be/ml/review-classifier).
 * The service is optional: without REVIEW_CLASSIFIER_URL, or when it fails, every
 * method returns null and moderation falls back to the language model for everything.
 */
@Injectable()
export class ReviewClassifierService {
  private readonly logger = new Logger(ReviewClassifierService.name);
  private failures = 0;
  private pausedUntil = 0;

  constructor(private readonly config: ConfigService) {}

  private get url(): string | null {
    return this.config.get<string>('REVIEW_CLASSIFIER_URL')?.trim() || null;
  }

  get enabled(): boolean {
    return this.url !== null;
  }

  async classify(text: string): Promise<LocalClassification | null> {
    return (await this.classifyMany([text]))?.[0] ?? null;
  }

  async classifyMany(texts: string[]): Promise<LocalClassification[] | null> {
    const url = this.url;
    if (!url || Date.now() < this.pausedUntil) return null;
    try {
      const response = await fetch(`${url.replace(/\/$/, '')}/classify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ texts }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const body = (await response.json()) as ClassifierResponse;
      if (body.results?.length !== texts.length)
        throw new Error('unexpected result count');
      this.failures = 0;
      return body.results;
    } catch (error) {
      this.failures += 1;
      if (this.failures >= FAILURES_BEFORE_PAUSE) {
        this.pausedUntil = Date.now() + PAUSE_MS;
        this.failures = 0;
        this.logger.warn(
          `Classifier unavailable, using the language model only for ${PAUSE_MS / 1000}s`,
        );
      }
      this.logger.debug(
        `Classifier request failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }
}
