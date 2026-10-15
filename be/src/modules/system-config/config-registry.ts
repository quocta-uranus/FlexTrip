export interface ConfigDefinition {
  key: string;
  group: 'fraud' | 'moderation' | 'policies' | 'commission' | 'reputation';
  label: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  integer: boolean;
}

export const CONFIG_GROUP_LABELS: Record<ConfigDefinition['group'], string> = {
  fraud: 'Phát hiện gian lận',
  moderation: 'Kiểm duyệt AI',
  policies: 'Chính sách vận hành',
  commission: 'Hoa hồng & Payout',
  reputation: 'Uy tín & huy hiệu',
};

export const CONFIG_REGISTRY = [
  {
    key: 'fraud_threshold',
    group: 'fraud',
    label: 'Ngưỡng cảnh báo gian lận',
    description: 'Điểm rủi ro (%) từ đó giao dịch bị gắn cờ',
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    default: 75,
    integer: true,
  },
  {
    key: 'velocity_limit',
    group: 'fraud',
    label: 'Giới hạn tần suất đặt',
    description: 'Số booking tối đa mỗi ngày trên một tài khoản',
    unit: 'booking/ngày',
    min: 1,
    max: 20,
    step: 1,
    default: 5,
    integer: true,
  },
  {
    key: 'chargeback_window',
    group: 'fraud',
    label: 'Thời hạn chargeback',
    description: 'Số ngày cho phép khiếu nại thanh toán',
    unit: 'ngày',
    min: 7,
    max: 90,
    step: 1,
    default: 30,
    integer: true,
  },
  {
    key: 'nsfw_threshold',
    group: 'moderation',
    label: 'Độ nhạy nội dung nhạy cảm',
    description: 'Điểm (%) từ đó ảnh bị ẩn chờ duyệt',
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    default: 60,
    integer: true,
  },
  {
    key: 'fake_listing_score',
    group: 'moderation',
    label: 'Ngưỡng tin giả',
    description: 'Điểm (%) từ đó tin đăng bị gắn cờ SYSTEM',
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    default: 70,
    integer: true,
  },
  {
    key: 'auto_hide_hours',
    group: 'moderation',
    label: 'Tự ẩn sau',
    description: 'Số giờ tin bị gắn cờ chưa xử lý thì tự ẩn',
    unit: 'giờ',
    min: 12,
    max: 168,
    step: 1,
    default: 48,
    integer: true,
  },
  {
    key: 'review_spam_threshold',
    group: 'moderation',
    label: 'Ngưỡng spam review',
    description: 'Điểm AI từ đó review bị gắn cờ spam',
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    default: 70,
    integer: true,
  },
  {
    key: 'review_toxicity_threshold',
    group: 'moderation',
    label: 'Ngưỡng độc hại review',
    description: 'Điểm AI từ đó review bị gắn cờ nội dung độc hại',
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    default: 70,
    integer: true,
  },
  {
    key: 'review_suspicion_threshold',
    group: 'moderation',
    label: 'Ngưỡng đáng ngờ review',
    description: 'Điểm AI từ đó review bị gắn cờ đáng ngờ',
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    default: 70,
    integer: true,
  },
  {
    key: 'cancel_window',
    group: 'policies',
    label: 'Mốc huỷ miễn phí',
    description: 'Số ngày trước ngày nhận được huỷ miễn phí',
    unit: 'ngày',
    min: 1,
    max: 14,
    step: 1,
    default: 7,
    integer: true,
  },
  {
    key: 'high_value_threshold',
    group: 'policies',
    label: 'Ngưỡng sản phẩm giá trị cao',
    description: 'Giá trị (VND) từ đó áp dụng bảo hiểm CONTR-05',
    unit: 'VND',
    min: 500_000,
    max: 10_000_000,
    step: 100_000,
    default: 2_000_000,
    integer: true,
  },
  {
    key: 'response_time_sla',
    group: 'policies',
    label: 'SLA phản hồi',
    description: 'Số giờ tối đa provider phải phản hồi',
    unit: 'giờ',
    min: 1,
    max: 72,
    step: 1,
    default: 24,
    integer: true,
  },
  {
    key: 'platform_fee',
    group: 'commission',
    label: 'Phí nền tảng',
    description: 'Phần trăm hoa hồng trên mỗi giao dịch',
    unit: '%',
    min: 1,
    max: 25,
    step: 0.5,
    default: 10,
    integer: false,
  },
  {
    key: 'payout_frequency',
    group: 'commission',
    label: 'Chu kỳ payout',
    description: 'Số ngày giữa hai kỳ payout',
    unit: 'ngày',
    min: 1,
    max: 30,
    step: 1,
    default: 7,
    integer: true,
  },
  {
    key: 'min_payout',
    group: 'commission',
    label: 'Payout tối thiểu',
    description: 'Số dư tối thiểu (VND) để chi trả',
    unit: 'VND',
    min: 50_000,
    max: 500_000,
    step: 10_000,
    default: 100_000,
    integer: true,
  },
  {
    key: 'trusted_provider_min_completed',
    group: 'reputation',
    label: 'Booking tối thiểu của Provider uy tín',
    description: 'Số booking hoàn thành để đạt huy hiệu Provider uy tín',
    unit: 'booking',
    min: 1,
    max: 1000,
    step: 1,
    default: 10,
    integer: true,
  },
  {
    key: 'trusted_provider_min_rating',
    group: 'reputation',
    label: 'Điểm tối thiểu của Provider uy tín',
    description: 'Điểm đánh giá công khai trung bình để đạt huy hiệu',
    unit: 'sao',
    min: 1,
    max: 5,
    step: 0.1,
    default: 4.5,
    integer: false,
  },
  {
    key: 'trusted_provider_min_reviews',
    group: 'reputation',
    label: 'Review tối thiểu của Provider uy tín',
    description: 'Số review công khai để đạt huy hiệu Provider uy tín',
    unit: 'review',
    min: 1,
    max: 1000,
    step: 1,
    default: 5,
    integer: true,
  },
  {
    key: 'reliable_traveler_min_completed',
    group: 'reputation',
    label: 'Booking tối thiểu của Traveler đáng tin cậy',
    description: 'Số booking hoàn thành để đạt huy hiệu Traveler đáng tin cậy',
    unit: 'booking',
    min: 1,
    max: 1000,
    step: 1,
    default: 5,
    integer: true,
  },
  {
    key: 'reliable_traveler_max_cancel_rate',
    group: 'reputation',
    label: 'Tỷ lệ tự hủy tối đa',
    description: 'Tỷ lệ Traveler tự hủy tối đa để đạt huy hiệu',
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    default: 10,
    integer: true,
  },
] as const satisfies readonly ConfigDefinition[];

export type ConfigKey = (typeof CONFIG_REGISTRY)[number]['key'];

export const CONFIG_BY_KEY: ReadonlyMap<string, ConfigDefinition> = new Map(
  CONFIG_REGISTRY.map((d) => [d.key, d]),
);

export function validateConfigValues(
  values: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    const def = CONFIG_BY_KEY.get(key);
    if (!def) {
      errors.push(`${key}: unknown key`);
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push(`${key}: must be a number`);
      continue;
    }
    if (def.integer && !Number.isInteger(value)) {
      errors.push(`${key}: must be an integer`);
      continue;
    }
    if (value < def.min || value > def.max)
      errors.push(`${key}: must be between ${def.min} and ${def.max}`);
  }
  return errors;
}
