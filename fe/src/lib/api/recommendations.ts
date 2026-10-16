import { api } from './client';
import type { Listing } from '@/types/listing';

export type RecommendedListing = Listing & { aiReason: string };

export interface RecommendationResult {
  source: 'personalized' | 'popular' | 'similar';
  items: RecommendedListing[];
}

export const recommendationsApi = {
  similar: (listingId: string, limit = 4): Promise<RecommendationResult> =>
    api.get(`/recommendations/similar/${listingId}?limit=${limit}`),
  forYou: (limit = 4): Promise<RecommendationResult> => api.get(`/recommendations/for-you?limit=${limit}`),
};
