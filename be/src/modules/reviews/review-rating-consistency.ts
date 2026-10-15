import { ReviewSentiment } from '@prisma/client';

export const RATING_SENTIMENT_MISMATCH_SCORE = 80;
export const RATING_SENTIMENT_MISMATCH_REASON =
  '[RULE] Số sao và nội dung đánh giá có dấu hiệu mâu thuẫn.';

export function evaluateRatingSentimentConsistency(
  rating: number,
  sentiment: ReviewSentiment,
  currentSuspicionScore: number,
) {
  const mismatch =
    (rating >= 4 && sentiment === ReviewSentiment.NEGATIVE) ||
    (rating <= 2 && sentiment === ReviewSentiment.POSITIVE);

  return {
    mismatch,
    suspicionScore: Math.max(
      currentSuspicionScore,
      mismatch ? RATING_SENTIMENT_MISMATCH_SCORE : 0,
    ),
    reason: mismatch ? RATING_SENTIMENT_MISMATCH_REASON : null,
  };
}
