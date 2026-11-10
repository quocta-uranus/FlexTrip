import type { ReviewAnalysis } from './review-ai-analyzer.service';

const TOXIC_REASON =
  /profan|offensive|harass|abusive|insult|threat|tục|xúc phạm|quấy rối|lăng mạ|đe dọa|đe doạ/iu;
const SPAM_REASON =
  /spam|repetit|automated|ký tự lặp|lặp lại|nhiều đường dẫn/iu;
/** "Không xúc phạm", "không có dấu hiệu đe dọa": the reason denies the problem. */
const NEGATED_TOXICITY =
  /(?:^|[\s,;.])(?:không|chẳng|chưa|no|not|without)(?:\s|$)/iu;
const NEGATED_SPAM =
  /không (?:có )?(?:dấu hiệu )?spam|không phải spam|no (?:signs? of )?spam/iu;

/**
 * The model sometimes describes an insult or spam in its reasons yet returns a low
 * score for it. When the reasons and the score disagree the reasons win, because they
 * are the part of the answer that was actually written out.
 */
export function reconcileAiAnalysis(
  analysis: Pick<ReviewAnalysis, 'spamScore' | 'toxicityScore' | 'reasons'>,
) {
  const signalsToxicity = analysis.reasons.some(
    (reason) => TOXIC_REASON.test(reason) && !NEGATED_TOXICITY.test(reason),
  );
  const signalsSpam = analysis.reasons.some(
    (reason) => SPAM_REASON.test(reason) && !NEGATED_SPAM.test(reason),
  );
  return {
    inconsistentToxicity: signalsToxicity && analysis.toxicityScore < 80,
    inconsistentSpam: signalsSpam && analysis.spamScore < 80,
  };
}
