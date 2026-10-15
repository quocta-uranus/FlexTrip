import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  GroqApiError,
  GroqRateLimitError,
  REVIEW_MODERATION_PROMPT_VERSION,
  ReviewAiAnalyzerService,
  ReviewAnalysisValidationError,
} from '../../../src/modules/reviews/review-ai-analyzer.service';
import { average, calculateBinaryMetrics, percentile } from './metrics';
import { analyzeThresholds, recommendThreshold } from './threshold-analysis';
import type {
  EvaluationCase,
  EvaluationCheckpoint,
  EvaluationDataset,
  EvaluationMode,
  EvaluationReport,
  FailedCaseResult,
  SuccessfulCaseResult,
} from './types';

const PROJECT_DIR = resolve(__dirname, '../../..');
const EVAL_DIR = resolve(PROJECT_DIR, 'evals/reviews');
const DATASET_PATH = resolve(EVAL_DIR, 'dataset/review-eval-dataset.json');
const RESULTS_DIR = resolve(EVAL_DIR, 'results');
const PRODUCTION_THRESHOLD = 70;
const MAX_ATTEMPTS = 3;
const REQUEST_DELAY_MS = Number(process.env.REVIEW_EVAL_DELAY_MS ?? 1_000);

let stopReason: string | null = null;
process.once('SIGINT', () => {
  stopReason = 'Evaluation was stopped by the user (SIGINT).';
});
process.once('SIGTERM', () => {
  stopReason = 'Evaluation was stopped by the process host (SIGTERM).';
});

const sleep = (milliseconds: number) =>
  new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));

class EvaluationCaseError extends Error {
  constructor(
    public readonly originalError: unknown,
    public readonly attempts: number,
  ) {
    super(
      originalError instanceof Error
        ? originalError.message
        : 'Unknown evaluation error',
    );
    this.name = 'EvaluationCaseError';
  }
}

function parseArguments(): { mode: EvaluationMode; resume: boolean } {
  const modeValue = process.argv
    .find((argument) => argument.startsWith('--mode='))
    ?.split('=')[1];
  const mode = (modeValue ?? 'smoke') as EvaluationMode;
  if (!['smoke', 'quick', 'full'].includes(mode))
    throw new Error('Mode must be smoke, quick, or full');
  return { mode, resume: process.argv.includes('--resume') };
}

function validateDataset(dataset: EvaluationDataset): void {
  if (!dataset.datasetVersion || !Array.isArray(dataset.cases))
    throw new Error('Dataset must contain datasetVersion and cases');
  const ids = new Set<string>();
  dataset.cases.forEach((item, index) => {
    if (!item.id || ids.has(item.id))
      throw new Error(`Dataset case ${index} has a missing or duplicate id`);
    ids.add(item.id);
    if (!item.comment.trim() || item.rating < 1 || item.rating > 5)
      throw new Error(`Dataset case ${item.id} has invalid review input`);
    if (
      !['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(item.expected.sentiment) ||
      typeof item.expected.spam !== 'boolean' ||
      typeof item.expected.toxic !== 'boolean' ||
      typeof item.expected.suspicious !== 'boolean'
    )
      throw new Error(`Dataset case ${item.id} has invalid expected labels`);
    if (!item.modes.includes('full'))
      throw new Error(`Dataset case ${item.id} must be included in full mode`);
  });

  const expectedCounts: Record<EvaluationMode, number> = {
    smoke: 10,
    quick: 30,
    full: 150,
  };
  for (const mode of ['smoke', 'quick', 'full'] as const) {
    const count = dataset.cases.filter((item) =>
      item.modes.includes(mode),
    ).length;
    if (count !== expectedCounts[mode])
      throw new Error(
        `${mode} mode requires ${expectedCounts[mode]} cases, found ${count}`,
      );
  }
}

async function saveJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function loadCheckpoint(
  path: string,
  expected: Pick<
    EvaluationCheckpoint,
    'mode' | 'model' | 'promptVersion' | 'datasetVersion'
  >,
): Promise<EvaluationCheckpoint> {
  const checkpoint = JSON.parse(
    await readFile(path, 'utf8'),
  ) as EvaluationCheckpoint;
  for (const field of [
    'mode',
    'model',
    'promptVersion',
    'datasetVersion',
  ] as const) {
    if (checkpoint[field] !== expected[field])
      throw new Error(
        `Checkpoint ${field} mismatch: ${checkpoint[field]} != ${expected[field]}`,
      );
  }
  return checkpoint;
}

function classifyError(error: unknown): FailedCaseResult['errorType'] {
  if (error instanceof EvaluationCaseError)
    return classifyError(error.originalError);
  if (error instanceof GroqRateLimitError) return 'RATE_LIMIT';
  if (error instanceof ReviewAnalysisValidationError) return 'SCHEMA';
  if (error instanceof GroqApiError) return 'API';
  if (
    error instanceof Error &&
    ['AbortError', 'TimeoutError'].includes(error.name)
  )
    return 'TIMEOUT';
  return 'UNKNOWN';
}

async function analyzeWithRetry(
  analyzer: ReviewAiAnalyzerService,
  item: EvaluationCase,
): Promise<SuccessfulCaseResult> {
  let lastError: unknown;
  let attempts = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    attempts = attempt;
    try {
      const detailed = await analyzer.analyzeDetailed({
        reviewId: item.id,
        comment: item.comment,
        rating: item.rating,
      });
      const checks = {
        sentiment: detailed.analysis.sentiment === item.expected.sentiment,
        spam:
          detailed.analysis.spamScore >= PRODUCTION_THRESHOLD ===
          item.expected.spam,
        toxic:
          detailed.analysis.toxicityScore >= PRODUCTION_THRESHOLD ===
          item.expected.toxic,
        suspicious:
          detailed.analysis.suspicionScore >= PRODUCTION_THRESHOLD ===
          item.expected.suspicious,
      };
      return {
        id: item.id,
        tags: item.tags,
        expected: item.expected,
        actual: detailed.analysis,
        checks,
        passedAll: Object.values(checks).every(Boolean),
        metadata: detailed.metadata,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof GroqRateLimitError ||
        (error instanceof GroqApiError &&
          (error.status >= 500 ||
            (error.status === 400 &&
              /Failed to (generate|validate) JSON/i.test(error.message)))) ||
        (error instanceof Error &&
          ['AbortError', 'TimeoutError'].includes(error.name));
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      const delay =
        error instanceof GroqRateLimitError
          ? error.retryAfterMs
          : 2_000 * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }
  throw new EvaluationCaseError(lastError, attempts);
}

function buildReport(
  checkpoint: EvaluationCheckpoint,
  selected: EvaluationCase[],
  reason: string | null,
): EvaluationReport {
  const successful = checkpoint.successful;
  const failed = checkpoint.failed;
  const attemptedIds = new Set([
    ...successful.map((item) => item.id),
    ...failed.map((item) => item.id),
  ]);
  const complete = !reason && attemptedIds.size === selected.length;
  const expectedSpam = successful.map((item) => item.expected.spam);
  const expectedToxic = successful.map((item) => item.expected.toxic);
  const expectedSuspicious = successful.map((item) => item.expected.suspicious);
  const spamScores = successful.map((item) => item.actual.spamScore);
  const toxicityScores = successful.map((item) => item.actual.toxicityScore);
  const suspicionScores = successful.map((item) => item.actual.suspicionScore);
  const spamThresholds = analyzeThresholds(expectedSpam, spamScores);
  const toxicityThresholds = analyzeThresholds(expectedToxic, toxicityScores);
  const suspiciousThresholds = analyzeThresholds(
    expectedSuspicious,
    suspicionScores,
  );
  const latencies = successful.map((item) => item.metadata.latencyMs);
  const knownTokens = successful
    .map((item) => item.metadata.totalTokens)
    .filter((value): value is number => value !== null);
  const schemaFailures = failed.filter(
    (item) => item.errorType === 'SCHEMA',
  ).length;

  return {
    status: complete ? 'COMPLETE' : 'INCOMPLETE',
    stopReason: reason,
    run: {
      mode: checkpoint.mode,
      model: checkpoint.model,
      promptVersion: checkpoint.promptVersion,
      datasetVersion: checkpoint.datasetVersion,
      startedAt: checkpoint.startedAt,
      finishedAt: new Date().toISOString(),
    },
    progress: {
      dataset: selected.length,
      completed: attemptedIds.size,
      remaining: selected.length - attemptedIds.size,
      validPredictions: successful.length,
      failedApiRequests: failed.filter((item) => item.errorType !== 'SCHEMA')
        .length,
      schemaFailures,
      coverage: selected.length ? successful.length / selected.length : 0,
    },
    quality: {
      sentimentAccuracy: successful.length
        ? successful.filter((item) => item.checks.sentiment).length /
          successful.length
        : 0,
      spam: calculateBinaryMetrics(
        expectedSpam,
        spamScores.map((score) => score >= PRODUCTION_THRESHOLD),
      ),
      toxicity: calculateBinaryMetrics(
        expectedToxic,
        toxicityScores.map((score) => score >= PRODUCTION_THRESHOLD),
      ),
      suspicious: calculateBinaryMetrics(
        expectedSuspicious,
        suspicionScores.map((score) => score >= PRODUCTION_THRESHOLD),
      ),
    },
    reliability: {
      successfulRequestRate: selected.length
        ? successful.length / selected.length
        : 0,
      failedRequests: failed.length,
      schemaValidRate:
        successful.length + schemaFailures
          ? successful.length / (successful.length + schemaFailures)
          : 0,
      retryAttempts:
        successful.reduce((sum, item) => sum + item.attempts - 1, 0) +
        failed.reduce((sum, item) => sum + item.attempts - 1, 0),
    },
    performance: {
      averageLatencyMs: average(latencies),
      p50LatencyMs: percentile(latencies, 50),
      p95LatencyMs: percentile(latencies, 95),
      totalTokens: knownTokens.length
        ? knownTokens.reduce((sum, value) => sum + value, 0)
        : null,
      averageTokensPerReview: knownTokens.length ? average(knownTokens) : null,
    },
    thresholdAnalysis: {
      spam: spamThresholds,
      toxicity: toxicityThresholds,
      suspicious: suspiciousThresholds,
      recommended: {
        spam: recommendThreshold(spamThresholds),
        toxicity: recommendThreshold(toxicityThresholds),
        suspicious: recommendThreshold(suspiciousThresholds),
      },
    },
    successful,
    failed,
  };
}

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const milliseconds = (value: number) => `${Math.round(value)} ms`;

function thresholdTable(
  results: EvaluationReport['thresholdAnalysis']['spam'],
): string {
  return [
    '| Threshold | Precision | Recall | F1 | False positive rate |',
    '|---:|---:|---:|---:|---:|',
    ...results.map(
      (item) =>
        `| ${item.threshold} | ${percent(item.precision)} | ${percent(item.recall)} | ${percent(item.f1)} | ${percent(item.falsePositiveRate)} |`,
    ),
  ].join('\n');
}

function toMarkdown(report: EvaluationReport): string {
  return `# Review AI Evaluation

- Status: **${report.status}**
- Stop reason: ${report.stopReason ?? 'None'}
- Mode: ${report.run.mode}
- Model: ${report.run.model}
- Prompt version: ${report.run.promptVersion}
- Dataset version: ${report.run.datasetVersion}

## Progress

| Dataset | Completed | Remaining | Valid predictions | Coverage |
|---:|---:|---:|---:|---:|
| ${report.progress.dataset} | ${report.progress.completed} | ${report.progress.remaining} | ${report.progress.validPredictions} | ${percent(report.progress.coverage)} |

## AI quality

| Metric | Precision | Recall | F1 | False positive rate |
|---|---:|---:|---:|---:|
| Spam | ${percent(report.quality.spam.precision)} | ${percent(report.quality.spam.recall)} | ${percent(report.quality.spam.f1)} | ${percent(report.quality.spam.falsePositiveRate)} |
| Toxicity | ${percent(report.quality.toxicity.precision)} | ${percent(report.quality.toxicity.recall)} | ${percent(report.quality.toxicity.f1)} | ${percent(report.quality.toxicity.falsePositiveRate)} |
| Suspicious | ${percent(report.quality.suspicious.precision)} | ${percent(report.quality.suspicious.recall)} | ${percent(report.quality.suspicious.f1)} | ${percent(report.quality.suspicious.falsePositiveRate)} |

Sentiment accuracy: **${percent(report.quality.sentimentAccuracy)}**

## Reliability and performance

- Successful request rate: ${percent(report.reliability.successfulRequestRate)}
- Failed requests: ${report.reliability.failedRequests}
- Schema valid rate: ${percent(report.reliability.schemaValidRate)}
- Retry attempts: ${report.reliability.retryAttempts}
- Average latency: ${milliseconds(report.performance.averageLatencyMs)}
- P50 latency: ${milliseconds(report.performance.p50LatencyMs)}
- P95 latency: ${milliseconds(report.performance.p95LatencyMs)}
- Total tokens: ${report.performance.totalTokens ?? 'Unavailable'}
- Average tokens/review: ${report.performance.averageTokensPerReview?.toFixed(1) ?? 'Unavailable'}

## Spam threshold analysis

${thresholdTable(report.thresholdAnalysis.spam)}

Recommended spam threshold: ${report.thresholdAnalysis.recommended.spam ?? 'Unavailable'}

## Toxicity threshold analysis

${thresholdTable(report.thresholdAnalysis.toxicity)}

Recommended toxicity threshold: ${report.thresholdAnalysis.recommended.toxicity ?? 'Unavailable'}

## Suspicious threshold analysis

${thresholdTable(report.thresholdAnalysis.suspicious)}

Recommended suspicious threshold: ${report.thresholdAnalysis.recommended.suspicious ?? 'Unavailable'}

## Failed cases

${report.failed.length ? report.failed.map((item) => `- ${item.id}: ${item.errorType} — ${item.error}`).join('\n') : 'None'}
`;
}

function printSummary(report: EvaluationReport): void {
  console.log(`
Review AI Evaluation
--------------------
Status:                 ${report.status}
Mode:                   ${report.run.mode}
Dataset:                ${report.progress.dataset}
Completed:              ${report.progress.completed}
Remaining:              ${report.progress.remaining}
Valid predictions:      ${report.progress.validPredictions}
Coverage:               ${percent(report.progress.coverage)}
Sentiment accuracy:     ${percent(report.quality.sentimentAccuracy)}
Spam F1:                ${percent(report.quality.spam.f1)}
Toxicity F1:            ${percent(report.quality.toxicity.f1)}
Suspicious F1:          ${percent(report.quality.suspicious.f1)}
Average latency:        ${milliseconds(report.performance.averageLatencyMs)}
P95 latency:            ${milliseconds(report.performance.p95LatencyMs)}
Total tokens:           ${report.performance.totalTokens ?? 'Unavailable'}
Retry attempts:         ${report.reliability.retryAttempts}
Stop reason:            ${report.stopReason ?? 'None'}
`);
}

async function main(): Promise<void> {
  const { mode, resume } = parseArguments();
  await mkdir(RESULTS_DIR, { recursive: true });
  let datasetContent: string;
  try {
    datasetContent = await readFile(DATASET_PATH, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      throw new Error(
        'Review evaluation dataset was not found. Copy evals/reviews/dataset/review-eval-dataset.example.json to review-eval-dataset.json and follow evals/reviews/README.md.',
      );
    throw error;
  }
  const dataset = JSON.parse(datasetContent) as EvaluationDataset;
  validateDataset(dataset);
  const selected = dataset.cases.filter((item) => item.modes.includes(mode));
  const model = process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b';
  const checkpointPath = resolve(RESULTS_DIR, `checkpoint-${mode}.json`);
  const identity = {
    mode,
    model,
    promptVersion: REVIEW_MODERATION_PROMPT_VERSION,
    datasetVersion: dataset.datasetVersion,
  };
  let checkpoint: EvaluationCheckpoint;
  if (resume) {
    checkpoint = await loadCheckpoint(checkpointPath, identity);
  } else {
    const now = new Date().toISOString();
    checkpoint = {
      ...identity,
      selectedCaseIds: selected.map((item) => item.id),
      successful: [],
      failed: [],
      startedAt: now,
      updatedAt: now,
    };
    await saveJson(checkpointPath, checkpoint);
  }

  const analyzer = new ReviewAiAnalyzerService(new ConfigService());
  const completedIds = new Set(checkpoint.successful.map((item) => item.id));
  const failedById = new Map(checkpoint.failed.map((item) => [item.id, item]));

  for (const item of selected) {
    if (stopReason || completedIds.has(item.id)) continue;
    try {
      const result = await analyzeWithRetry(analyzer, item);
      checkpoint.successful.push(result);
      completedIds.add(item.id);
      failedById.delete(item.id);
      console.log(
        `[${checkpoint.successful.length}/${selected.length}] ${item.id}: OK (${result.metadata.latencyMs} ms)`,
      );
    } catch (error) {
      const errorType = classifyError(error);
      const originalError =
        error instanceof EvaluationCaseError ? error.originalError : error;
      failedById.set(item.id, {
        id: item.id,
        tags: item.tags,
        errorType,
        error:
          originalError instanceof Error
            ? originalError.message
            : 'Unknown error',
        attempts: error instanceof EvaluationCaseError ? error.attempts : 1,
      });
      console.error(`[${item.id}] ${errorType}: evaluation request failed`);
      if (errorType === 'RATE_LIMIT')
        stopReason =
          'Groq rate limit or quota remained unavailable after retry.';
    }
    checkpoint.failed = [...failedById.values()];
    checkpoint.updatedAt = new Date().toISOString();
    await saveJson(checkpointPath, checkpoint);
    if (!stopReason && REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);
  }

  const report = buildReport(checkpoint, selected, stopReason);
  await saveJson(resolve(RESULTS_DIR, 'review-eval-results.json'), report);
  await saveJson(
    resolve(RESULTS_DIR, 'review-eval-failed-cases.json'),
    report.successful
      .filter((item) => !item.passedAll)
      .map((item) => ({
        id: item.id,
        tags: item.tags,
        expected: item.expected,
        actual: item.actual,
        checks: item.checks,
      })),
  );
  await writeFile(
    resolve(RESULTS_DIR, 'review-eval-report.md'),
    toMarkdown(report),
    'utf8',
  );
  printSummary(report);
  if (report.status === 'INCOMPLETE') process.exitCode = 2;
}

main().catch((error: unknown) => {
  console.error(
    `Evaluation could not start: ${error instanceof Error ? error.message : 'Unknown error'}`,
  );
  process.exitCode = 1;
});
