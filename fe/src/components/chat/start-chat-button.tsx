'use client';

import { MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useStartConversation } from '@/hooks/useMessages';

interface StartChatButtonProps {
  targetUserId: string;
  label: string;
  className?: string;
}

// Chat chỉ diễn ra giữa Staff và Traveler/Provider của đơn mà Staff đang phụ trách; BE từ chối mọi cặp khác.
export function StartChatButton({ targetUserId, label, className }: StartChatButtonProps) {
  const router = useRouter();
  const start = useStartConversation();
  // isPending chỉ đổi sau khi render lại, nên bấm đúp nhanh vẫn có thể gọi hai lần.
  const busy = useRef(false);

  async function open() {
    if (busy.current) return;
    busy.current = true;
    const conversation = await start.mutateAsync(targetUserId).catch(() => null);
    if (conversation) router.push(`/messages?c=${conversation.id}`);
    else busy.current = false;
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={start.isPending}
        className={className ?? 'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#DCEFFB] py-2.5 text-sm font-medium text-[#2a7bd9] transition-all hover:shadow-sm disabled:opacity-60'}
      >
        <MessageCircle className="h-4 w-4" />
        {label}
      </button>
      {start.error && <p role="alert" className="mt-1 text-xs text-red-500">{start.error.message}</p>}
    </>
  );
}
