import { CATEGORY_VALUES } from '@/constants/categories';
import type { ListingCategory, SearchFilters } from '@/types/listing';

const SORT_VALUES = ['newest', 'price_asc', 'price_desc', 'rating'] as const;

function positiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

function nonNegativeNumber(value: string | null) {
  if (value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parseSearchFilters(query: string): SearchFilters {
  const params = new URLSearchParams(query);
  const rawCategory = params.get('category');
  const category = CATEGORY_VALUES.includes(rawCategory as ListingCategory)
    ? (rawCategory as ListingCategory)
    : '';
  const rawSort = params.get('sort');
  const sort = SORT_VALUES.includes(rawSort as (typeof SORT_VALUES)[number])
    ? (rawSort as SearchFilters['sort'])
    : 'newest';

  return {
    keyword: params.get('keyword')?.trim() ?? '',
    location: params.get('location')?.trim() ?? '',
    category,
    dateFrom: params.get('dateFrom') ?? '',
    dateTo: params.get('dateTo') ?? '',
    minPrice: nonNegativeNumber(params.get('minPrice')),
    maxPrice: nonNegativeNumber(params.get('maxPrice')),
    sort,
    page: positiveInteger(params.get('page'), 1),
    limit: Math.min(50, positiveInteger(params.get('limit'), 12)),
  };
}

export function serializeSearchFilters(filters: SearchFilters) {
  const params = new URLSearchParams();
  if (filters.keyword?.trim()) params.set('keyword', filters.keyword.trim());
  if (filters.location?.trim()) params.set('location', filters.location.trim());
  if (filters.category) params.set('category', filters.category);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.minPrice != null) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice != null) params.set('maxPrice', String(filters.maxPrice));
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
  if ((filters.page ?? 1) > 1) params.set('page', String(filters.page));
  if ((filters.limit ?? 12) !== 12) params.set('limit', String(filters.limit));
  return params.toString();
}

export function paginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 4) return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages] as const;
  if (currentPage >= totalPages - 3) {
    return [
      1,
      'ellipsis-left',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ] as const;
  }
  return [
    1,
    'ellipsis-left',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis-right',
    totalPages,
  ] as const;
}
