'use client';

import { Heart, LoaderCircle } from 'lucide-react';
import { useWishlistIds, useToggleWishlist } from '@/hooks/useWishlist';
import { useAuthStore } from '@/store/auth.store';
import { useWishlistToast } from '@/components/wishlist-toast';

export function WishlistButton({
  listingId,
  ownerId,
  className = '',
}: {
  listingId: string;
  ownerId?: string;
  className?: string;
}) {
  const user = useAuthStore((state) => state.user);
  const { ids, allowed, isAccount } = useWishlistIds();
  const toggle = useToggleWishlist();
  const toast = useWishlistToast();
  const saved = ids.includes(listingId);

  if (isAccount && ownerId === user?.id) return null;
  if (user && !allowed && (user.roles.includes('ADMIN') || user.roles.includes('STAFF'))) return null;

  return (
    <>
    <button
      type="button"
      aria-label={saved ? 'Bỏ khỏi danh sách yêu thích' : 'Thêm vào danh sách yêu thích'}
      aria-pressed={saved}
      disabled={toggle.isPending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle.mutate(
          { listingId, saved },
          {
            onSuccess: () => toast.show(
              saved ? 'Đã xóa khỏi danh sách yêu thích' : 'Đã thêm vào danh sách yêu thích',
              saved ? 'error' : 'success',
            ),
            onError: () => toast.show('Không thể cập nhật yêu thích', 'error'),
          },
        );
      }}
      className={className}
      title={saved ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
    >
      {toggle.isPending ? (
        <LoaderCircle className="h-4 w-4 animate-spin text-slate-500" />
      ) : (
        <Heart
          className={`h-4 w-4 ${saved ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`}
        />
      )}
    </button>
    </>
  );
}
