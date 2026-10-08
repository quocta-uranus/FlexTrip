const BLOCKED_TERMS = ['đồ lừa đảo', 'thằng ngu', 'con ngu', 'fuck you'];
const HIGH_CONFIDENCE_TOXIC_TERMS = [
  'cặc',
  'đụ mẹ',
  'địt mẹ',
  'đĩ',
  'lồn',
  'chó chết',
  'motherfucker',
];

const URL_PATTERN = /(?:https?:\/\/|www\.)\S+/gi;
const REPEATED_CHARACTER_PATTERN = /(.)\1{9,}/u;

export interface RuleModerationResult {
  flagged: boolean;
  spamDetected: boolean;
  spamScore: number;
  toxicityDetected: boolean;
  toxicityScore: number;
  reasons: string[];
}

function escapedCharacters(term: string) {
  return [...term.normalize('NFKC').toLocaleLowerCase('vi-VN')]
    .filter((character) => /[\p{L}\p{N}]/u.test(character))
    .map((character) => character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[\\s._*\\-]*');
}

function containsSeparatedTerm(comment: string, term: string) {
  const body = escapedCharacters(term);
  return new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${body}(?=$|[^\\p{L}\\p{N}])`,
    'iu',
  ).test(comment);
}

export function moderateReviewWithRules(comment: string): RuleModerationResult {
  const normalized = comment.normalize('NFKC').toLocaleLowerCase('vi-VN');
  const reasons: string[] = [];

  const toxicityDetected = HIGH_CONFIDENCE_TOXIC_TERMS.some((term) =>
    containsSeparatedTerm(normalized, term),
  );
  if (toxicityDetected)
    reasons.push('[RULE] Nội dung chứa từ ngữ tục tĩu hoặc xúc phạm.');

  const blockedLanguage = BLOCKED_TERMS.some((term) =>
    normalized.includes(term),
  );
  const multipleUrls = (comment.match(URL_PATTERN) ?? []).length >= 2;
  const repeatedCharacters = REPEATED_CHARACTER_PATTERN.test(normalized);
  const words = normalized.split(/\s+/u).filter(Boolean);
  const repetitiveContent =
    words.length >= 12 && new Set(words).size / words.length < 0.3;
  const spamDetected = multipleUrls || repeatedCharacters || repetitiveContent;

  if (blockedLanguage) reasons.push('[RULE] Nội dung chứa ngôn từ công kích.');
  if (multipleUrls) reasons.push('[RULE] Nội dung chứa nhiều đường dẫn.');
  if (repeatedCharacters)
    reasons.push('[RULE] Nội dung chứa ký tự lặp lại bất thường.');

  if (repetitiveContent) reasons.push('[RULE] Nội dung bị lặp lại quá nhiều.');

  return {
    flagged: reasons.length > 0,
    spamDetected,
    spamScore: spamDetected ? 80 : 0,
    toxicityDetected,
    toxicityScore: toxicityDetected ? 80 : 0,
    reasons,
  };
}
