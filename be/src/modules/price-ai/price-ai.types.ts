export type BenchmarkResult = {
  sampleCount: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  avgPrice: number;
  myPercentile: number | null;
};

export type DemandSnapshot = {
  score: number; // 0–100
  trend: 'UP' | 'DOWN' | 'FLAT';
  recentBookings: number;
  baselineBookings: number;
};

export type PriceSuggestion = {
  suggestedPrice: number;
  range: { min: number; max: number };
  reason: string;
  confidence: number; // 0–1
  benchmark: BenchmarkResult;
  demand: DemandSnapshot;
};

// ── Phase 2 ────────────────────────────────────────────────────────────────

export type DemandPoint = {
  date: string; // YYYY-MM-DD
  score: number; // 0–100
  bookingCount: number;
  isProjected: boolean;
};

export type PeakPeriod = {
  start: string;
  end: string;
  avgScore: number;
  label: string;
};

export type DemandForecast = {
  region: string;
  category: string;
  days: number;
  points: DemandPoint[];
  peakPeriods: PeakPeriod[];
  currentScore: number;
  trend: 'UP' | 'DOWN' | 'FLAT';
};

export type PriceAdjustmentSuggestion = {
  listingId: string;
  currentPrice: number;
  suggestedPrice: number;
  changePercent: number; // +/- %
  reason: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  demandScore: number;
  trend: 'UP' | 'DOWN' | 'FLAT';
};

// ── Phase 3 ────────────────────────────────────────────────────────────────

export type OptimizationDataPoint = {
  price: number;
  bookingRate: number; // bookings / active_days
};

export type RevenueCurvePoint = {
  price: number;
  revenue: number;
};

export type OptimizationResult = {
  listingId: string;
  currentPrice: number;
  optimalPrice: number;
  expectedRevenueGain: number; // %
  dataPoints: OptimizationDataPoint[];
  revenueCurve: RevenueCurvePoint[];
  correlation: number; // Pearson R (price vs bookingRate)
  hasSufficientData: boolean;
  insight: string;
};

export type CalendarDayScore = {
  date: string; // YYYY-MM-DD
  score: number; // 0–100
  bookingCount: number;
  isProjected: boolean;
};

export type DemandCalendarResult = {
  listingId: string;
  year: number;
  month: number;
  days: CalendarDayScore[];
};

export type DetailedBenchmark = BenchmarkResult & {
  listingId: string;
  currentPrice: number;
  myBookingRate: number | null;
  marketBookingRate: number | null;
  priceAdvice: string;
  competitors: {
    id: string;
    title: string;
    price: number;
    location: string;
  }[];
};
