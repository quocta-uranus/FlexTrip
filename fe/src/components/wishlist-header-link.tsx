'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useWishlistIds } from '@/hooks/useWishlist';
import { useAuthStore } from '@/store/auth.store';

export function WishlistHeaderLink({ variant = 'default' }: { variant?: 'default' | 'landing' }) {
  const user = useAuthStore((state) => state.user);
  const { ids } = useWishlistIds();
  const isBlocked = user?.roles.includes('ADMIN') || user?.roles.includes('STAFF');
  if (isBlocked) return null;

  const count = new Set(ids).size;
  const color = variant === 'landing' ? 'text-[#161513]' : 'text-[#68655E]';

  return (
    <Link
      href="/wishlist"
      className={`relative flex h-9 w-9 items-center justify-center rounded-full ${color} hover:bg-black/5 hover:text-rose-500`}
      title="Danh sách yêu thích"
      aria-label={`Danh sách yêu thích${count ? `, ${count} thiết bị` : ''}`}
    >
      <Heart className={variant === 'landing' ? 'h-4 w-4' : 'h-5 w-5'} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold leading-none text-white shadow-sm ring-2 ring-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
