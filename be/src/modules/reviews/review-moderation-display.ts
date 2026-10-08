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

function stripSourcePrefix(reason: string) {
  return reason.replace(/^\s*\[(?:RULE|AI)\]\s*/iu, '').trim();
}

function looksLikeUntranslatedEnglish(reason: string) {
  return /\b(?:the|and|contains?|content|user|language|possible|review|rating|comment|relevant|information|used|violates?)\b/iu.test(
    reason,
  );
}

export function toVietnameseDisplayReasons(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const localized = value
    .filter((reason): reason is string => typeof reason === 'string')
    .map(stripSourcePrefix)
    .filter(Boolean)
    .map((reason) => {
      const translated = REASON_TRANSLATIONS.find(([pattern]) =>
        pattern.test(reason),
      );
      if (translated) return translated[1];
      return looksLikeUntranslatedEnglish(reason) ? SAFE_FALLBACK : reason;
    });

  return [...new Set(localized)];
}
