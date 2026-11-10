import { api } from './client';
import type { ListingCategory, SearchFilters } from '@/types/listing';
import type { RecommendedListing } from './recommendations';

export interface AiSearchResult {
  // 'needs': situation-based query, show `items`; 'filters': apply `filters` to the search page
  mode: 'filters' | 'needs';
  items?: RecommendedListing[];
  total: number;
  // Filters dropped because the strict combination matched nothing
  relaxed: string[];
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
