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

/** What the platform actually does: hide a review for spam or toxicity (suspicion alone only flags it). */
export interface PipelineQuality {
  /** Cases where the review should be hidden: expected spam or toxic. */
  shouldHide: number;
  rulesOnly: BinaryMetrics;
  aiOnly: BinaryMetrics;
  /** Rule filter OR AI: the production decision. */
  combined: BinaryMetrics;
  /** Cases the production decision gets wrong, for review of the dictionary and prompt. */
  missed: string[];
  wronglyHidden: string[];
}

/** What happens when the local classifiers answer first and the LLM is asked only for hard cases. */
export interface CascadeQuality {
  /** False when the classifier service could not be reached; nothing else is filled in then. */
  available: boolean;
  thresholds: { toxicClear: number; toxicBlock: number; sentimentMin: number };
  cases: number;
  /** Share of reviews the cascade still sends to the LLM. */
  aiCallRate: number;
  routes: Record<string, number>;
  hide: { cascade: BinaryMetrics; rulesAndAi: BinaryMetrics };
  sentimentAccuracy: { cascade: number; ai: number; local: number };
  /** The local models on their own: toxic probability >= 0.5 against the toxic label. */
  localToxicity: BinaryMetrics;
  /** Reviews answered locally whose hide decision or sentiment is wrong. */
  localWrong: Array<{ id: string; reason: string }>;
  averageLocalLatencyMs: number;
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
  pipeline: PipelineQuality;
  cascade?: CascadeQuality;
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
