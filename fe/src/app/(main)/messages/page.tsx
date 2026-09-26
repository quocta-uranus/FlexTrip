'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useConversations, useMessages, useSendMessage } from '@/hooks/useMessages';
import { useAuthStore } from '@/store/auth.store';
import type { Conversation } from '@/types/message';

function ConversationItem({
  conversation,
  isActive,
  onClick,
  currentUserId,
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  currentUserId: string;
}) {
  const otherMember = conversation.members.find((m) => m.userId !== currentUserId);
  const lastMsg = conversation.lastMessage ?? conversation.messages?.[conversation.messages.length - 1];
  const unread = conversation.unreadCount ?? 0;
  const lastTime = lastMsg
    ? new Date(lastMsg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
      style={{
        background: isActive ? 'rgba(42,123,217,0.08)' : 'transparent',
        borderLeft: isActive ? '3px solid #2a7bd9' : '3px solid transparent',
      }}
    >
      {/* Avatar */}
      {otherMember?.user.avatarUrl ? (
        <img src={otherMember.user.avatarUrl} alt={otherMember.user.name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
      ) : (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #2a7bd9, #92eee8)' }}
        >
          {otherMember?.user.name.charAt(0) ?? '?'}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {otherMember?.user.name ?? 'Unknown'}
          </p>
          <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{lastTime}</span>
        </div>
        <p className="mt-0.5 truncate text-xs" style={{ color: unread > 0 ? '#0f1729' : '#8694ad', fontWeight: unread > 0 ? '600' : '400' }}>
          {lastMsg?.content ?? 'Chưa có tin nhắn'}
        </p>
      </div>

      {unread > 0 && (
        <span className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: '#2a7bd9' }}>
          {unread}
        </span>
      )}
    </button>
  );
}

function MessageThread({ conversationId, currentUserId }: { conversationId: string; currentUserId: string }) {
  const { data: messages, isLoading } = useMessages(conversationId);
  const { mutate: sendMsg, isPending } = useSendMessage(conversationId);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isPending) return;
    sendMsg(trimmed);
    setInput('');
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <div className="h-4 w-48 animate-pulse rounded bg-[#e2e8f3]" />
        <div className="h-4 w-32 animate-pulse rounded bg-[#e2e8f3]" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {(!messages || messages.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="mb-3 text-5xl">💬</span>
            <p className="text-sm text-slate-500 dark:text-slate-400">Bắt đầu cuộc trò chuyện.</p>
          </div>
        )}

        {messages?.map((msg) => {
          const isMine = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isMine && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #2a7bd9, #92eee8)' }}>
                  {msg.sender?.name.charAt(0) ?? '?'}
                </div>
              )}
              <div
                className="max-w-xs rounded-2xl px-4 py-2.5 text-sm shadow-sm"
                style={
                  isMine
                    ? { background: '#2a7bd9', color: '#fff', borderBottomRightRadius: 4 }
                    : { background: '#fff', color: '#0f1729', border: '1px solid #DCEFFB', borderBottomLeftRadius: 4 }
                }
              >
                <p className="leading-relaxed">{msg.content}</p>
                <p className={`mt-1 text-[10px] ${isMine ? 'text-right text-white/60' : ''}`} style={!isMine ? { color: '#8694ad' } : {}}>
                  {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3" style={{ borderColor: '#DCEFFB' }}>
        <div className="flex items-end gap-2">
          <textarea
            id="message-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Nhập tin nhắn… (Enter để gửi)"
            rows={1}
            className="flex-1 resize-none rounded-2xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30 placeholder:text-[#8694ad]"
            style={{ borderColor: '#DCEFFB', color: '#0f1729', maxHeight: 120, overflow: 'auto' }}
          />
          <button
            id="send-message-btn"
            onClick={handleSend}
            disabled={!input.trim() || isPending}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-all disabled:opacity-40"
            style={{ background: '#2a7bd9' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { data: conversations, isLoading } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(null);

  const currentUserId = user?.id ?? '';

  const activeConversation = conversations?.find((c) => c.id === activeId);
  const otherMember = activeConversation?.members.find((m) => m.userId !== currentUserId);

  useEffect(() => {
    if (!activeId && conversations?.length) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  return (
    <div className="flex h-[calc(100vh-64px)]" style={{ background: '#f6fbfe' }}>
      {/* Sidebar */}
      <div className="flex w-80 shrink-0 flex-col border-r bg-white dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor: '#DCEFFB' }}>
        {/* Header */}
        <div className="border-b px-4 py-4" style={{ borderColor: '#DCEFFB' }}>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Tin nhắn</h1>
          <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">
            {conversations?.length ?? 0} cuộc trò chuyện
          </p>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-[#e2e8f3]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-[#e2e8f3]" />
                    <div className="h-3 w-1/2 rounded bg-[#e2e8f3]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && (!conversations || conversations.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <span className="mb-3 text-4xl">💬</span>
              <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có cuộc trò chuyện nào.</p>
            </div>
          )}

          {conversations?.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={activeId === conv.id}
              onClick={() => setActiveId(conv.id)}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeId ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b bg-white px-5 py-3.5 dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor: '#DCEFFB' }}>
              {otherMember?.user.avatarUrl ? (
                <img src={otherMember.user.avatarUrl} alt={otherMember.user.name} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #2a7bd9, #92eee8)' }}>
                  {otherMember?.user.name.charAt(0) ?? '?'}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{otherMember?.user.name ?? 'Unknown'}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Online</p>
              </div>
            </div>

            <MessageThread conversationId={activeId} currentUserId={currentUserId} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <span className="text-6xl">💬</span>
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Chọn một cuộc trò chuyện</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Hoặc liên hệ Provider từ trang sản phẩm.</p>
          </div>
        )}
      </div>
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
