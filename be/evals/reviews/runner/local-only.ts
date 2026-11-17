/**
 * Measures the parts of the pipeline that need no Groq quota: the rule filter, the local
 * PhoBERT models and the routing decision. Useful when the daily Groq token limit is used up.
 *
 *   npm run eval:reviews:local -- --set=holdout
 *
 * Reviews the cascade settles locally are scored completely. Reviews it sends to the LLM are
 * only counted, because their verdict comes from Groq.
 */
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  routeReview,
  type LocalClassification,
} from '../../../src/modules/reviews/review-cascade';
import { ReviewClassifierService } from '../../../src/modules/reviews/review-classifier.service';
import { moderateReviewWithRules } from '../../../src/modules/reviews/review-moderation.rules';
import { calculateBinaryMetrics } from './metrics';
import type { EvaluationDataset } from './types';

const HOLDOUT = process.argv.includes('--set=holdout');
const DATASET = resolve(
  __dirname,
  '../dataset',
  HOLDOUT ? 'review-eval-holdout.json' : 'review-eval-dataset.json',
);
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

async function main() {
  const dataset = JSON.parse(
    await readFile(DATASET, 'utf8'),
  ) as EvaluationDataset;
  const cases = dataset.cases;
  const classifier = new ReviewClassifierService(
    new ConfigService({
      REVIEW_CLASSIFIER_URL:
        process.env.REVIEW_CLASSIFIER_URL ?? 'http://127.0.0.1:8001',
    }),
  );
  const local: LocalClassification[] = [];
  for (let index = 0; index < cases.length; index += 16) {
    const batch = await classifier.classifyMany(
      cases.slice(index, index + 16).map((item) => item.comment),
    );
    if (!batch) throw new Error('The classifier service is not reachable');
    local.push(...batch);
  }

  const shouldHide = cases.map(
    (item) => item.expected.spam || item.expected.toxic,
  );
  const rules = cases.map((item) => moderateReviewWithRules(item.comment));
  const rulesMetrics = calculateBinaryMetrics(
    shouldHide,
    rules.map((rule) => rule.flagged),
  );
  const phobertMetrics = calculateBinaryMetrics(
    cases.map((item) => item.expected.toxic),
    local.map((item) => item.toxicity.toxic >= 0.5),
  );

  const routes: Record<string, number> = {};
  const settledWrong: string[] = [];
  const toLlm: { id: string; shouldHide: boolean }[] = [];
  let settled = 0;
  let sentimentRight = 0;
  cases.forEach((item, index) => {
    const route = routeReview({
      comment: item.comment,
      rating: item.rating,
      rule: rules[index],
      local: local[index],
    });
    if (route.route === 'AI') {
      routes[route.cause] = (routes[route.cause] ?? 0) + 1;
      toLlm.push({ id: item.id, shouldHide: shouldHide[index] });
      return;
    }
    settled += 1;
    routes[`LOCAL_${route.verdict}`] =
      (routes[`LOCAL_${route.verdict}`] ?? 0) + 1;
    const hides = route.verdict === 'TOXIC';
    const sentimentOk =
      local[index].sentiment.label === item.expected.sentiment;
    sentimentRight += sentimentOk ? 1 : 0;
    if (hides !== shouldHide[index])
      settledWrong.push(
        `${item.id} (${hides ? 'hidden by mistake' : 'should have been hidden'})`,
      );
    else if (!sentimentOk) settledWrong.push(`${item.id} (wrong sentiment)`);
  });

  console.log(`
Local-only evaluation: ${cases.length} reviews, ${shouldHide.filter(Boolean).length} should be hidden
------------------------------------------------------------------
Rule filter alone      precision ${percent(rulesMetrics.precision)}  recall ${percent(rulesMetrics.recall)}  F1 ${percent(rulesMetrics.f1)}  false positives ${percent(rulesMetrics.falsePositiveRate)}
PhoBERT toxicity alone precision ${percent(phobertMetrics.precision)}  recall ${percent(phobertMetrics.recall)}  F1 ${percent(phobertMetrics.f1)}  false positives ${percent(phobertMetrics.falsePositiveRate)}  (against the toxic label)

Cascade routing
  settled locally:     ${settled} (${percent(settled / cases.length)}), LLM calls saved
  sent to the LLM:     ${toLlm.length} (${toLlm.filter((item) => item.shouldHide).length} of them should be hidden)
  routes:              ${Object.entries(routes)
    .map(([name, count]) => `${name} ${count}`)
    .join(', ')}
  settled locally, sentiment accuracy: ${settled ? percent(sentimentRight / settled) : 'n/a'}
  settled locally but wrong: ${settledWrong.join(', ') || 'none'}
`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
