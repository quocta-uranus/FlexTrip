import { ReviewSentiment } from '@prisma/client';
import {
  evaluateRatingSentimentConsistency,
  RATING_SENTIMENT_MISMATCH_REASON,
} from '../review-rating-consistency';

describe('rating and sentiment consistency', () => {
  it.each([
    [5, ReviewSentiment.NEGATIVE],
    [4, ReviewSentiment.NEGATIVE],
    [1, ReviewSentiment.POSITIVE],
    [2, ReviewSentiment.POSITIVE],
  ])(
    'raises suspicion for rating %s with sentiment %s',
    (rating, sentiment) => {
      expect(evaluateRatingSentimentConsistency(rating, sentiment, 0)).toEqual({
        mismatch: true,
        suspicionScore: 80,
        reason: RATING_SENTIMENT_MISMATCH_REASON,
      });
    },
  );

  it.each([
    [5, ReviewSentiment.POSITIVE],
    [1, ReviewSentiment.NEGATIVE],
    [3, ReviewSentiment.POSITIVE],
    [3, ReviewSentiment.NEGATIVE],
    [3, ReviewSentiment.NEUTRAL],
  ])(
    'keeps a consistent rating %s and sentiment %s unchanged',
    (rating, sentiment) => {
      expect(evaluateRatingSentimentConsistency(rating, sentiment, 15)).toEqual(
        {
          mismatch: false,
          suspicionScore: 15,
          reason: null,
        },
      );
    },
  );

  it('preserves a higher AI suspicion score', () => {
    expect(
      evaluateRatingSentimentConsistency(5, ReviewSentiment.NEGATIVE, 95)
        .suspicionScore,
    ).toBe(95);
  });
});
