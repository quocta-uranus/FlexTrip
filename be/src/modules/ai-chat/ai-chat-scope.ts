const FLEXTRIP_INTENT_KEYWORDS = [
  'flextrip',
  'du lich',
  'chuyen di',
  'di choi',
  'thue do',
  'can thue',
  'cho thue',
  'do dung',
  'de xuat',
  'goi y',
  'listing',
  'booking',
  'dat lich',
  'dat thue',
  'thanh toan',
  'hoan tien',
  'tai khoan',
  'provider',
  'nha cung cap',
  'gio hang',
  'don thue',
  'san pham',
  'tim kiem',
  'thoi tiet',
  'du bao',
  'nhiet do',
  'leo nui',
  'trekking',
  'cam trai',
  'tam bien',
  'di bien',
  'phuot',
  'da ngoai',
  'tham quan',
];

export function hasFlexTripIntent(message: string) {
  const normalized = normalize(message);

  return FLEXTRIP_INTENT_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );
}

export function isTravelPlanningConversation(conversation: string) {
  const normalized = normalize(conversation);
  return [
    'du lich',
    'chuyen di',
    'di choi',
    'di bien',
    'hanh trinh',
    'gia dinh',
    'de xuat',
    'goi y do',
    'can thue',
  ].some((keyword) => normalized.includes(keyword));
}

export function hasTravelDetailIntent(message: string) {
  const normalized = normalize(message);

  return (
    /\b\d+\s*(ngay|dem|tuan)\b/.test(normalized) ||
    /\b\d+([.,]\d+)?\s*(k|nghin|ngan|trieu|vnd|dong)\b/.test(normalized) ||
    /\b(tre em|tre nho|em be|con nho|nguoi lon tuoi|vo chong|gia dinh|nhom ban)\b/.test(
      normalized,
    ) ||
    /\b(leo nui|trekking|cam trai|tam bien|di bien|phuot|da ngoai|tham quan|chup anh|nau an)\b/.test(
      normalized,
    )
  );
}

function normalize(message: string) {
  return message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd');
}
