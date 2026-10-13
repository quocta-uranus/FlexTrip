'use client';

import { FormEvent, PointerEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useListing } from '@/hooks/useListings';
import { useAuthStore } from '@/store/auth.store';

type Position = { x: number; y: number };

const EDGE_GAP = 16;
const LAUNCHER_SIZE = 44;
type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };
type StoredConversation = { id: string };
type StoredMessage = { id: string; role: 'USER' | 'ASSISTANT'; content: string };

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Chào bạn! Mình có thể hỗ trợ tìm đồ thuê, lên kế hoạch du lịch hoặc giải đáp về FlexTrip.',
};

const travelerQuestions = [
  'Gợi ý đồ cần thuê cho chuyến đi của tôi',
  'Làm sao tìm và đặt thuê một sản phẩm?',
  'Tôi xem và quản lý đơn thuê ở đâu?',
];

const providerQuestions = [
  'Làm sao đăng một sản phẩm cho thuê?',
  'Tôi quản lý và xác nhận đơn thuê ở đâu?',
  'Làm sao cập nhật thông tin cửa hàng?',
];

function MessageContent({ content }: { content: string }) {
  const renderInline = (text: string) => text
    .split(/(\[[^\]]+\]\(\/[a-z][a-z0-9/_?=&.-]*\)|\*\*[^*]+\*\*|https?:\/\/[^\s<>]+|\/[a-z][a-z0-9/_?=&.-]*)/gi)
    .filter(Boolean)
    .map((part, index) => {
      const internalLink = part.match(/^\[([^\]]+)\]\((\/[a-z][a-z0-9/_?=&.-]*)\)$/i);
      if (internalLink) {
        return <Link key={index} href={internalLink[2]} className="font-semibold text-[#1d6fc2] underline underline-offset-2">{internalLink[1]}</Link>;
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('/') && !part.includes('..')) {
        return <Link key={index} href={part} className="break-all font-medium text-[#1d6fc2] underline">{part}</Link>;
      }
      if (/^https?:\/\//i.test(part)) {
        return <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-[#1d6fc2] underline">{part}</a>;
      }
      return part;
    });

  return (
    <div className="min-w-0 space-y-1.5 break-words [overflow-wrap:anywhere]">
      {content.split('\n').map((line, index) => {
        const cleaned = line.replace(/^#{1,3}\s+/, '');
        const bullet = cleaned.match(/^[-*]\s+(.+)/);
        if (bullet) return <div key={index} className="flex gap-1.5"><span aria-hidden="true">•</span><span className="min-w-0">{renderInline(bullet[1])}</span></div>;
        if (cleaned.startsWith('> ')) return <p key={index} className="border-l-2 border-[#80bde9] pl-2 text-[#49637e]">{renderInline(cleaned.slice(2))}</p>;
        return <p key={index} className={cleaned ? undefined : 'h-1'}>{renderInline(cleaned)}</p>;
      })}
    </div>
  );
}

function ListingThumbnail({ listingId }: { listingId: string }) {
  const { data: listing, isLoading, isError } = useListing(listingId);

  if (isLoading) return <div className="h-[74px] animate-pulse rounded-2xl bg-white/70" />;
  if (isError || !listing) return null;

  return (
    <Link href={`/listings/${listing.id}`} className="group flex min-w-0 overflow-hidden rounded-2xl border border-white bg-white/95 shadow-[0_6px_18px_rgba(30,77,128,0.12)] transition hover:-translate-y-0.5 hover:border-[#8fcbed] hover:shadow-[0_10px_24px_rgba(30,77,128,0.18)]">
      <div className="relative h-[74px] w-[88px] shrink-0 overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-100">
        {listing.imageUrls[0] ? (
          <Image src={listing.imageUrls[0]} alt={listing.title} fill sizes="88px" unoptimized className="object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <span className="flex h-full items-center justify-center text-2xl" aria-hidden="true">🧳</span>
        )}
      </div>
      <div className="min-w-0 flex-1 px-3 py-2">
        <p className="truncate text-xs font-bold text-[#17243b]">{listing.title}</p>
        <p className="mt-0.5 truncate text-[10px] text-[#71839a]">📍 {listing.location}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-extrabold text-[#2374c7]">{new Intl.NumberFormat('vi-VN').format(Number(listing.price))} {listing.currency}/ngày</span>
          <span className="shrink-0 text-[10px] font-semibold text-[#4aa8d3]">Xem ›</span>
        </div>
      </div>
    </Link>
  );
}

function ListingPreviews({ content }: { content: string }) {
  const listingIds = [...content.matchAll(/\/listings\/([a-zA-Z0-9_-]+)/g)]
    .map((match) => match[1])
    .filter((id, index, all) => all.indexOf(id) === index)
    .slice(0, 3);

  if (listingIds.length === 0) return null;

  return (
    <div className="relative z-10 ml-10 space-y-2" aria-label="Sản phẩm FlexTrip được gợi ý">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#68809b]">Sản phẩm phù hợp</p>
      {listingIds.map((listingId) => <ListingThumbnail key={listingId} listingId={listingId} />)}
    </div>
  );
}

export function AiChatLauncher() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<Position | null>(null);
  const startPosition = useRef<Position | null>(null);
  const moved = useRef(false);
  const panelPointerStart = useRef<Position | null>(null);
  const panelStartPosition = useRef<Position | null>(null);
  const historyLoaded = useRef(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  const [panelDragging, setPanelDragging] = useState(false);
  const [panelPosition, setPanelPosition] = useState<Position | null>(null);
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
    event.preventDefault();
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

  function handlePanelPointerDown(event: PointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panelPointerStart.current = { x: event.clientX, y: event.clientY };
    panelStartPosition.current = { x: rect.left, y: rect.top };
    setPanelPosition({ x: rect.left, y: rect.top });
    setPanelDragging(true);
  }

  function handlePanelPointerMove(event: PointerEvent<HTMLElement>) {
    if (!panelPointerStart.current || !panelStartPosition.current || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const dx = event.clientX - panelPointerStart.current.x;
    const dy = event.clientY - panelPointerStart.current.y;
    setPanelPosition({
      x: Math.max(EDGE_GAP, Math.min(window.innerWidth - rect.width - EDGE_GAP, panelStartPosition.current.x + dx)),
      y: Math.max(EDGE_GAP, Math.min(window.innerHeight - rect.height - EDGE_GAP, panelStartPosition.current.y + dy)),
    });
  }

  function stopPanelDragging(event: PointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    panelPointerStart.current = null;
    panelStartPosition.current = null;
    setPanelDragging(false);
  }

  async function submitMessage(rawContent: string) {
    const content = rawContent.trim();
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

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(input);
  }

  const suggestedQuestions = user?.roles.includes('PROVIDER') ? providerQuestions : travelerQuestions;
  const isProvider = user?.roles.includes('PROVIDER') ?? false;
  const assistantSubtitle = isProvider ? 'Trợ lý vận hành cửa hàng' : 'Bạn đồng hành du lịch';

  return (
    <>
      {isOpen && (
        <section ref={panelRef} className="fixed bottom-20 right-3 z-[59] flex h-[min(590px,calc(100vh-104px))] w-[calc(100vw-24px)] max-w-[390px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_24px_70px_rgba(28,83,145,0.28),0_4px_18px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:right-5" style={panelPosition ? { left: panelPosition.x, top: panelPosition.y, right: 'auto', bottom: 'auto' } : undefined} aria-label="FlexTrip AI chat">
          <header onPointerDown={handlePanelPointerDown} onPointerMove={handlePanelPointerMove} onPointerUp={stopPanelDragging} onPointerCancel={stopPanelDragging} onDragStart={(event) => event.preventDefault()} className={`relative min-h-[124px] touch-none select-none overflow-hidden px-4 pb-4 pt-3 text-white ${panelDragging ? 'cursor-grabbing' : 'cursor-grab'}`} style={{ background: 'linear-gradient(135deg, #155cb4 0%, #2a7bd9 48%, #52c8de 100%)' }} title="Giữ và kéo thanh màu xanh để di chuyển chatbox">
            <div className="absolute -right-8 -top-14 h-36 w-36 rounded-full bg-white/15 blur-sm" />
            <div className="absolute bottom-1 left-32 h-16 w-16 rounded-full bg-cyan-200/15 blur-xl" />
            <div className="relative flex items-start gap-3">
              <div className="relative mt-1 h-[92px] w-[92px] shrink-0 overflow-visible">
                <div className="absolute inset-2 rounded-full bg-white/25 blur-md" />
                <Image src="/images/ai/flextrip-travel-assistant-3d.png" alt="Trợ lý du lịch FlexTrip" fill sizes="92px" draggable={false} className="pointer-events-none object-contain object-top drop-shadow-[0_10px_12px_rgba(8,39,91,0.3)]" priority />
              </div>
              <div className="min-w-0 flex-1 pt-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold tracking-tight">Flexi AI</h2>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-50 ring-1 ring-white/25">Beta</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] font-medium text-white/85">{assistantSubtitle}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/80">
                  <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" /></span>
                  Đang trực tuyến
                </div>
                <p className="mt-1 text-[9px] font-medium text-white/65">⠿ Giữ thanh xanh để di chuyển</p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => { setConversationId(null); setMessages([welcomeMessage]); historyLoaded.current = true; }} className="flex h-8 items-center rounded-full bg-white/15 px-2.5 text-[10px] font-semibold ring-1 ring-white/20 transition hover:bg-white/25" title="Cuộc trò chuyện mới">↻&nbsp; Mới</button>
                <button type="button" onClick={() => setIsOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg transition hover:bg-white/25" aria-label="Đóng chat">×</button>
              </div>
            </div>
          </header>

          <div className="relative min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top_right,#dff7ff_0,transparent_36%),radial-gradient(circle_at_bottom_left,#e9f8e7_0,transparent_34%),linear-gradient(180deg,#f8fcff_0%,#edf7f7_100%)] p-4">
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.13]" aria-hidden="true">
              <svg className="absolute inset-x-0 top-4 h-40 w-full" viewBox="0 0 390 160" fill="none"><path d="M-20 115C50 30 96 152 158 80s105-55 138 5 76 17 120-34" stroke="#2a7bd9" strokeWidth="2" strokeDasharray="5 8" strokeLinecap="round" /><circle cx="157" cy="81" r="5" fill="#52c8de" /><path d="M151 54c0-8 6-14 14-14s14 6 14 14c0 11-14 25-14 25s-14-14-14-25Z" fill="#2a7bd9" /><circle cx="165" cy="54" r="5" fill="white" /></svg>
              <span className="absolute right-5 top-28 text-4xl">🏝️</span>
              <span className="absolute bottom-10 left-5 text-3xl">🧭</span>
              <span className="absolute bottom-32 right-8 text-3xl">⛰️</span>
            </div>
            {messages.length === 1 && !isSending && (
              <div className="relative z-10 mb-1 flex flex-col items-center justify-center pb-1 pt-2" aria-label="Flexi gửi gợi ý đồ du lịch">
                <div className="relative h-20 w-20">
                  <Image src="/images/ai/flextrip-travel-assistant-3d.png" alt="" fill sizes="80px" draggable={false} className="pointer-events-none object-contain object-top drop-shadow-md" />
                  <span className="absolute -left-8 top-0 animate-bounce rounded-xl bg-white px-2 py-1 text-lg shadow-md [animation-delay:100ms]">🧳</span>
                  <span className="absolute -right-9 top-1 animate-bounce rounded-xl bg-white px-2 py-1 text-lg shadow-md [animation-delay:300ms]">🏕️</span>
                  <span className="absolute -left-11 bottom-0 animate-bounce rounded-xl bg-white px-2 py-1 text-lg shadow-md [animation-delay:500ms]">🛟</span>
                  <span className="absolute -right-12 bottom-1 animate-bounce rounded-xl bg-white px-2 py-1 text-lg shadow-md [animation-delay:700ms]">📷</span>
                </div>
                <div className="mt-3 max-w-[230px] rounded-2xl border border-white bg-white/90 px-4 py-2 text-center text-[11px] font-semibold text-[#31688f] shadow-md">Mình gửi bạn vài gợi ý nhé! ✨</div>
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div className={`relative z-10 flex min-w-0 items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl border border-white bg-gradient-to-br from-blue-100 to-cyan-100 shadow-sm">
                      <Image src="/images/ai/flextrip-travel-assistant-3d.png" alt="" fill sizes="32px" draggable={false} className="pointer-events-none object-cover object-top" />
                    </div>
                  )}
                  <div className={`min-w-0 max-w-[82%] overflow-hidden px-3.5 py-2.5 text-[13px] leading-relaxed ${message.role === 'user' ? 'rounded-[18px] rounded-br-[5px] bg-gradient-to-br from-[#2a7bd9] to-[#1762b9] text-white shadow-[0_8px_20px_rgba(42,123,217,0.22)]' : 'rounded-[18px] rounded-bl-[5px] border border-white bg-white/95 text-[#17243b] shadow-[0_7px_22px_rgba(30,77,128,0.1)]'}`}>
                    <MessageContent content={message.content} />
                  </div>
                </div>
                {message.role === 'assistant' && <ListingPreviews content={message.content} />}
              </div>
            ))}
            {messages.length === 1 && !isSending && (
              <div className="relative z-10 space-y-2.5 pl-10 pt-1">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#68809b]"><span className="text-sm">✦</span> Gợi ý cho bạn</p>
                {suggestedQuestions.map((question, index) => (
                  <button key={question} type="button" onClick={() => void submitMessage(question)} className="group flex w-full items-center gap-2.5 rounded-2xl border border-white bg-white/90 px-3 py-2.5 text-left text-xs leading-relaxed text-[#245d91] shadow-[0_5px_16px_rgba(32,91,145,0.08)] transition hover:-translate-y-0.5 hover:border-[#8fcbed] hover:shadow-[0_8px_20px_rgba(32,91,145,0.15)]">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-cyan-100 text-sm">{['🧭', '✨', '📋'][index]}</span>
                    <span className="min-w-0 flex-1">{question}</span>
                    <span className="text-[#8bb8d8] transition-transform group-hover:translate-x-0.5">›</span>
                  </button>
                ))}
              </div>
            )}
            {isSending && (
              <div className="relative z-10 flex items-end gap-2">
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl border border-white bg-gradient-to-br from-blue-100 to-cyan-100 shadow-sm"><Image src="/images/ai/flextrip-travel-assistant-3d.png" alt="" fill sizes="32px" draggable={false} className="pointer-events-none object-cover object-top" /></div>
                <div className="flex items-center gap-1 rounded-[18px] rounded-bl-[5px] border border-white bg-white px-4 py-3 shadow-sm" aria-label="Flexi đang trả lời">
                  {[0, 1, 2].map((dot) => <span key={dot} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#52aeda]" style={{ animationDelay: `${dot * 140}ms` }} />)}
                </div>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          <form onSubmit={sendMessage} className="border-t border-[#dcecf7] bg-white/95 px-3 pb-3 pt-2.5">
            {error && <p className="mb-2 rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-700">{error}</p>}
            <div className="flex items-end gap-2 rounded-[20px] border border-[#badcf3] bg-[#f8fcff] p-1.5 shadow-inner transition focus-within:border-[#56a9df] focus-within:ring-4 focus-within:ring-[#ccecff]/60">
              <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submitMessage(input); } }} rows={1} maxLength={2000} placeholder="Nhắn FlexTrip AI…" className="max-h-24 min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-[#8694ad]" style={{ color: '#0f1729' }} />
              <button type="submit" disabled={!input.trim() || isSending} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2a7bd9] to-[#4cc5db] text-sm text-white shadow-[0_5px_12px_rgba(42,123,217,0.28)] transition hover:scale-105 disabled:scale-100 disabled:opacity-40" aria-label="Gửi tin nhắn">➤</button>
            </div>
            <p className="mt-1.5 text-center text-[9px] text-[#91a1b5]">Flexi có thể mắc lỗi · Hãy kiểm tra thông tin quan trọng</p>
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
        onDragStart={(event) => event.preventDefault()}
        className="group fixed z-[60] flex h-11 w-11 touch-none select-none items-center justify-center rounded-full border-2 border-white bg-white text-white shadow-[0_8px_22px_rgba(42,123,217,0.34)] transition-shadow duration-300 hover:shadow-[0_12px_28px_rgba(42,123,217,0.48)] focus:outline-none focus:ring-4 focus:ring-[#92eee8]/50"
        style={{
          ...(position ? { left: position.x, top: position.y } : { right: 20, bottom: 92 }),
          background: 'linear-gradient(145deg, #eef9ff 0%, #bceeff 100%)',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
      >
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-50 to-cyan-100">
          <Image src="/images/ai/flextrip-travel-assistant-3d.png" alt="" fill sizes="44px" draggable={false} className="pointer-events-none scale-90 object-contain object-center drop-shadow-sm transition duration-300 group-hover:scale-100" />
        </span>
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-[2px] border-white bg-emerald-400 shadow-sm" />
        {!isOpen && <span className="pointer-events-none absolute -left-2 -top-2 text-sm motion-safe:animate-pulse">✦</span>}
      </button>
    </>
  );
}
