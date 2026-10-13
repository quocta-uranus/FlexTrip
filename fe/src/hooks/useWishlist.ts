'use client';

import { useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wishlistApi } from '@/lib/api/client';
import {
  addGuestWishlist,
  getGuestWishlist,
  removeGuestWishlist,
  subscribeGuestWishlist,
} from '@/lib/guest-wishlist';
import { useAuthStore } from '@/store/auth.store';

export const wishlistIdsKey = (userId?: string) => ['wishlist', 'ids', userId ?? 'guest'] as const;
export const wishlistListKey = (userId: string | undefined, page: number) =>
  ['wishlist', 'list', userId ?? '', page] as const;

function canUseAccountWishlist(roles: readonly string[] | undefined) {
  if (!roles || roles.includes('ADMIN') || roles.includes('STAFF')) return false;
  return roles.includes('TRAVELER') || roles.includes('PROVIDER');
}

export function useGuestWishlistIds() {
  return useSyncExternalStore(subscribeGuestWishlist, getGuestWishlist, () => [] as string[]);
}

export function useWishlistIds() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const allowed = isAuthenticated && canUseAccountWishlist(user?.roles);
  const guestIds = useGuestWishlistIds();
  const guestActiveQuery = useQuery({
    queryKey: ['wishlist', 'guest-active', guestIds],
    queryFn: async () => ({
      requestedIds: guestIds,
      activeIds: (await wishlistApi.resolveGuest(guestIds)).items.map((listing) => listing.id),
    }),
    enabled: !allowed && guestIds.length > 0,
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });
  const query = useQuery({
    queryKey: wishlistIdsKey(user?.id),
    queryFn: wishlistApi.ids,
    enabled: allowed,
    staleTime: 60_000,
  });
  const resolvedGuest = guestActiveQuery.data;
  const activeGuestIds = resolvedGuest
    ? [
        ...resolvedGuest.activeIds.filter((id) => guestIds.includes(id)),
        ...guestIds.filter((id) => !resolvedGuest.requestedIds.includes(id)),
      ]
    : guestIds;
  return {
    ids: allowed ? (query.data?.listingIds ?? []) : [...new Set(activeGuestIds)],
    allowed,
    isAccount: allowed,
    isLoading: allowed && query.isLoading,
  };
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accountMode = isAuthenticated && canUseAccountWishlist(user?.roles);

  return useMutation({
    mutationFn: async ({ listingId, saved }: { listingId: string; saved: boolean }) => {
      if (!accountMode) {
        if (saved) removeGuestWishlist(listingId);
        else addGuestWishlist(listingId);
        return;
      }
      if (saved) await wishlistApi.remove(listingId);
      else await wishlistApi.add(listingId);
    },
    onMutate: async ({ listingId, saved }) => {
      if (!accountMode) return;
      const key = wishlistIdsKey(user?.id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ listingIds: string[] }>(key);
      queryClient.setQueryData<{ listingIds: string[] }>(key, (current) => ({
        listingIds: saved
          ? (current?.listingIds ?? []).filter((id) => id !== listingId)
          : [...new Set([...(current?.listingIds ?? []), listingId])],
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (accountMode && context?.previous) {
        queryClient.setQueryData(wishlistIdsKey(user?.id), context.previous);
      }
    },
    onSettled: () => {
      if (!accountMode) return;
      queryClient.invalidateQueries({ queryKey: wishlistIdsKey(user?.id) });
      queryClient.invalidateQueries({ queryKey: ['wishlist', 'list', user?.id] });
    },
  });
}

export function useWishlistPage(page: number) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const allowed = isAuthenticated && canUseAccountWishlist(user?.roles);
  return useQuery({
    queryKey: wishlistListKey(user?.id, page),
    queryFn: () => wishlistApi.list({ page, limit: 20 }),
    enabled: allowed,
  });
}

export { canUseAccountWishlist };
