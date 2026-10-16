'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ChatWindow } from '@/components/chat/chat-window';
import { ConversationList } from '@/components/chat/conversation-list';
import { useChatSocket } from '@/hooks/use-chat-socket';
import { useConversation, useConversations } from '@/hooks/useMessages';
import { listingUrl } from '@/lib/chat/links';
import { useAuthStore } from '@/store/auth.store';

function MessagesContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  useChatSocket();

  const urlId = params.get('c');
  const [selectedId, setSelectedId] = useState<string | null>(urlId);
  const [seenUrlId, setSeenUrlId] = useState<string | null>(urlId);
  // The URL is the source of truth, but local state makes selection instant while router.replace is in flight.
  if (urlId !== seenUrlId) {
    setSeenUrlId(urlId);
    if (urlId) setSelectedId(urlId);
  }
  // Captured once on mount (the URL is built lazily: window does not exist during SSR); the query param is stripped below so a refresh does not refill the draft.
  const [prefill, setPrefill] = useState(() => {
    const listing = params.get('listing');
    return listing && urlId ? { conversationId: urlId, listingId: listing } : null;
  });
  const selectedKey = selectedId ?? null;
  if (prefill && selectedKey && selectedKey !== prefill.conversationId) setPrefill(null);

  useEffect(() => {
    if (params.get('listing')) router.replace(urlId ? `/messages?c=${urlId}` : '/messages');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for the initial URL
  }, []);

  function select(id: string) {
    setSelectedId(id);
    router.replace(`/messages?c=${id}`);
  }

  const { data: conversations, isLoading } = useConversations();
  // An explicit selection wins (even if not in the list yet); otherwise default to the first conversation.
  const activeId = selectedId ?? conversations?.[0]?.id ?? null;
  const fromList = conversations?.find((c) => c.id === activeId);
  // A conversation opened from a listing has no messages yet, so it is not in the list.
  const { data: fetched } = useConversation(fromList ? null : activeId);
  const active = fromList ?? fetched;

  const currentUserId = user?.id ?? '';

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#f6fbfe] text-[#0f1729]">
      <div className="flex w-80 shrink-0 flex-col border-r border-[#DCEFFB] bg-white">
        <div className="border-b border-[#DCEFFB] px-4 py-4">
          <h1 className="text-lg! leading-normal! font-bold! tracking-normal! text-[#0f1729]">Tin nhắn</h1>
          <p className="mt-0.5 text-xs text-[#8694ad]">{conversations?.length ?? 0} cuộc trò chuyện</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            isLoading={isLoading}
            activeId={activeId}
            currentUserId={currentUserId}
            onSelect={select}
          />
        </div>
      </div>
      {/* Hold off until the auth bootstrap has loaded the user, otherwise own messages render as "theirs". */}
      {activeId && currentUserId ? (
        <ChatWindow
          key={activeId}
          conversation={active}
          conversationId={activeId}
          currentUserId={currentUserId}
          initialText={prefill?.conversationId === activeId ? listingUrl(window.location.origin, prefill.listingId) : undefined}
        />
      ) : activeId ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[#8694ad]">Đang tải...</div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <span className="text-6xl">💬</span>
          <p className="text-base font-semibold text-[#0f1729]">Chọn một cuộc trò chuyện</p>
          <p className="text-sm text-[#8694ad]">Hoặc liên hệ Provider từ trang sản phẩm.</p>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesContent />
    </Suspense>
  );
}
