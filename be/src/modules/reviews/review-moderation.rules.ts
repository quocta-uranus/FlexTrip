import { BUILT_IN_TERMS, type LexiconTerms } from './review-moderation.lexicon';

const LEET_CHARACTERS: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  '!': 'i',
};
// Cyrillic letters that look like Latin ones, used to dodge a dictionary.
const LOOKALIKE_CHARACTERS: Record<string, string> = {
  а: 'a',
  е: 'e',
  о: 'o',
  р: 'p',
  с: 'c',
  у: 'y',
  х: 'x',
};

// Soft hyphen, zero-width and bidi marks, word joiner, BOM: invisible, used to split a word.
const INVISIBLE_CHARACTERS = new RegExp(
  '[\\u00ad\\u200b-\\u200f\\u2060\\ufeff]',
  'gu',
);
const REPEATED_LETTERS = /(\p{L})\1{2,}/gu;
const URL_PATTERN = /(?:https?:\/\/|www\.)\S+/gi;
const CONTACT_LINK_PATTERN =
  /(?:^|[^\p{L}\p{N}])(?:zalo\.me|t\.me|wa\.me|m\.me|bit\.ly|tinyurl\.com)\//iu;
// Vietnamese mobile numbers: 0xxxxxxxxx or +84/84xxxxxxxxx, with optional separators.
// The lookbehind keeps the tail of a long price such as "1.500.000.000" from matching.
const PHONE_PATTERN = /(?<![\d.,])(?:\+?84|0)(?:[\s.-]?\d){9}(?!\d)/u;
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

// Letters inside a term may be separated ("c ặ c", "d.i.t"); the term itself must
// stand alone so "đồ ngu" never matches inside "đồ nguyên bộ".
export function compileTerms(terms: string[]) {
  return terms.map(
    (term) =>
      new RegExp(
        `(?:^|[^\\p{L}\\p{N}])${escapedCharacters(term)}(?=$|[^\\p{L}\\p{N}])`,
        'iu',
      ),
  );
}

export interface CompiledLexicon {
  profanity: RegExp[];
  insults: RegExp[];
  threats: RegExp[];
}

export function compileLexicon(terms: LexiconTerms): CompiledLexicon {
  return {
    profanity: compileTerms(terms.profanity),
    insults: compileTerms(terms.insults),
    threats: compileTerms(terms.threats),
  };
}

export const BUILT_IN_LEXICON = compileLexicon(BUILT_IN_TERMS);

function mapCharacters(text: string, map: Record<string, string>) {
  return [...text].map((character) => map[character] ?? character).join('');
}

/** The text as typed, de-obfuscated, and both again with stretched letters collapsed ("đụụụ mẹ"). */
function textVariants(comment: string) {
  const normalized = comment
    .normalize('NFKC')
    .replace(INVISIBLE_CHARACTERS, '')
    .toLocaleLowerCase('vi-VN');
  const deobfuscated = mapCharacters(
    mapCharacters(normalized, LOOKALIKE_CHARACTERS),
    LEET_CHARACTERS,
  );
  const collapse = (text: string) => text.replace(REPEATED_LETTERS, '$1');
  return {
    normalized,
    variants: [
      ...new Set([
        normalized,
        deobfuscated,
        collapse(normalized),
        collapse(deobfuscated),
      ]),
    ],
  };
}

const matchesAny = (variants: string[], patterns: RegExp[]) =>
  patterns.some((pattern) => variants.some((text) => pattern.test(text)));

export function moderateReviewWithRules(
  comment: string,
  lexicon: CompiledLexicon = BUILT_IN_LEXICON,
): RuleModerationResult {
  const { normalized, variants } = textVariants(comment);
  const reasons: string[] = [];

  const profanityDetected = matchesAny(variants, lexicon.profanity);
  const threatDetected = matchesAny(variants, lexicon.threats);
  const toxicityDetected = profanityDetected || threatDetected;
  if (profanityDetected)
    reasons.push('[RULE] Nội dung chứa từ ngữ tục tĩu hoặc xúc phạm.');
  if (threatDetected) reasons.push('[RULE] Nội dung có dấu hiệu đe dọa.');

  const blockedLanguage = matchesAny(variants, lexicon.insults);
  const multipleUrls = (comment.match(URL_PATTERN) ?? []).length >= 2;
  const contactInfo =
    PHONE_PATTERN.test(comment) || CONTACT_LINK_PATTERN.test(comment);
  const repeatedCharacters = REPEATED_CHARACTER_PATTERN.test(normalized);
  // Strip edge punctuation so "một" and "một." count as the same word.
  const words = normalized
    .split(/\s+/u)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);
  const repetitiveContent =
    words.length >= 8 && new Set(words).size / words.length < 0.4;
  const spamDetected =
    multipleUrls || contactInfo || repeatedCharacters || repetitiveContent;

  if (blockedLanguage) reasons.push('[RULE] Nội dung chứa ngôn từ công kích.');
  if (multipleUrls) reasons.push('[RULE] Nội dung chứa nhiều đường dẫn.');
  if (contactInfo)
    reasons.push('[RULE] Nội dung chứa số điện thoại hoặc liên kết liên hệ.');
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
