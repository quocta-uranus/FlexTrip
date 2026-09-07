import { create } from 'zustand';

interface SearchFilters {
  location: string;
  startDate: string | null;
  endDate: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  category: string | null;
}

interface SearchState {
  filters: SearchFilters;
  setFilters: (filters: Partial<SearchFilters>) => void;
  resetFilters: () => void;
}

const defaultFilters: SearchFilters = {
  location: '',
  startDate: null,
  endDate: null,
  minPrice: null,
  maxPrice: null,
  category: null,
};

export const useSearchStore = create<SearchState>((set) => ({
  filters: defaultFilters,
  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),
  resetFilters: () => set({ filters: defaultFilters }),
}));
