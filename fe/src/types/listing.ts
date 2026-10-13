import type { PublicReputationBadge } from './reputation';
import type { ListingCategory } from '@/constants/categories';

export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

// Single source of truth — edit src/constants/categories.ts
export type { ListingCategory };
export { CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_META, LISTING_CATEGORIES, CATEGORY_VALUES } from '@/constants/categories';

export interface ListingProvider {
  id: string;
  name: string;
  avatarUrl?: string | null;
  providerProfile?: {
    shopName: string;
    ratingAvg: number | string;
    reviewsCount: number;
    responseHours: string;
  } | null;
}

export interface ListingReview {
  id: string;
  rating: number;
  comment?: string | null;
  response?: string | null;
  respondedAt?: string | null;
  authorBadges?: PublicReputationBadge[];
  targetBadges?: PublicReputationBadge[];
  createdAt: string;
  author: { id: string; name: string; avatarUrl?: string | null };
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  imageUrls: string[];
  status: ListingStatus;
  category: ListingCategory;
  amenities: string[];
  providerId: string;
  createdAt: string;
  updatedAt: string;
  // availability/rental config fields
  quantity?: number;
  minRentalDays?: number;
  maxRentalDays?: number | null;
  depositRate?: string | number;
  // contract-related fields
  penaltyRules?: Array<{ item: string; description: string; minAmount: number; maxAmount: number }> | null;
  conditionNote?: string | null;
  marketValue?: number | null;
  isHighValue?: boolean;
  provider?: ListingProvider;
  reviews?: ListingReview[];
  _count?: { reviews: number; bookings: number };
}

export interface SearchFilters {
  keyword?: string;
  category?: ListingCategory | '';
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'rating' | 'newest';
  page?: number;
  limit?: number;
}
