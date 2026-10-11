'use client';

import { FormEvent, PointerEvent, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api/client';

type Position = { x: number; y: number };

const EDGE_GAP = 16;
const LAUNCHER_SIZE = 52;
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };
type StoredConversation = { id: string };
type StoredMessage = { id: string; role: 'USER' | 'ASSISTANT'; content: string };

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Chào bạn! Mình có thể hỗ trợ tìm đồ thuê, lên kế hoạch du lịch hoặc giải đáp về FlexTrip.',
};

export function AiChatLauncher() {
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<Position | null>(null);
  const startPosition = useRef<Position | null>(null);
  const moved = useRef(false);
  const historyLoaded = useRef(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, isSending, messages]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-ai-chat', handleOpen);
    return () => window.removeEventListener('open-ai-chat', handleOpen);
  }, []);

  useEffect(() => {
    if (!isOpen || historyLoaded.current || conversationId) return;
    let cancelled = false;
    void (async () => {
      try {
        const conversations = await api.get('/ai-chat/conversations') as StoredConversation[];
        if (!conversations[0] || cancelled) return;
        const conversation = await api.get(`/ai-chat/conversations/${conversations[0].id}`) as { id: string; messages: StoredMessage[] };
        if (cancelled) return;
        setConversationId(conversation.id);
        setMessages(conversation.messages.map((message) => ({
          id: message.id,
          role: message.role === 'USER' ? 'user' : 'assistant',
          content: message.content,
        })));
      } catch {
        // Keep the local welcome state if the history cannot be loaded.
      } finally {
        historyLoaded.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, [conversationId, isOpen]);

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/2fa-challenge')
  ) {
    return null;
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerStart.current = { x: event.clientX, y: event.clientY };
    startPosition.current = { x: rect.left, y: rect.top };
    moved.current = false;
    setPosition({ x: rect.left, y: rect.top });
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!pointerStart.current || !startPosition.current) return;
    const dx = event.clientX - pointerStart.current.x;
    const dy = event.clientY - pointerStart.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true;

    setPosition({
      x: Math.max(EDGE_GAP, Math.min(window.innerWidth - LAUNCHER_SIZE - EDGE_GAP, startPosition.current.x + dx)),
      y: Math.max(EDGE_GAP, Math.min(window.innerHeight - LAUNCHER_SIZE - EDGE_GAP, startPosition.current.y + dy)),
    });
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const wasDragged = moved.current;
    pointerStart.current = null;
    startPosition.current = null;
    setDragging(false);
    if (!wasDragged) setIsOpen((open) => !open);
  }

  function handlePointerCancel(event: PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    pointerStart.current = null;
    startPosition.current = null;
    setDragging(false);
  }

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || isSending) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setIsSending(true);

    try {
      const response = await api.post('/ai-chat', {
        message: content,
        conversationId,
      }) as { conversationId: string; message: StoredMessage };
      setConversationId(response.conversationId);
      setMessages((current) => [...current, {
        id: response.message.id,
        role: 'assistant',
        content: response.message.content,
      }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể gửi tin nhắn.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      {isOpen && (
        <section className="fixed bottom-20 right-3 z-[59] flex h-[min(420px,calc(100vh-108px))] w-[calc(100vw-24px)] max-w-[340px] flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_14px_38px_rgba(15,23,41,0.2)] sm:right-5" style={{ borderColor: '#DCEFFB' }} aria-label="FlexTrip AI chat">
          <header className="flex items-center gap-3 px-4 py-3.5 text-white" style={{ background: 'linear-gradient(135deg, #2a7bd9, #52c8de)' }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-lg">✨</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold">FlexTrip AI</h2>
              <p className="text-[11px] text-white/80">● Đang trực tuyến</p>
            </div>
            <button type="button" onClick={() => { setConversationId(null); setMessages([welcomeMessage]); historyLoaded.current = true; }} className="rounded-lg px-2 py-1 text-[11px] font-medium hover:bg-white/15">Mới</button>
            <button type="button" onClick={() => setIsOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-white/15" aria-label="Đóng chat">×</button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#f6fbfe] p-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-br-sm text-white' : 'rounded-bl-sm bg-white text-[#0f1729] shadow-sm'}`} style={message.role === 'user' ? { background: '#2a7bd9' } : undefined}>{message.content}</p>
              </div>
            ))}
            {isSending && <div className="w-fit rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-xs text-[#5a6b85] shadow-sm">Đang trả lời…</div>}
            <div ref={messageEndRef} />
          </div>

          <form onSubmit={sendMessage} className="border-t bg-white p-3" style={{ borderColor: '#DCEFFB' }}>
            {error && <p className="mb-2 rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-700">{error}</p>}
            <div className="flex items-end gap-2 rounded-2xl border p-1.5" style={{ borderColor: '#b9dcf8' }}>
              <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} rows={1} maxLength={2000} placeholder="Nhắn FlexTrip AI…" className="max-h-24 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-[#8694ad]" style={{ color: '#0f1729' }} />
              <button type="submit" disabled={!input.trim() || isSending} className="flex h-8 w-8 items-center justify-center rounded-xl text-sm text-white disabled:opacity-40" style={{ background: '#2a7bd9' }} aria-label="Gửi tin nhắn">➤</button>
            </div>
          </form>
        </section>
      )}

      <button
        ref={buttonRef}
        type="button"
        aria-label="Mở FlexTrip AI"
        title="Kéo để di chuyển · Bấm để chat với FlexTrip AI"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="fixed z-[60] flex h-[52px] w-[52px] touch-none items-center justify-center rounded-full text-white shadow-[0_8px_22px_rgba(42,123,217,0.35)] transition-shadow hover:shadow-[0_12px_28px_rgba(42,123,217,0.48)] focus:outline-none focus:ring-4 focus:ring-[#92eee8]/50"
        style={{
          ...(position ? { left: position.x, top: position.y } : { right: 16, bottom: 16 }),
          background: 'linear-gradient(135deg, #2a7bd9 0%, #52c8de 100%)',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.18-3.54A7.41 7.41 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
      </button>
    </>
  );
}
