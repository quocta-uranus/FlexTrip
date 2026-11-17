import type { PublicReputationBadge } from './reputation';

export type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'FLAGGED' | 'REJECTED';

export type ReviewReportReason = 'FAKE_REVIEW' | 'OFFENSIVE' | 'SPAM' | 'OTHER';
export type ReviewReportStatus = 'OPEN' | 'UPHELD' | 'DISMISSED';

export const REPORT_REASON_LABEL: Record<ReviewReportReason, string> = {
  FAKE_REVIEW: 'Đánh giá sai sự thật / không thuê thật',
  OFFENSIVE: 'Ngôn từ xúc phạm',
  SPAM: 'Spam / quảng cáo',
  OTHER: 'Lý do khác',
};

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  rejectionReason?: string | null;
  canEdit?: boolean;
  canAppeal?: boolean;
  editedAt?: string | null;
  appealedAt?: string | null;
  responseEditsLeft?: number;
  myReport?: { status: ReviewReportStatus; reason: ReviewReportReason; createdAt: string } | null;
  bookingId: string | null;
  listingId: string | null;
  response?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatarUrl?: string | null };
  listing?: { id: string; title: string; imageUrls: string[] } | null;
  target?: { id: string; name: string; avatarUrl?: string | null };
  authorBadges?: PublicReputationBadge[];
  targetBadges?: PublicReputationBadge[];
}

export interface CreateReviewPayload {
  bookingId: string;
  rating: number;
  comment: string;
}

export interface EditReviewPayload {
  reviewId: string;
  rating: number;
  comment: string;
}

export interface AppealReviewPayload {
  reviewId: string;
  reason: string;
}

export interface ReportReviewPayload {
  reviewId: string;
  reason: ReviewReportReason;
  details?: string;
}

export interface RespondToReviewPayload {
  reviewId: string;
  response: string;
}

export type SentimentRange = 30 | 90 | 365;

export interface SentimentDashboardData {
  provider: { id: string; name: string };
  rangeDays: SentimentRange;
  granularity: 'DAY' | 'WEEK' | 'MONTH';
  from: string;
  to: string;
  totalReviews: number;
  analyzedReviews: number;
  unknownReviews: number;
  sentiment: {
    positive: { count: number; percentage: number };
    neutral: { count: number; percentage: number };
    negative: { count: number; percentage: number };
  };
  trend: Array<{
    start: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;
}
