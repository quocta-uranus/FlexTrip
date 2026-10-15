import {
  average,
  calculateBinaryMetrics,
  percentile,
} from '../../../../evals/reviews/runner/metrics';
import {
  analyzeThresholds,
  recommendThreshold,
} from '../../../../evals/reviews/runner/threshold-analysis';

describe('Review AI evaluation metrics', () => {
  it('calculates confusion matrix and derived metrics', () => {
    const result = calculateBinaryMetrics(
      [true, true, false, false],
      [true, false, true, false],
    );
    expect(result).toMatchObject({
      truePositive: 1,
      trueNegative: 1,
      falsePositive: 1,
      falseNegative: 1,
      precision: 0.5,
      recall: 0.5,
      f1: 0.5,
      falsePositiveRate: 0.5,
    });
  });

  it('handles empty denominators without NaN', () => {
    expect(calculateBinaryMetrics([], [])).toMatchObject({
      precision: 0,
      recall: 0,
      f1: 0,
      falsePositiveRate: 0,
    });
  });

  it('calculates average and nearest-rank percentiles', () => {
    expect(average([100, 200, 300, 400])).toBe(250);
    expect(percentile([400, 100, 300, 200], 50)).toBe(200);
    expect(percentile([400, 100, 300, 200], 95)).toBe(400);
  });

  it('evaluates each threshold without additional model calls', () => {
    const results = analyzeThresholds(
      [true, true, false, false],
      [90, 65, 55, 10],
    );
    expect(results.map((item) => item.threshold)).toEqual([50, 60, 70, 80, 90]);
    expect(recommendThreshold(results)).toBe(60);
    expect(recommendThreshold(analyzeThresholds([false], [10]))).toBeNull();
  });

  it('keeps threshold calculations independent from the local dataset', () => {
    const expected = [false, true, false, true];
    const scores = [5, 95, 15, 80];
    expect(analyzeThresholds(expected, scores)).toHaveLength(5);
  });
});
