import type { ReviewSentiment } from '@prisma/client';
import type { RuleModerationResult } from './review-moderation.rules';

/** Output of the local Vietnamese classifiers (see ml/review-classifier). */
export interface LocalClassification {
  toxicity: { toxic: number; label: string };
  sentiment: {
    label: Exclude<ReviewSentiment, 'UNKNOWN'>;
    confidence: number;
  };
}

export interface CascadeThresholds {
  /** At or below this toxic probability (0..1) a review counts as clean. */
  toxicClear: number;
  /** At or above this toxic probability a review counts as toxic without asking the LLM. */
  toxicBlock: number;
  /** Below this sentiment confidence the LLM decides the sentiment. */
  sentimentMin: number;
}

export const DEFAULT_CASCADE_THRESHOLDS: CascadeThresholds = {
  toxicClear: 0.15,
  toxicBlock: 0.9,
  sentimentMin: 0.7,
};

export type CascadeRoute =
  | { route: 'LOCAL'; verdict: 'CLEAN' | 'TOXIC' }
  | { route: 'AI'; cause: AiCause };

export type AiCause =
  | 'CLASSIFIER_UNAVAILABLE'
  | 'GRAY_TOXICITY'
  | 'RATING_CONFLICT'
  | 'LOW_SENTIMENT_CONFIDENCE'
  | 'LONG_TEXT'
  | 'INJECTION_MARKER'
  | 'PROMOTIONAL_CUE'
  | 'THREAT_CUE'
  | 'INAUTHENTIC_CUE'
  | 'REPETITION'
  | 'SHOUTING'
  | 'RUDE_PRONOUN'
  | 'RULE_FLAGGED';

const LONG_TEXT_CHARS = 600;
const MIN_WORDS_FOR_REPETITION = 4;
const MAX_UNIQUE_WORD_RATIO = 0.6;
const SHOUTING_MIN_LETTERS = 12;
const SHOUTING_RATIO = 0.6;

/** Text that tries to steer the moderator instead of describing a rental. */
const INJECTION_PATTERN =
  /(?:ignore|disregard|forget)\s+(?:all|any|previous|the)|system prompt|you are (?:now|an?)\b|as an ai\b|bỏ qua\s+(?:mọi|tất cả|các)?\s*(?:hướng dẫn|chỉ dẫn|quy tắc)|hãy (?:cho|chấm|trả)\b.*\b(?:điểm|json)/iu;

/*
 * The cue lists below only decide who answers, never the verdict: a cue sends the
 * review to the LLM, so a word that also appears in honest reviews costs one LLM call
 * and nothing else. They are therefore deliberately broad.
 */

/**
 * Selling language, contact calls and off-topic offers (loans, crypto, betting): the
 * toxicity model never saw these, and the rule filter only catches phone numbers and links.
 */
const PROMOTIONAL_PATTERN =
  /(?:liên hệ|ưu đãi|giảm giá|khuyến mãi|mua ngay|đặt hàng|inbox|\bib\b|\bzalo\b|\btelegram\b|hotline|miễn phí|freeship|click|đăng ký ngay|nhận quà|quảng cáo|\bcoin\b|bitcoin|crypto|tiền ảo|đầu tư|lợi nhuận|vay (?:tiền|vốn)|cho vay|cá cược|nhà cái|casino|lô đề|kiếm tiền|việc làm|tuyển dụng|trúng thưởng|hoa hồng|cộng tác viên)/iu;

/** Threats and violence: the hate-speech model scores these near zero. */
const THREAT_PATTERN =
  /(?:giết|đốt|\bphá\b|đập|chém|đâm|xử đẹp|tìm đến|tìm tới|sẽ tìm|biết tay|trả thù|đánh (?:mày|nó|cho)|báo công an|bóc phốt)/iu;

/** Reviews that admit they are not about a real rental, or were bought or written for someone. */
const INAUTHENTIC_PATTERN =
  /(?:chưa (?:từng|bao giờ|hề)?\s*(?:thuê|dùng|sử dụng|mua)|không (?:hề )?(?:thuê|dùng|sử dụng)|được trả tiền|trả tiền để|viết hộ|mua (?:đánh giá|review)|câu review|nhờ (?:bạn|người) (?:viết|đánh giá))/iu;

/** Rude second/first person forms and threat phrasing that the hate-speech model scores near zero. */
const RUDE_PRONOUN_PATTERN =
  /(?:^|[^\p{L}])(?:tao|mày|mầy|bọn mày|thằng|con (?:chó|điên|khốn))(?=$|[^\p{L}])/iu;

function words(text: string) {
  return text
    .toLocaleLowerCase('vi-VN')
    .split(/\s+/u)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);
}

function uppercaseRatio(text: string) {
  const letters = [...text].filter((char) => /\p{L}/u.test(char));
  if (letters.length < SHOUTING_MIN_LETTERS) return 0;
  const upper = letters.filter(
    (char) => char === char.toLocaleUpperCase() && char !== char.toLowerCase(),
  );
  return upper.length / letters.length;
}

/**
 * Decides whether a review needs the LLM or whether the local classifiers are sure
 * enough. The LLM is used for anything ambiguous or that the local models cannot see;
 * the local verdict is only trusted when every check agrees the review is ordinary.
 *
 * `needSentiment` is false for provider replies, which have no rating or sentiment.
 */
export function routeReview(
  input: {
    comment: string;
    rating: number;
    rule: Pick<RuleModerationResult, 'flagged'>;
    local: LocalClassification | null;
    needSentiment?: boolean;
  },
  thresholds: CascadeThresholds = DEFAULT_CASCADE_THRESHOLDS,
): CascadeRoute {
  const { comment, rating, rule, local } = input;
  const needSentiment = input.needSentiment ?? true;
  if (!local) return { route: 'AI', cause: 'CLASSIFIER_UNAVAILABLE' };
  // The rule filter already decided; the LLM still supplies the scores and sentiment.
  if (rule.flagged) return { route: 'AI', cause: 'RULE_FLAGGED' };

  if (comment.length > LONG_TEXT_CHARS)
    return { route: 'AI', cause: 'LONG_TEXT' };
  if (INJECTION_PATTERN.test(comment))
    return { route: 'AI', cause: 'INJECTION_MARKER' };
  if (PROMOTIONAL_PATTERN.test(comment))
    return { route: 'AI', cause: 'PROMOTIONAL_CUE' };
  if (THREAT_PATTERN.test(comment)) return { route: 'AI', cause: 'THREAT_CUE' };
  if (INAUTHENTIC_PATTERN.test(comment))
    return { route: 'AI', cause: 'INAUTHENTIC_CUE' };
  if (RUDE_PRONOUN_PATTERN.test(comment))
    return { route: 'AI', cause: 'RUDE_PRONOUN' };
  if (uppercaseRatio(comment) > SHOUTING_RATIO)
    return { route: 'AI', cause: 'SHOUTING' };
  const tokens = words(comment);
  if (
    tokens.length >= MIN_WORDS_FOR_REPETITION &&
    new Set(tokens).size / tokens.length < MAX_UNIQUE_WORD_RATIO
  )
    return { route: 'AI', cause: 'REPETITION' };

  const { toxic } = local.toxicity;
  if (toxic >= thresholds.toxicBlock)
    return { route: 'LOCAL', verdict: 'TOXIC' };
  if (toxic > thresholds.toxicClear)
    return { route: 'AI', cause: 'GRAY_TOXICITY' };

  if (needSentiment) {
    const { label, confidence } = local.sentiment;
    if (confidence < thresholds.sentimentMin)
      return { route: 'AI', cause: 'LOW_SENTIMENT_CONFIDENCE' };
    // 3 stars means neutral in the moderation prompt, and the local model leans to
    // positive or negative on mild text, so a non-neutral label there is not trusted.
    if (
      (rating >= 4 && label === 'NEGATIVE') ||
      (rating <= 2 && label === 'POSITIVE') ||
      (rating === 3 && label !== 'NEUTRAL')
    )
      return { route: 'AI', cause: 'RATING_CONFLICT' };
  }
  return { route: 'LOCAL', verdict: 'CLEAN' };
}

/** A moderation analysis in the same shape the LLM returns, built from the local models. */
export function localAnalysis(
  local: LocalClassification,
  verdict: 'CLEAN' | 'TOXIC',
) {
  const toxicityScore = Math.round(local.toxicity.toxic * 100);
  const sentimentPercent = Math.round(local.sentiment.confidence * 100);
  return {
    sentiment: local.sentiment.label,
    spamScore: 0,
    toxicityScore,
    suspicionScore: 0,
    reasons:
      verdict === 'TOXIC'
        ? [
            `Mô hình PhoBERT nhận diện nội dung xúc phạm hoặc thù ghét (${toxicityScore}%).`,
          ]
        : [
            `Mô hình PhoBERT: nội dung bình thường (độ tin cậy ${100 - toxicityScore}%), cảm xúc ${sentimentLabelVi(local.sentiment.label)} (${sentimentPercent}%).`,
          ],
  };
}

function sentimentLabelVi(label: LocalClassification['sentiment']['label']) {
  return label === 'POSITIVE'
    ? 'tích cực'
    : label === 'NEGATIVE'
      ? 'tiêu cực'
      : 'trung lập';
}
