export type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'FLAGGED' | 'REJECTED';

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  bookingId: string | null;
  listingId: string | null;
  response?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; avatarUrl?: string | null };
  listing?: { id: string; title: string; imageUrls: string[] } | null;
  target?: { id: string; name: string; avatarUrl?: string | null };
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
