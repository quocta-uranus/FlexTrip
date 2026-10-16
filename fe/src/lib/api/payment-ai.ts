import { api } from './client';

export interface DepositRecommendation {
  recommendedRate: number;
  minRate: number;
  maxRate: number;
  reasoning: string;
  confidence: number;
}

export interface DisputeAssistResult {
  recommendation: 'full_refund' | 'partial_refund' | 'no_refund' | 'provider_wins';
  suggestedRefundPct: number;
  reasoning: string;
  confidence: number;
  keyEvidence: string[];
}

export interface CashflowForecast {
  forecastDays: 30 | 60 | 90;
  projectedRevenue: number;
  confirmedRevenue: number;
  projectedBookings: number;
  avgRevenuePerBooking: number;
  trend: 'up' | 'stable' | 'down';
  reasoning: string;
}

export const paymentAiApi = {
  getDepositRecommendation: (listingId: string): Promise<DepositRecommendation> =>
    api.get(`/payment-ai/deposit-recommendation/${listingId}`),

  getDisputeAssist: (disputeId: string): Promise<DisputeAssistResult> =>
    api.get(`/payment-ai/dispute-assist/${disputeId}`),

  getCashflowForecast: (days: 30 | 60 | 90): Promise<CashflowForecast> =>
    api.get(`/payment-ai/cashflow-forecast?days=${days}`),
};
