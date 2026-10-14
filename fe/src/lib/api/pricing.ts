import { api, toQuery } from '@/lib/api/client';
import type {
  PriceSuggestion,
  PriceHistoryItem,
  DemandForecast,
  PriceAdjustmentSuggestion,
  DetailedBenchmark,
  OptimizationResult,
  DemandCalendarResult,
  PriceConfig,
} from '@/types/pricing';

export const pricingApi = {
  // PRICE-01
  suggest: (body: {
    category: string;
    location: string;
    title?: string;
    currentPrice?: number;
    listingId?: string;
  }) => api.post('/price-ai/suggest', body) as Promise<PriceSuggestion>,

  // PRICE-02
  adjustment: (listingId: string) =>
    api.get(`/price-ai/adjustments/${listingId}`) as Promise<PriceAdjustmentSuggestion>,

  // PRICE-03
  forecast: (params: { region: string; category: string; days?: 30 | 60 | 90 }) =>
    api.get(`/price-ai/forecast${toQuery(params)}`) as Promise<DemandForecast>,

  // PRICE-04
  benchmark: (listingId: string) =>
    api.get(`/price-ai/benchmark/${listingId}`) as Promise<DetailedBenchmark>,

  // PRICE-05
  optimization: (listingId: string) =>
    api.get(`/price-ai/optimization/${listingId}`) as Promise<OptimizationResult>,

  // PRICE-07
  calendar: (listingId: string, year?: number, month?: number) => {
    const params = year && month ? `?year=${year}&month=${month}` : '';
    return api.get(`/price-ai/calendar/${listingId}${params}`) as Promise<DemandCalendarResult>;
  },

  // PRICE-06
  recordPrice: (
    body: { listingId: string; price: number; aiScore?: number; aiReason?: string },
    source: 'MANUAL' | 'AI_SUGGESTED',
  ) => api.post(`/price-ai/record?source=${source}`, body),

  history: (listingId: string, limit = 20) =>
    api.get(`/price-ai/history/${listingId}?limit=${limit}`) as Promise<PriceHistoryItem[]>,

  // PRICE-08
  getConfig: (listingId: string) =>
    api.get(`/price-ai/config/${listingId}`) as Promise<PriceConfig>,

  updateConfig: (listingId: string, body: { autoAdjust: boolean; minPrice?: number; maxPrice?: number }) =>
    api.patch(`/price-ai/config/${listingId}`, body) as Promise<PriceConfig>,
};
