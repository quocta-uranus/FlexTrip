import type {
  DetailedReviewAnalysis,
  ReviewAnalysis,
} from '../../../src/modules/reviews/review-ai-analyzer.service';
import type { BinaryMetrics } from './metrics';
import type { ThresholdResult } from './threshold-analysis';

export type EvaluationMode = 'smoke' | 'quick' | 'full';
export type EvaluationStatus = 'COMPLETE' | 'INCOMPLETE';
export type Sentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export interface EvaluationCase {
  id: string;
  comment: string;
  rating: number;
  expected: {
    sentiment: Sentiment;
    spam: boolean;
    toxic: boolean;
    suspicious: boolean;
  };
  tags: string[];
  modes: EvaluationMode[];
  labelNotes?: string;
}

export interface EvaluationDataset {
  datasetVersion: string;
  cases: EvaluationCase[];
}

export interface CaseChecks {
  sentiment: boolean;
  spam: boolean;
  toxic: boolean;
  suspicious: boolean;
}

export interface SuccessfulCaseResult {
  id: string;
  tags: string[];
  expected: EvaluationCase['expected'];
  actual: ReviewAnalysis;
  checks: CaseChecks;
  passedAll: boolean;
  metadata: DetailedReviewAnalysis['metadata'];
  attempts: number;
}

export interface FailedCaseResult {
  id: string;
  tags: string[];
  errorType: 'API' | 'SCHEMA' | 'TIMEOUT' | 'RATE_LIMIT' | 'UNKNOWN';
  error: string;
  attempts: number;
}

export interface EvaluationCheckpoint {
  mode: EvaluationMode;
  model: string;
  promptVersion: string;
  datasetVersion: string;
  selectedCaseIds: string[];
  successful: SuccessfulCaseResult[];
  failed: FailedCaseResult[];
  startedAt: string;
  updatedAt: string;
}

export interface EvaluationReport {
  status: EvaluationStatus;
  stopReason: string | null;
  run: {
    mode: EvaluationMode;
    model: string;
    promptVersion: string;
    datasetVersion: string;
    startedAt: string;
    finishedAt: string;
  };
  progress: {
    dataset: number;
    completed: number;
    remaining: number;
    validPredictions: number;
    failedApiRequests: number;
    schemaFailures: number;
    coverage: number;
  };
  quality: {
    sentimentAccuracy: number;
    spam: BinaryMetrics;
    toxicity: BinaryMetrics;
    suspicious: BinaryMetrics;
  };
  reliability: {
    successfulRequestRate: number;
    failedRequests: number;
    schemaValidRate: number;
    retryAttempts: number;
  };
  performance: {
    averageLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    totalTokens: number | null;
    averageTokensPerReview: number | null;
  };
  thresholdAnalysis: {
    spam: ThresholdResult[];
    toxicity: ThresholdResult[];
    suspicious: ThresholdResult[];
    recommended: {
      spam: number | null;
      toxicity: number | null;
      suspicious: number | null;
    };
  };
  successful: SuccessfulCaseResult[];
  failed: FailedCaseResult[];
}
