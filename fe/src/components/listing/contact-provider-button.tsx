'use client';

import { useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStartConversation } from '@/hooks/useMessages';
import { getRefreshToken } from '@/lib/api/token';
import { useAuthStore } from '@/store/auth.store';

export function ContactProviderButton({ providerId, listingId }: { providerId: string; listingId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const start = useStartConversation();
  // isPending only flips after a re-render, so a fast double click could otherwise start twice.
  const busy = useRef(false);
  const roles = user?.roles ?? [];

  // The BE only allows traveler↔provider chats, so don't offer the button to anyone else.
  if (isAuthenticated && (!roles.includes('TRAVELER') || roles.includes('PROVIDER') || user?.id === providerId)) {
    return null;
  }
  // Session restore after reload is in flight: roles are unknown, so don't offer a button that could 400.
  if (!isAuthenticated && getRefreshToken()) return null;

  async function open() {
    if (busy.current) return;
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    busy.current = true;
    // On failure start.error is set by the mutation and rendered below.
    const conversation = await start.mutateAsync(providerId).catch(() => null);
    if (conversation) router.push(`/messages?c=${conversation.id}&listing=${listingId}`);
    else busy.current = false;
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={start.isPending}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#DCEFFB] px-4 py-2 text-sm font-medium text-[#2a7bd9] transition-all hover:shadow-sm disabled:opacity-60"
      >
        💬 Liên hệ Provider
      </button>
      {start.error && <p role="alert" className="mt-1 text-xs text-red-500">{start.error.message}</p>}
    </>
  );
}
