'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGuestWishlist, removeProcessedGuestWishlist } from '@/lib/guest-wishlist';
import { wishlistApi } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth.store';
import { canUseAccountWishlist, wishlistIdsKey } from '@/hooks/useWishlist';

export function WishlistSync() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const runningFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user || !canUseAccountWishlist(user.roles)) return;
    const listingIds = getGuestWishlist();
    if (!listingIds.length) return;
    const signature = `${user.id}:${listingIds.join(',')}`;
    if (runningFor.current === signature) return;
    runningFor.current = signature;

    wishlistApi.sync(listingIds)
      .then((result) => {
        removeProcessedGuestWishlist([
          ...result.added,
          ...result.alreadyExists,
          ...result.skipped,
        ]);
        queryClient.invalidateQueries({ queryKey: wishlistIdsKey(user.id) });
        queryClient.invalidateQueries({ queryKey: ['wishlist', 'list', user.id] });
      })
      .catch(() => {
        // Giữ nguyên Wishlist Guest để tự thử lại ở phiên xác thực sau.
      })
      .finally(() => {
        runningFor.current = null;
      });
  }, [isAuthenticated, queryClient, user]);

  return null;
}
