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
  priceMin?: number;
  priceMax?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  items: Listing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
