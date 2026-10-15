import type { ListingCategory } from '@/constants/categories';

export const RENTAL_PER_TRIP = 'RENTAL_PER_TRIP' as const;
export type BudgetScope = typeof RENTAL_PER_TRIP;

/**
 * Giới hạn ngân sách tối đa theo backend: Decimal(10, 2) = 99,999,999.99 VNĐ
 */
export const MAX_RENTAL_BUDGET = 99_999_999.99;

export interface TravelPreference {
  id: string;
  userId: string;
  tripType: string;
  preferredCategories: ListingCategory[];
  budgetMin: number | string | null;
  budgetMax: number | string | null;
  budgetScope: BudgetScope | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePreferencePayload {
  tripType: string;
  preferredCategories?: ListingCategory[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  budgetScope?: BudgetScope | null;
}

export interface UpdatePreferencePayload {
  tripType?: string;
  preferredCategories?: ListingCategory[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  budgetScope?: BudgetScope | null;
}
