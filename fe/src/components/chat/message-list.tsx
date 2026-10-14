'use client';

import { useEffect, useRef } from 'react';
import type { Message } from '@/types/message';
import { MessageBubble } from './message-bubble';

interface Props {
  messages: Message[]; // newest first, as returned by the API
  currentUserId: string;
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
  jumpToId: string | null;
  onJumpHandled: () => void;
  onReply: (m: Message) => void;
  onEdit: (id: string, content: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onJumpTo: (id: string) => void;
}

const MAX_JUMP_ATTEMPTS = 3;
const HIGHLIGHT = ['ring-2', 'ring-[#92eee8]', 'rounded-2xl'];

export function MessageList({
  messages, currentUserId, hasMore, isFetchingMore, onLoadMore, jumpToId, onJumpHandled, onReply, onEdit, onDelete, onJumpTo,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const timers = useRef<{ el: HTMLElement; t: ReturnType<typeof setTimeout> }[]>([]);
  const newestId = messages[0]?.id;
  const jump = useRef({ id: null as string | null, count: -1, attempts: 0 });

  // Follow new messages, but not while loading older pages (newestId stays the same then).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [newestId]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(({ el, t }) => {
        clearTimeout(t);
        el.classList.remove(...HIGHLIGHT);
      });
    };
  }, []);

  // A jump target may be on an older page: keep loading pages until it is rendered.
  useEffect(() => {
    if (!jumpToId) return;
    const j = jump.current;
    // Count only fetches that added nothing, so a failing fetchNextPage cannot loop forever.
    if (j.id !== jumpToId || j.count !== messages.length) jump.current = { id: jumpToId, count: messages.length, attempts: 0 };
    const el = document.getElementById(`msg-${jumpToId}`);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add(...HIGHLIGHT);
      timers.current.push({ el, t: setTimeout(() => el.classList.remove(...HIGHLIGHT), 1500) });
      onJumpHandled();
    } else if (hasMore && !isFetchingMore) {
      if (jump.current.attempts >= MAX_JUMP_ATTEMPTS) {
        onJumpHandled();
        return;
      }
      jump.current.attempts++;
      onLoadMore();
    } else if (!hasMore && !isFetchingMore) {
      onJumpHandled();
    }
  }, [jumpToId, messages, hasMore, isFetchingMore, onLoadMore, onJumpHandled]);

  return (
    <div role="log" aria-label="Tin nhắn" className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[#f6fbfe] p-5">
      {hasMore && (
        <button type="button" onClick={onLoadMore} disabled={isFetchingMore} className="self-center text-xs text-[#2a7bd9]">
          {isFetchingMore ? 'Đang tải...' : 'Xem tin nhắn cũ hơn'}
        </button>
      )}
      {[...messages].reverse().map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          isMine={m.senderId === currentUserId}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onJumpTo={onJumpTo}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
