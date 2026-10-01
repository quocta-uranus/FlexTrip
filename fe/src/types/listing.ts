export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type ListingCategory =
  | 'CAMPING_TREKKING'
  | 'VEHICLE'
  | 'STAY'
  | 'EXPERIENCE'
  | 'OTHER';

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  CAMPING_TREKKING: 'Cắm trại & Trekking',
  VEHICLE: 'Phương tiện',
  STAY: 'Chỗ ở',
  EXPERIENCE: 'Trải nghiệm',
  OTHER: 'Khác',
};

export interface ListingProvider {
  id: string;
  name: string;
  avatarUrl?: string | null;
  providerProfile?: {
    shopName: string;
    ratingAvg: number;
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
