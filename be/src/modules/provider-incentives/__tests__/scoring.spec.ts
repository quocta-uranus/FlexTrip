import { scoreProvider, templateSummary, ProviderStats } from '../scoring';

const great: ProviderStats = { ratingAvg: 4.9, reviewCount: 40, positiveReviews: 38, completed: 60, providerCancelled: 1, strikes: 0, responseTimeH: 2 };

describe('scoreProvider', () => {
  it('rates a consistently excellent provider above the default 80 threshold', () => {
    expect(scoreProvider(great).score).toBeGreaterThan(90);
  });

  it('does not let a handful of 5-star reviews beat an established record', () => {
    const fewReviews = scoreProvider({ ...great, ratingAvg: 5, reviewCount: 2, positiveReviews: 2 });
    const established = scoreProvider({ ...great, ratingAvg: 4.8, reviewCount: 80, positiveReviews: 75 });
    expect(fewReviews.metrics.find((m) => m.key === 'rating')!.value).toBeLessThan(established.metrics.find((m) => m.key === 'rating')!.value);
  });

  it('penalises provider cancellations and strikes', () => {
    const flaky = scoreProvider({ ...great, providerCancelled: 30, strikes: 3 });
    expect(flaky.score).toBeLessThan(80);
  });

  it('scores a provider with no history low instead of dividing by zero', () => {
    const r = scoreProvider({ ratingAvg: 0, reviewCount: 0, positiveReviews: 0, completed: 0, providerCancelled: 0, strikes: 0, responseTimeH: 24 });
    expect(Number.isFinite(r.score)).toBe(true);
    expect(r.score).toBeLessThan(60);
  });

  it('weights sum to 100 so the score is a true 0-100 scale', () => {
    expect(scoreProvider(great).metrics.reduce((s, m) => s + m.weight, 0)).toBe(100);
  });
});

describe('templateSummary', () => {
  it('names the weakest metric when not top-rated', () => {
    const { metrics } = scoreProvider({ ...great, strikes: 3 });
    expect(templateSummary(false, 70, 80, metrics)).toContain('Lần huỷ đơn bị tính');
  });
});
