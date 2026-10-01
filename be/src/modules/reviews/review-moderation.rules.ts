const BLOCKED_TERMS = ['đồ lừa đảo', 'thằng ngu', 'con ngu', 'fuck you'];

const URL_PATTERN = /(?:https?:\/\/|www\.)\S+/gi;
const REPEATED_CHARACTER_PATTERN = /(.)\1{9,}/u;

export interface RuleModerationResult {
  flagged: boolean;
  reasons: string[];
}

export function moderateReviewWithRules(comment: string): RuleModerationResult {
  const normalized = comment.toLocaleLowerCase('vi-VN');
  const reasons: string[] = [];

  if (BLOCKED_TERMS.some((term) => normalized.includes(term)))
    reasons.push('BLOCKED_LANGUAGE');
  if ((comment.match(URL_PATTERN) ?? []).length >= 2)
    reasons.push('MULTIPLE_URLS');
  if (REPEATED_CHARACTER_PATTERN.test(normalized))
    reasons.push('REPEATED_CHARACTERS');

  const words = normalized.split(/\s+/u).filter(Boolean);
  if (words.length >= 12 && new Set(words).size / words.length < 0.3)
    reasons.push('REPETITIVE_CONTENT');

  return { flagged: reasons.length > 0, reasons };
}
