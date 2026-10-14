'use client';

import { cn } from 'cn';
import { formatTime, previewText } from '@/lib/chat/format';
import type { Conversation } from '@/types/message';

interface Props {
  conversations: Conversation[] | undefined;
  isLoading: boolean;
  activeId: string | null;
  currentUserId: string;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, isLoading, activeId, currentUserId, onSelect }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex animate-pulse items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#e2e8f3]" />
            <div className="h-3 flex-1 rounded bg-[#e2e8f3]" />
          </div>
        ))}
      </div>
    );
  }
  if (!conversations?.length) {
    return <p className="px-4 py-16 text-center text-sm text-[#8694ad]">Chưa có cuộc trò chuyện nào.</p>;
  }
  return (
    <>
      {conversations.map((c) => {
        // During auth bootstrap currentUserId is '' and would match the first member; wait for it instead of showing yourself.
        const other = currentUserId ? c.members.find((m) => m.userId !== currentUserId)?.user : undefined;
        const last = c.lastMessage;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={cn(
              'flex w-full items-start gap-3 border-l-[3px] px-4 py-3 text-left transition-colors',
              activeId === c.id ? 'border-[#2a7bd9] bg-[#2a7bd9]/10' : 'border-transparent',
            )}
          >
            {other?.avatarUrl ? (
              <img src={other.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2a7bd9] to-[#92eee8] font-bold text-white">
                {other?.name.charAt(0) ?? '?'}
              </div>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{other?.name ?? 'Người dùng'}</span>
                {last && <span className="shrink-0 text-[11px] text-[#8694ad]">{formatTime(last.createdAt)}</span>}
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-[#8694ad]">
                  {last ? previewText({ type: last.type, content: last.content, deleted: last.deletedAt !== null }) : ''}
                </span>
                {c.unreadCount > 0 && (
                  <span className="shrink-0 rounded-full bg-[#2a7bd9] px-1.5 text-[10px] font-bold text-white">
                    {c.unreadCount > 99 ? '99+' : c.unreadCount}
                  </span>
                )}
              </span>
            </span>
          </button>
        );
      })}
    </>
  );
}
