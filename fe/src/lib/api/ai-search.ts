import { api } from './client';
import type { ListingCategory, SearchFilters } from '@/types/listing';

export interface AiSearchResult {
  filters: {
    keyword?: string;
    location?: string;
    category?: ListingCategory;
    minPrice?: number;
    maxPrice?: number;
    dateFrom?: string;
    dateTo?: string;
    sort?: SearchFilters['sort'];
  };
  summary: string;
  fallback: boolean;
}

export const aiSearchApi = {
  parse: (query: string): Promise<AiSearchResult> => api.post('/ai-search/parse', { query }),
};
