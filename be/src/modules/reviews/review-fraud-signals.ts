import { PrismaService } from '../../prisma/prisma.service';
import { DAY_MS, HOUR_MS } from './review-moderation.constants';

export const FRAUD_SUSPICION_SCORE = 80;
export const DUPLICATE_MIN_LENGTH = 20;
export const AUTHOR_DAILY_LIMIT = 4;
export const TARGET_HOURLY_LIMIT = 5;

export interface ReviewFraudSignals {
  suspicionScore: number;
  reasons: string[];
  /** Copy-pasted text is treated as spam; flooding only raises suspicion. */
  duplicate: boolean;
}

/**
 * Deterministic abuse signals the language model cannot see because they need
 * data across reviews: copy-pasted text, one account flooding reviews, and a
 * provider suddenly receiving a burst of reviews.
 */
export async function detectReviewFraudSignals(
  prisma: PrismaService,
  review: { id: string; authorId: string; targetId: string; comment: string },
  now = new Date(),
): Promise<ReviewFraudSignals> {
  const comment = review.comment.trim();
  const [duplicates, authorRecent, targetRecent] = await Promise.all([
    comment.length >= DUPLICATE_MIN_LENGTH
      ? prisma.review.count({
          where: {
            id: { not: review.id },
            comment: { equals: comment, mode: 'insensitive' },
          },
        })
      : Promise.resolve(0),
    prisma.review.count({
      where: {
        authorId: review.authorId,
        createdAt: { gte: new Date(now.getTime() - DAY_MS) },
      },
    }),
    prisma.review.count({
      where: {
        targetId: review.targetId,
        createdAt: { gte: new Date(now.getTime() - HOUR_MS) },
      },
    }),
  ]);

  const reasons: string[] = [];
  if (duplicates > 0)
    reasons.push('[RULE] Nội dung trùng với một đánh giá khác trên hệ thống.');
  if (authorRecent >= AUTHOR_DAILY_LIMIT)
    reasons.push('[RULE] Tài khoản gửi quá nhiều đánh giá trong 24 giờ.');
  if (targetRecent >= TARGET_HOURLY_LIMIT)
    reasons.push(
      '[RULE] Nhà cung cấp nhận quá nhiều đánh giá trong thời gian ngắn.',
    );
  return {
    suspicionScore: reasons.length ? FRAUD_SUSPICION_SCORE : 0,
    reasons,
    duplicate: duplicates > 0,
  };
}
