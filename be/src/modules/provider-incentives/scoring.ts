import { BAYES_PRIOR_RATING, BAYES_PRIOR_REVIEWS } from './provider-incentives.constants';

export interface ProviderStats {
  ratingAvg: number;
  reviewCount: number;
  positiveReviews: number;
  completed: number;
  providerCancelled: number;
  strikes: number;
  responseTimeH: number;
}

export interface ScoreMetric {
  key: string;
  label: string;
  value: number; // 0..100 đã chuẩn hoá
  weight: number;
  display: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Điểm thuần tính toán (không gọi LLM) để quyết định tiền luôn tái lập được. */
export function scoreProvider(s: ProviderStats): { score: number; metrics: ScoreMetric[] } {
  const bayes =
    (s.reviewCount * s.ratingAvg + BAYES_PRIOR_REVIEWS * BAYES_PRIOR_RATING) / (s.reviewCount + BAYES_PRIOR_REVIEWS);
  const finished = s.completed + s.providerCancelled;
  const completionRate = finished === 0 ? 0 : s.completed / finished;
  const positiveRatio = s.reviewCount === 0 ? 0 : s.positiveReviews / s.reviewCount;

  const metrics: ScoreMetric[] = [
    { key: 'rating', label: 'Đánh giá (hiệu chỉnh theo số review)', value: clamp(((bayes - 1) / 4) * 100), weight: 40, display: `${bayes.toFixed(2)}/5` },
    { key: 'completion', label: 'Tỉ lệ hoàn thành đơn', value: clamp(completionRate * 100), weight: 25, display: `${Math.round(completionRate * 100)}%` },
    { key: 'strikes', label: 'Lần huỷ đơn bị tính', value: clamp(100 - s.strikes * 34), weight: 15, display: `${s.strikes} lần` },
    { key: 'response', label: 'Thời gian phản hồi', value: clamp(((48 - s.responseTimeH) / 46) * 100), weight: 10, display: `${s.responseTimeH} giờ` },
    { key: 'sentiment', label: 'Tỉ lệ review tích cực', value: clamp(positiveRatio * 100), weight: 10, display: `${Math.round(positiveRatio * 100)}%` },
  ];
  const score = metrics.reduce((sum, m) => sum + (m.value * m.weight) / 100, 0);
  return { score: Math.round(score * 100) / 100, metrics };
}

export function templateSummary(isTopRated: boolean, score: number, minScore: number, metrics: ScoreMetric[]): string {
  const weakest = [...metrics].sort((a, b) => a.value - b.value)[0];
  return isTopRated
    ? `Bạn đạt ${score}/100 điểm nên được giảm phí nền tảng. Hãy giữ vững các chỉ số hiện tại.`
    : `Bạn đạt ${score}/100 điểm, cần tối thiểu ${minScore}. Chỉ số cần cải thiện nhất: ${weakest.label} (${weakest.display}).`;
}
