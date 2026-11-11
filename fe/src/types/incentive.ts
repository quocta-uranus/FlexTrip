export interface IncentiveMetric {
  key: string;
  label: string;
  value: number;
  weight: number;
  display: string;
}

export type ProviderIncentive =
  | { computed: false }
  | {
      computed: true;
      isTopRated: boolean;
      score: number;
      feeDiscountPct: number;
      validUntil: string;
      computedAt: string;
      reasons: { trusted: boolean; minScore: number; metrics: IncentiveMetric[]; summary: string };
    };

export interface TopRatedProvider {
  providerId: string;
  name: string;
  email: string;
  score: number;
  feeDiscountPct: number;
  validUntil: string;
}

export interface IncentiveRunResult {
  processed: number;
  topRated: number;
  failed: number;
}
