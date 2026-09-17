import { create } from 'zustand';
import type { SearchFilters } from '@/types/listing';

interface SearchState {
  filters: SearchFilters;
  setFilters: (f: Partial<SearchFilters>) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: SearchFilters = {
  keyword: '',
  category: '',
  location: '',
  dateFrom: '',
  dateTo: '',
  priceMin: undefined,
  priceMax: undefined,
  sortBy: 'newest',
  page: 1,
  limit: 12,
};

export const useSearchStore = create<SearchState>((set) => ({
  filters: DEFAULT_FILTERS,

  setFilters(partial) {
    set((s) => ({
      filters: { ...s.filters, ...partial, page: partial.page ?? 1 },
    }));
  },

  resetFilters() {
    set({ filters: DEFAULT_FILTERS });
  },
}));
