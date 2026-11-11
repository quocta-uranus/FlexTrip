export const PROVIDER_INCENTIVE_QUEUE = 'provider-incentive';
export const NIGHTLY_INCENTIVE_JOB = 'nightly-provider-incentive';

// Ưu đãi tự hết hạn sau 48h nếu job đêm lỗi, thay vì kéo dài mãi
export const INCENTIVE_VALID_HOURS = 48;

// Dù giảm bao nhiêu, phí nền tảng không xuống dưới mức này
export const PLATFORM_RATE_FLOOR = 0.05;

// Số review "ảo" ở mức điểm trung bình toàn sàn, để provider ít review không lên 5 sao chỉ nhờ vài đánh giá
export const BAYES_PRIOR_REVIEWS = 5;
export const BAYES_PRIOR_RATING = 4;
