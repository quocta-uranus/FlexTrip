/**
 * Curated term lists for the deterministic review/response filter.
 *
 * Every term is matched as a whole word (never as a substring), so "đồ ngu" does
 * not hit "đồ nguyên bộ". FlexTrip rents camping gear, so each addition must be
 * checked against rental vocabulary: "đồ ngủ" (sleepwear), "thang" (ladder),
 * "đồ cho thuê" (items for rent) and "giết thời gian" are all legitimate.
 */

/** Profanity and slurs: always held for review. */
export const PROFANITY_TERMS = [
  'cặc',
  'buồi',
  'lồn',
  'cái lồn',
  'vãi lồn',
  'vãi cặc',
  'đụ',
  'đụ mẹ',
  'địt',
  'địt mẹ',
  'đéo',
  'đĩ',
  'con đĩ',
  'chó chết',
  'chó đẻ',
  'đồ chó đẻ',
  'đm',
  'đmm',
  'đcm',
  'đcmm',
  'đkm',
  // English
  'fuck',
  'fucking',
  'fucker',
  'motherfucker',
  'shit',
  'bullshit',
  'bitch',
  'asshole',
  'bastard',
  'cunt',
  'stfu',
];

/**
 * Profanity typed without diacritics. Kept to distinctive tokens only: folding
 * "đĩ", "lồn", "cặc", "đéo", "buồi" would collide with "đi", "lớn", "các", "đeo", "buổi".
 */
export const UNACCENTED_PROFANITY_TERMS = [
  'dit',
  'dit me',
  'dit con me',
  'du ma',
  'du me',
  'vai lon',
  'vai cac',
  'dcm',
  'dcmm',
  'dmm',
  'dkm',
  'clm',
  'vcl',
  'vkl',
];

/** Insults that attack a person: held as "công kích". */
export const INSULT_TERMS = [
  'đồ lừa đảo',
  'thằng ngu',
  'con ngu',
  'đồ ngu',
  'ngu dốt',
  'ngu ngốc',
  'ngu si',
  'đần độn',
  'đồ đần',
  'thằng đần',
  'con đần',
  'đồ khốn',
  'thằng khốn',
  'con khốn',
  'khốn nạn',
  'khốn kiếp',
  'đồ chó',
  'thằng chó',
  'óc chó',
  'đồ điên',
  'thằng điên',
  'đồ dở hơi',
  'mất dạy',
  'đồ mất dạy',
  'vô học',
  'đồ vô học',
  'đồ súc vật',
  'đồ rác rưởi',
  'đồ thiểu năng',
  'thằng thiểu năng',
  'đồ tâm thần',
  'thằng tâm thần',
  'con tâm thần',
  'đồ mọi',
  'đồ bê đê',
  'thằng bê đê',
  // English
  'fuck you',
  'idiot',
  'moron',
  'dumbass',
];

/** Same insults typed without diacritics, again only where no rental phrase collides. */
export const UNACCENTED_INSULT_TERMS = [
  'thang ngu',
  'ngu dot',
  'ngu ngoc',
  'thang khon',
  'khon nan',
  'oc cho',
];

/** Direct threats. Single verbs ("giết", "đập chết") are excluded: "giết thời gian", "đập chết muỗi". */
export const THREAT_TERMS = [
  'giết mày',
  'tao giết',
  'tao sẽ giết',
  'giết cả nhà',
  'đập chết mày',
  'đánh chết mày',
  'chém chết mày',
  'xử đẹp mày',
  'đốt shop',
  'đốt cửa hàng',
];

export interface LexiconTerms {
  profanity: string[];
  insults: string[];
  threats: string[];
}

export const BUILT_IN_TERMS: LexiconTerms = {
  profanity: [...PROFANITY_TERMS, ...UNACCENTED_PROFANITY_TERMS],
  insults: [...INSULT_TERMS, ...UNACCENTED_INSULT_TERMS],
  threats: THREAT_TERMS,
};

/**
 * Everyday rental sentences. A term an admin adds is rejected when it would
 * flag one of these, which stops a careless entry such as "ngủ" or "thang".
 */
export const SAFE_PHRASES = [
  'Đồ ngủ ấm, túi ngủ rất dày.',
  'do ngu am ap, tui ngu rat day',
  'Thang gấp cho thuê tiện lợi.',
  'thang cho thue rat chac chan',
  'Đồ cho thuê sạch sẽ, chủ shop nhiệt tình.',
  'do cho thue sach se, chu shop nhiet tinh',
  'Đồ điện đi kèm đầy đủ.',
  'Mua đồ nguyên bộ gồm lều, túi ngủ và đèn.',
  'Đánh giá buổi sáng rất tốt, dùng cả buổi không hỏng.',
  'Đĩa và bát đi kèm đầy đủ.',
  'Anh bán hàng giết thời gian chờ mình rất vui.',
  'Muỗi nhiều, phải đập chết cả chục con.',
  'Lần đầu thuê, đeo balo đi cả ngày không mỏi.',
  'Dụng cụ nấu ăn rất tốt, shipper thân thiện.',
  'Giá 1.500.000 cho 2 ngày, cọc 3.000.000 đồng.',
  'Shop trả lời nhanh qua zalo, rất nhiệt tình.',
  'Lều rộng rãi, dựng nhanh, chủ shop giao đúng giờ.',
  'Sản phẩm rất tệ, bị hỏng và không giống mô tả.',
  'Giao hàng trễ nửa tiếng và nhân viên không nhiệt tình lắm.',
];
