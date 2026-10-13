import type { Listing } from './listing';

export interface WishlistItem {
  id: string;
  createdAt: string;
  listing: Listing;
}

export interface WishlistPage {
  items: WishlistItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WishlistSyncResult {
  added: string[];
  alreadyExists: string[];
  skipped: string[];
  retryableFailed: string[];
}
