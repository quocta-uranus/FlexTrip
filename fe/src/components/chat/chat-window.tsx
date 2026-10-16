'use client';

import { Images } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useDeleteMessage, useEditMessage, useMarkRead, useMessages, useSendMessage, useUploadAttachments,
} from '@/hooks/useMessages';
import type { Conversation, Message, SendMessageInput } from '@/types/message';
import { MessageComposer } from './message-composer';
import { MessageList } from './message-list';
import { SharedMediaPanel } from './shared-media-panel';

interface Props {
  conversation: Conversation | undefined;
  conversationId: string;
  currentUserId: string;
  initialText?: string;
}

export function ChatWindow({ conversation, conversationId, currentUserId, initialText }: Props) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useMessages(conversationId);
  const send = useSendMessage(conversationId);
  const edit = useEditMessage();
  const remove = useDeleteMessage(conversationId);
  const upload = useUploadAttachments(conversationId);
  const { mutate: markRead } = useMarkRead(conversationId);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showShared, setShowShared] = useState(false);
  const [jumpToId, setJumpToId] = useState<string | null>(null);

  const messages = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const other = conversation?.members.find((m) => m.userId !== currentUserId)?.user;

  // Mark read when someone else's unread message is on screen; once per newest unread id.
  const lastMarked = useRef<string | null>(null);
  const newestUnread =
    (currentUserId && messages.find((m) => m.senderId !== currentUserId && !m.isRead)?.id) || null;
  useEffect(() => {
    if (newestUnread && newestUnread !== lastMarked.current) {
      lastMarked.current = newestUnread;
      markRead();
    }
  }, [newestUnread, markRead]);

  const handleLoadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);
  const handleJumpHandled = useCallback(() => setJumpToId(null), []);

  async function handleSend(input: SendMessageInput) {
    await send.mutateAsync(input);
  }

  return (
    <div className="flex min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-[#DCEFFB] bg-white px-5 py-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#2a7bd9] to-[#92eee8] text-sm font-bold text-white">
            {other?.name.charAt(0) ?? '?'}
          </div>
          <p className="flex-1 text-sm font-semibold text-[#0f1729]">{other?.name ?? 'Cuộc trò chuyện'}</p>
          <button type="button" aria-label="Xem ảnh, file, link" onClick={() => setShowShared((v) => !v)} className="rounded-lg p-2 text-[#5a6b85] hover:bg-[#e2e8f3]">
            <Images className="h-5 w-5" />
          </button>
        </div>
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          hasMore={!!hasNextPage}
          isFetchingMore={isFetchingNextPage}
          onLoadMore={handleLoadMore}
          jumpToId={jumpToId}
          onJumpHandled={handleJumpHandled}
          onReply={setReplyTo}
          onEdit={(id, content) => edit.mutateAsync({ id, content })}
          onDelete={(id) => remove.mutateAsync(id)}
          onJumpTo={setJumpToId}
        />
        <MessageComposer
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          initialText={initialText}
          onSend={handleSend}
          onUpload={(files) => upload.mutateAsync(files)}
        />
      </div>
      {showShared && (
        <SharedMediaPanel conversationId={conversationId} onJumpTo={setJumpToId} onClose={() => setShowShared(false)} />
      )}
    </div>
  );
}
