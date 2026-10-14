'use client';

import { Download, FileText, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSharedItems } from '@/hooks/useMessages';
import { formatBytes } from '@/lib/chat/format';
import type { SharedAttachment, SharedKind, SharedLink } from '@/types/message';
import { ListingPreviewCard } from './listing-preview-card';

interface Props {
  conversationId: string;
  onJumpTo: (messageId: string) => void;
  onClose: () => void;
}

const EMPTY: Record<SharedKind, string> = {
  media: 'Chưa có ảnh nào',
  files: 'Chưa có file nào',
  links: 'Chưa có link nào',
};

// Link URLs are user-supplied text; only http(s) may become an href (blocks javascript: etc.).
const isHttpUrl = (url: string) => /^https?:\/\//i.test(url);

function Tab({ conversationId, kind, onJumpTo }: { conversationId: string; kind: SharedKind; onJumpTo: (id: string) => void }) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading, isError, refetch } = useSharedItems(conversationId, kind);
  const items = data?.pages.flatMap((p) => p.items) ?? [];
  if (isLoading) return <p className="p-4 text-center text-xs text-[#8694ad]">Đang tải...</p>;
  if (isError && !items.length) {
    return (
      <div className="p-4 text-center text-xs text-[#8694ad]">
        <p>Không tải được dữ liệu</p>
        <button type="button" onClick={() => refetch()} className="mt-2 text-[#2a7bd9]">
          Thử lại
        </button>
      </div>
    );
  }
  if (!items.length) return <p className="p-4 text-center text-xs text-[#8694ad]">{EMPTY[kind]}</p>;

  return (
    <>
      {kind === 'media' && (
        <div className="grid grid-cols-3 gap-1">
          {(items as SharedAttachment[]).map((a) => (
            <button key={a.id} type="button" aria-label={`Đến tin nhắn chứa ${a.name}`} onClick={() => onJumpTo(a.messageId)}>
              <img src={a.url} alt={a.name} className="aspect-square w-full rounded object-cover" />
            </button>
          ))}
        </div>
      )}
      {kind === 'files' && (
        <ul className="space-y-2">
          {(items as SharedAttachment[]).map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-lg border border-[#DCEFFB] p-2">
              <button type="button" aria-label={`Đến tin nhắn chứa ${a.name}`} onClick={() => onJumpTo(a.messageId)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <FileText className="h-5 w-5 shrink-0 text-[#2a7bd9]" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{a.name}</span>
                  <span className="block text-xs text-[#8694ad]">{formatBytes(a.size)}</span>
                </span>
              </button>
              <a href={a.url} download={a.name} target="_blank" rel="noopener noreferrer" aria-label={`Tải ${a.name}`}>
                <Download className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {kind === 'links' && (
        <ul className="space-y-3">
          {(items as SharedLink[]).map((l) => (
            <li key={`${l.messageId}:${l.url}`}>
              {l.listingPreview ? (
                <ListingPreviewCard preview={l.listingPreview} />
              ) : isHttpUrl(l.url) ? (
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-[#2a7bd9] underline">
                  {l.url}
                </a>
              ) : (
                <span className="block truncate text-sm">{l.url}</span>
              )}
              <button type="button" onClick={() => onJumpTo(l.messageId)} className="mt-0.5 text-[11px] text-[#8694ad]">
                Đến tin nhắn
              </button>
            </li>
          ))}
        </ul>
      )}
      {hasNextPage && (
        <button
          type="button"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
          className="mt-3 w-full text-xs text-[#2a7bd9] disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Đang tải...' : 'Xem thêm'}
        </button>
      )}
    </>
  );
}

export function SharedMediaPanel({ conversationId, onJumpTo, onClose }: Props) {
  return (
    <aside aria-label="Ảnh, file, link đã gửi" className="flex w-80 shrink-0 flex-col border-l border-[#DCEFFB] bg-white">
      <header className="flex items-center justify-between border-b border-[#DCEFFB] px-4 py-3">
        <h2 className="text-sm font-semibold">Ảnh, file &amp; link</h2>
        <button type="button" aria-label="Đóng" onClick={onClose}><X className="h-4 w-4" /></button>
      </header>
      <Tabs defaultValue="media" className="flex-1 overflow-y-auto p-3">
        <TabsList className="w-full">
          <TabsTrigger value="media">Ảnh</TabsTrigger>
          <TabsTrigger value="files">File</TabsTrigger>
          <TabsTrigger value="links">Link</TabsTrigger>
        </TabsList>
        {(['media', 'files', 'links'] as const).map((kind) => (
          <TabsContent key={kind} value={kind} className="pt-3">
            <Tab conversationId={conversationId} kind={kind} onJumpTo={onJumpTo} />
          </TabsContent>
        ))}
      </Tabs>
    </aside>
  );
}
