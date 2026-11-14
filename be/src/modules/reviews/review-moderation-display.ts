const SAFE_FALLBACK = 'AI phát hiện nội dung có dấu hiệu vi phạm.';

const REASON_TRANSLATIONS: Array<[RegExp, string]> = [
  [
    /profan|offensive|harass|abusive|insult|explicit sexual|tục|xúc phạm|quấy rối|lăng mạ|điểm độc hại.*không nhất quán/iu,
    'Nội dung chứa từ ngữ tục tĩu hoặc xúc phạm.',
  ],
  [
    /repetitive character|repeated character|lặp.*ký tự/iu,
    'Nội dung chứa ký tự lặp lại bất thường.',
  ],
  [
    /repetitive content|repeated content|lặp lại quá nhiều/iu,
    'Nội dung bị lặp lại quá nhiều.',
  ],
  [
    /automated spam|possible.*spam|spam content|indicating spam|dấu hiệu spam|điểm spam.*không nhất quán/iu,
    'Nội dung có dấu hiệu spam.',
  ],
  [
    /generic|lacks meaningful information|no relevant context/iu,
    'Nội dung chung chung hoặc không phản ánh trải nghiệm thuê thực tế.',
  ],
  [
    /multiple (?:urls|links)|nhiều đường dẫn/iu,
    'Nội dung chứa nhiều đường dẫn.',
  ],
];

/** "Không có nội dung xúc phạm, spam": the model is clearing the review, not accusing it. */
const DENIES_VIOLATION =
  /(?:^|[\s,;.])(?:không|chẳng|chưa|no|not|without)(?:\s|$)[^.;]*(?:xúc phạm|tục|spam|offensive|profan|insult|harass|abusive)/iu;

/** English counterparts: "contains no violation", "does not violate", "appears safe". */
const DENIES_VIOLATION_EN =
  /\b(?:no|not|without|never)\b[^.;]*\b(?:violation|violate|violates|inappropriate|harmful|abusive|spam|offensive|profan\w*|insult\w*|harass\w*)\b|\b(?:appears?|seems?|looks?|is)\s+(?:to\s+be\s+)?(?:safe|clean|appropriate|genuine|legitimate|fine)\b|\bdoes(?:n't| not)\s+violate\b/iu;

function stripSourcePrefix(reason: string) {
  return reason.replace(/^\s*\[(?:RULE|AI)\]\s*/iu, '').trim();
}

function looksLikeUntranslatedEnglish(reason: string) {
  return /\b(?:the|and|contains?|content|user|language|possible|review|rating|comment|relevant|information|used|violates?)\b/iu.test(
    reason,
  );
}

export interface DisplayReasonOptions {
  /**
   * Every score is below its threshold, so nothing was found. An English reason we cannot
   * translate must not turn into an accusation; it is dropped instead of the generic fallback.
   */
  clean?: boolean;
}

export function toVietnameseDisplayReasons(
  value: unknown,
  options: DisplayReasonOptions = {},
): string[] {
  if (!Array.isArray(value)) return [];

  const localized = value
    .filter((reason): reason is string => typeof reason === 'string')
    .map(stripSourcePrefix)
    .filter(Boolean)
    .filter(
      (reason) =>
        !DENIES_VIOLATION.test(reason) && !DENIES_VIOLATION_EN.test(reason),
    )
    .map((reason): string | null => {
      const translated = REASON_TRANSLATIONS.find(([pattern]) =>
        pattern.test(reason),
      );
      if (translated) return translated[1];
      if (!looksLikeUntranslatedEnglish(reason)) return reason;
      return options.clean ? null : SAFE_FALLBACK;
    })
    .filter((reason): reason is string => reason !== null);

  return [...new Set(localized)];
}
