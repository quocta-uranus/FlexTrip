export const REVIEW_MODERATION_QUEUE = 'review-moderation';
export const REVIEW_ANALYZE_JOB = 'analyze-review';
export const REVIEW_SWEEP_JOB = 'sweep-pending-reviews';
export const REVIEW_SWEEP_SCHEDULER = 'review-pending-sweeper';
export const REVIEW_SWEEP_INTERVAL_MS = 5 * 60_000;
export const REVIEW_STALE_AFTER_MS = 15 * 60_000;
export const REVIEW_ABANDON_AFTER_MS = 60 * 60_000;
export const REVIEW_MANUAL_FALLBACK_REASON =
  '[RULE] AI kiểm duyệt không khả dụng, đánh giá được chuyển cho quản trị viên duyệt thủ công.';
export const RESPONSE_REJECTED_MESSAGE =
  'Phản hồi chứa nội dung không phù hợp với chính sách. Vui lòng chỉnh sửa và gửi lại.';

export interface ReviewModerationJob {
  reviewId: string;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;
export const REVIEW_APPEAL_WINDOW_DAYS = 7;
export const REVIEW_REMINDER_AFTER_DAYS = 3;

/** Last moment a Traveler can still review: end of the rental's last day + window. */
export function reviewDeadline(endDate: Date, windowDays: number): Date {
  return new Date(endDate.getTime() + (windowDays + 1) * DAY_MS);
}

export const RESPONSE_EDIT_LIMIT = 2;
export const REVIEW_REPORT_DAILY_LIMIT = 10;
