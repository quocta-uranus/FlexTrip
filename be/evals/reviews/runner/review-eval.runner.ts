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
import {
  DEFAULT_CASCADE_THRESHOLDS,
  routeReview,
  type LocalClassification,
} from '../../../src/modules/reviews/review-cascade';
import { ReviewClassifierService } from '../../../src/modules/reviews/review-classifier.service';
import { moderateReviewWithRules } from '../../../src/modules/reviews/review-moderation.rules';
import { average, calculateBinaryMetrics, percentile } from './metrics';
import { analyzeThresholds, recommendThreshold } from './threshold-analysis';
import type {
  EvaluationCase,
  EvaluationCheckpoint,
  EvaluationDataset,
  EvaluationMode,
  CascadeQuality,
  EvaluationReport,
  FailedCaseResult,
  PipelineQuality,
  SuccessfulCaseResult,
} from './types';

const PROJECT_DIR = resolve(__dirname, '../../..');
const EVAL_DIR = resolve(PROJECT_DIR, 'evals/reviews');
// `--set=holdout` runs the separate held-out set. It has its own results folder so it never
// overwrites the main set, and its prompt/rules must not be tuned against it.
const HOLDOUT = process.argv.includes('--set=holdout');
const DATASET_PATH = resolve(
  EVAL_DIR,
  HOLDOUT
    ? 'dataset/review-eval-holdout.json'
    : 'dataset/review-eval-dataset.json',
);
const RESULTS_DIR = resolve(EVAL_DIR, HOLDOUT ? 'results/holdout' : 'results');
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
  const mode = (modeValue ?? (HOLDOUT ? 'full' : 'smoke')) as EvaluationMode;
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

  // The held-out set has no smoke/quick subsets: it is always run whole.
  if (HOLDOUT) return;
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

function buildPipelineQuality(
  selected: EvaluationCase[],
  successful: SuccessfulCaseResult[],
): PipelineQuality {
  const byId = new Map(selected.map((item) => [item.id, item]));
  const shouldHide = (item: EvaluationCase) =>
    item.expected.spam || item.expected.toxic;
  const ruleHides = (item: EvaluationCase) =>
    moderateReviewWithRules(item.comment).flagged;
  const aiHides = (result: SuccessfulCaseResult) =>
    result.actual.spamScore >= PRODUCTION_THRESHOLD ||
    result.actual.toxicityScore >= PRODUCTION_THRESHOLD;

  const scored = successful.map((result) => {
    const item = byId.get(result.id)!;
    return { item, ai: aiHides(result), rule: ruleHides(item) };
  });
  const expected = scored.map(({ item }) => shouldHide(item));
  const combined = scored.map(({ ai, rule }) => ai || rule);
  return {
    shouldHide: selected.filter(shouldHide).length,
    rulesOnly: calculateBinaryMetrics(
      selected.map(shouldHide),
      selected.map(ruleHides),
    ),
    aiOnly: calculateBinaryMetrics(
      expected,
      scored.map(({ ai }) => ai),
    ),
    combined: calculateBinaryMetrics(expected, combined),
    missed: scored
      .filter(({ item }, index) => shouldHide(item) && !combined[index])
      .map(({ item }) => item.id),
    wronglyHidden: scored
      .filter(({ item }, index) => !shouldHide(item) && combined[index])
      .map(({ item }) => item.id),
  };
}

async function buildCascadeQuality(
  selected: EvaluationCase[],
  successful: SuccessfulCaseResult[],
): Promise<CascadeQuality> {
  const thresholds = DEFAULT_CASCADE_THRESHOLDS;
  const none = calculateBinaryMetrics([], []);
  const unavailable: CascadeQuality = {
    available: false,
    thresholds,
    cases: 0,
    aiCallRate: 0,
    routes: {},
    hide: { cascade: none, rulesAndAi: none },
    sentimentAccuracy: { cascade: 0, ai: 0, local: 0 },
    localToxicity: none,
    localWrong: [],
    averageLocalLatencyMs: 0,
  };
  const classifier = new ReviewClassifierService(
    new ConfigService({
      REVIEW_CLASSIFIER_URL:
        process.env.REVIEW_CLASSIFIER_URL ?? 'http://127.0.0.1:8001',
    }),
  );
  const byId = new Map(selected.map((item) => [item.id, item]));
  const cases = successful.map((result) => byId.get(result.id)!);
  const local: LocalClassification[] = [];
  const started = Date.now();
  for (let index = 0; index < cases.length; index += 16) {
    const batch = await classifier.classifyMany(
      cases.slice(index, index + 16).map((item) => item.comment),
    );
    if (!batch) return unavailable;
    local.push(...batch);
  }
  const latency = (Date.now() - started) / Math.max(cases.length, 1);

  const routes: Record<string, number> = {};
  const wrong: CascadeQuality['localWrong'] = [];
  const expectedHide: boolean[] = [];
  const cascadeHide: boolean[] = [];
  const baselineHide: boolean[] = [];
  let aiCalls = 0;
  let cascadeSentiment = 0;
  let aiSentiment = 0;
  let localSentiment = 0;
  successful.forEach((result, index) => {
    const item = cases[index];
    const classification = local[index];
    const rule = moderateReviewWithRules(item.comment);
    const aiHides =
      result.actual.spamScore >= PRODUCTION_THRESHOLD ||
      result.actual.toxicityScore >= PRODUCTION_THRESHOLD;
    const route = routeReview(
      {
        comment: item.comment,
        rating: item.rating,
        rule,
        local: classification,
      },
      thresholds,
    );
    const shouldHide = item.expected.spam || item.expected.toxic;
    expectedHide.push(shouldHide);
    baselineHide.push(rule.flagged || aiHides);
    localSentiment +=
      classification.sentiment.label === item.expected.sentiment ? 1 : 0;
    aiSentiment += result.actual.sentiment === item.expected.sentiment ? 1 : 0;
    if (route.route === 'AI') {
      aiCalls += 1;
      routes[route.cause] = (routes[route.cause] ?? 0) + 1;
      cascadeHide.push(rule.flagged || aiHides);
      cascadeSentiment +=
        result.actual.sentiment === item.expected.sentiment ? 1 : 0;
      return;
    }
    routes[`LOCAL_${route.verdict}`] =
      (routes[`LOCAL_${route.verdict}`] ?? 0) + 1;
    const hides = route.verdict === 'TOXIC';
    cascadeHide.push(hides);
    const sentimentOk =
      classification.sentiment.label === item.expected.sentiment;
    cascadeSentiment += sentimentOk ? 1 : 0;
    if (hides !== shouldHide)
      wrong.push({
        id: item.id,
        reason: hides ? 'hidden by mistake' : 'should have been hidden',
      });
    else if (!sentimentOk)
      wrong.push({ id: item.id, reason: 'wrong sentiment' });
  });
  const total = Math.max(successful.length, 1);
  return {
    available: true,
    thresholds,
    cases: successful.length,
    aiCallRate: aiCalls / total,
    routes,
    hide: {
      cascade: calculateBinaryMetrics(expectedHide, cascadeHide),
      rulesAndAi: calculateBinaryMetrics(expectedHide, baselineHide),
    },
    sentimentAccuracy: {
      cascade: cascadeSentiment / total,
      ai: aiSentiment / total,
      local: localSentiment / total,
    },
    localToxicity: calculateBinaryMetrics(
      cases.map((item) => item.expected.toxic),
      local.map((item) => item.toxicity.toxic >= 0.5),
    ),
    localWrong: wrong,
    averageLocalLatencyMs: latency,
  };
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
    pipeline: buildPipelineQuality(selected, successful),
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

function cascadeMarkdown(report: EvaluationReport): string {
  const cascade = report.cascade;
  if (!cascade) return '';
  if (!cascade.available)
    return '## Cascade (local classifiers first)\n\nThe classifier service was not reachable, so this section was skipped.\n';
  const row = (
    name: string,
    metrics: EvaluationReport['pipeline']['combined'],
  ) =>
    `| ${name} | ${percent(metrics.precision)} | ${percent(metrics.recall)} | ${percent(metrics.f1)} | ${percent(metrics.falsePositiveRate)} |`;
  return `## Cascade (local classifiers first, LLM only for hard cases)

Thresholds: clear <= ${cascade.thresholds.toxicClear}, block >= ${cascade.thresholds.toxicBlock}, sentiment confidence >= ${cascade.thresholds.sentimentMin}. Computed over ${cascade.cases} reviews that have a valid LLM prediction, so the LLM answer for each hard case is the real one from this run.

- Reviews still sent to the LLM: **${percent(cascade.aiCallRate)}** (LLM calls saved: **${percent(1 - cascade.aiCallRate)}**)
- Average local classification time: ${milliseconds(cascade.averageLocalLatencyMs)} per review
- Routes: ${Object.entries(cascade.routes)
    .map(([name, count]) => `${name} ${count}`)
    .join(', ')}

| Hide decision | Precision | Recall | F1 | False positive rate |
|---|---:|---:|---:|---:|
${row('Rules + LLM for every review', cascade.hide.rulesAndAi)}
${row('Cascade', cascade.hide.cascade)}
${row('Local toxicity model alone (>= 0.5)', cascade.localToxicity)}

| Sentiment accuracy | |
|---|---:|
| LLM for every review | ${percent(cascade.sentimentAccuracy.ai)} |
| Cascade | ${percent(cascade.sentimentAccuracy.cascade)} |
| Local sentiment model alone | ${percent(cascade.sentimentAccuracy.local)} |

Answered locally but wrong: ${cascade.localWrong.map((item) => `${item.id} (${item.reason})`).join(', ') || 'none'}
`;
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

## Hide decision (spam or toxic)

The platform hides a review for spam or toxicity; suspicion alone only flags it for an admin. Expected-to-hide cases: ${report.pipeline.shouldHide}. Rules-only runs over every selected case; AI-only and combined run over the ${report.progress.validPredictions} valid AI predictions.

| Layer | Precision | Recall | F1 | False positive rate |
|---|---:|---:|---:|---:|
| Rules only | ${percent(report.pipeline.rulesOnly.precision)} | ${percent(report.pipeline.rulesOnly.recall)} | ${percent(report.pipeline.rulesOnly.f1)} | ${percent(report.pipeline.rulesOnly.falsePositiveRate)} |
| AI only | ${percent(report.pipeline.aiOnly.precision)} | ${percent(report.pipeline.aiOnly.recall)} | ${percent(report.pipeline.aiOnly.f1)} | ${percent(report.pipeline.aiOnly.falsePositiveRate)} |
| Rules + AI (production) | ${percent(report.pipeline.combined.precision)} | ${percent(report.pipeline.combined.recall)} | ${percent(report.pipeline.combined.f1)} | ${percent(report.pipeline.combined.falsePositiveRate)} |

Missed by the production decision: ${report.pipeline.missed.join(', ') || 'none'}
Hidden by mistake: ${report.pipeline.wronglyHidden.join(', ') || 'none'}

${cascadeMarkdown(report)}
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
Hide F1 (rules/AI/both): ${percent(report.pipeline.rulesOnly.f1)} / ${percent(report.pipeline.aiOnly.f1)} / ${percent(report.pipeline.combined.f1)}
${report.cascade?.available ? `Cascade: LLM calls saved ${percent(1 - report.cascade.aiCallRate)}, hide F1 ${percent(report.cascade.hide.cascade.f1)} (baseline ${percent(report.cascade.hide.rulesAndAi.f1)}), sentiment ${percent(report.cascade.sentimentAccuracy.cascade)} (LLM ${percent(report.cascade.sentimentAccuracy.ai)})\n` : ''}Average latency:        ${milliseconds(report.performance.averageLatencyMs)}
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
  if (process.argv.includes('--cascade'))
    report.cascade = await buildCascadeQuality(selected, report.successful);
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
