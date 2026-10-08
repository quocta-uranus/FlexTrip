import type { PublicReputationBadge } from './reputation';

export type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'FLAGGED' | 'REJECTED';

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  rejectionReason?: string | null;
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
