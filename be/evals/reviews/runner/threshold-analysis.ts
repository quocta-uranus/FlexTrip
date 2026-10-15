import { BinaryMetrics, calculateBinaryMetrics } from './metrics';

export const EVALUATION_THRESHOLDS = [50, 60, 70, 80, 90] as const;

export interface ThresholdResult extends BinaryMetrics {
  threshold: number;
}

export function analyzeThresholds(
  expected: boolean[],
  scores: number[],
): ThresholdResult[] {
  return EVALUATION_THRESHOLDS.map((threshold) => ({
    threshold,
    ...calculateBinaryMetrics(
      expected,
      scores.map((score) => score >= threshold),
    ),
  }));
}

export function recommendThreshold(results: ThresholdResult[]): number | null {
  if (
    !results.length ||
    results.every(
      (result) => result.truePositive + result.falseNegative === 0,
    ) ||
    results.every((result) => result.trueNegative + result.falsePositive === 0)
  )
    return null;
  return [...results].sort(
    (left, right) =>
      right.f1 - left.f1 ||
      left.falsePositiveRate - right.falsePositiveRate ||
      right.threshold - left.threshold,
  )[0].threshold;
}
