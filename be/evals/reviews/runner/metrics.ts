export interface BinaryCounts {
  truePositive: number;
  trueNegative: number;
  falsePositive: number;
  falseNegative: number;
}

export interface BinaryMetrics extends BinaryCounts {
  precision: number;
  recall: number;
  f1: number;
  falsePositiveRate: number;
}

const divide = (value: number, total: number) =>
  total === 0 ? 0 : value / total;

export function calculateBinaryMetrics(
  expected: boolean[],
  predicted: boolean[],
): BinaryMetrics {
  if (expected.length !== predicted.length)
    throw new Error('Expected and predicted arrays must have equal length');

  const counts: BinaryCounts = {
    truePositive: 0,
    trueNegative: 0,
    falsePositive: 0,
    falseNegative: 0,
  };
  expected.forEach((value, index) => {
    const actual = predicted[index];
    if (value && actual) counts.truePositive += 1;
    else if (!value && !actual) counts.trueNegative += 1;
    else if (!value && actual) counts.falsePositive += 1;
    else counts.falseNegative += 1;
  });

  const precision = divide(
    counts.truePositive,
    counts.truePositive + counts.falsePositive,
  );
  const recall = divide(
    counts.truePositive,
    counts.truePositive + counts.falseNegative,
  );
  return {
    ...counts,
    precision,
    recall,
    f1: divide(2 * precision * recall, precision + recall),
    falsePositiveRate: divide(
      counts.falsePositive,
      counts.falsePositive + counts.trueNegative,
    ),
  };
}

export function percentile(values: number[], percentage: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentage / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

export function average(values: number[]): number {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}
