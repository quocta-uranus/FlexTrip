'use client';

import { CornerUpLeft, FileText, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from 'cn';
import { formatBytes, formatTime, previewText } from '@/lib/chat/format';
import { splitLinks } from '@/lib/chat/links';
import type { Message } from '@/types/message';
import { ListingPreviewCard } from './listing-preview-card';
import { LocationCard } from './location-card';

interface Props {
  message: Message;
  isMine: boolean;
  onReply: (message: Message) => void;
  onEdit: (id: string, content: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onJumpTo: (id: string) => void;
}

const actionClass =
  'rounded p-1 text-[#8694ad] opacity-0 transition-opacity hover:bg-[#e2e8f3] focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100';

export function MessageBubble({ message: m, isMine, onReply, onEdit, onDelete, onJumpTo }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.content ?? '');
  const [error, setError] = useState<string | null>(null);
  const deleted = m.deletedAt !== null;

  async function run(action: () => Promise<unknown>, onDone?: () => void) {
    try {
      await action();
      setError(null);
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thao tác thất bại');
    }
  }

  const startEdit = () => {
    setDraft(m.content ?? '');
    setEditing(true);
  };
  const save = () => run(() => onEdit(m.id, draft), () => setEditing(false));
  const remove = () => {
    if (window.confirm('Thu hồi tin nhắn này?')) void run(() => onDelete(m.id));
  };

  return (
    <div
      id={`msg-${m.id}`}
      data-testid="message"
      className={cn('group flex items-end gap-1', isMine ? 'flex-row-reverse' : 'flex-row')}
    >
      <div className={cn('flex max-w-[70%] flex-col', isMine ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-sm',
            isMine ? 'bg-[#2a7bd9] text-white' : 'border border-[#DCEFFB] bg-white text-[#0f1729]',
            deleted && 'bg-transparent italic text-[#8694ad] ring-1 ring-[#DCEFFB]',
          )}
        >
          {deleted ? (
            'Tin nhắn đã bị thu hồi'
          ) : (
            <>
              {m.replyTo && (
                <button
                  type="button"
                  onClick={() => onJumpTo(m.replyTo!.id)}
                  className="mb-1 block w-full truncate rounded border-l-2 border-current bg-black/10 px-2 py-1 text-left text-xs opacity-80"
                >
                  {previewText({ type: m.replyTo.type, content: m.replyTo.content, deleted: m.replyTo.deleted })}
                </button>
              )}
              {editing ? (
                <div className="flex flex-col gap-1.5 text-[#0f1729]">
                  <textarea
                    aria-label="Sửa tin nhắn"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-64 rounded border border-[#DCEFFB] p-1.5 text-sm"
                  />
                  <div className="flex justify-end gap-2 text-xs">
                    <button type="button" onClick={() => setEditing(false)}>Huỷ</button>
                    <button type="button" onClick={save} className="font-semibold text-[#2a7bd9]">Lưu</button>
                  </div>
                </div>
              ) : (
                <MessageBody message={m} />
              )}
            </>
          )}
        </div>
        {!deleted && m.listingPreviews.map((p) => <ListingPreviewCard key={p.id} preview={p} />)}
        {error && <p role="alert" className="mt-1 text-xs text-red-500">{error}</p>}
        <p className="mt-0.5 text-[10px] text-[#8694ad]">
          {formatTime(m.createdAt)}
          {m.editedAt && !deleted && <> · <span>đã chỉnh sửa</span></>}
        </p>
      </div>
      {!deleted && (
        <div className="flex shrink-0 pb-4">
          <button type="button" aria-label="Trả lời" onClick={() => onReply(m)} className={actionClass}>
            <CornerUpLeft className="h-4 w-4" />
          </button>
          {isMine && m.type === 'TEXT' && (
            <button type="button" aria-label="Sửa" onClick={startEdit} className={actionClass}>
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {isMine && (
            <button type="button" aria-label="Xoá" onClick={remove} className={actionClass}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBody({ message: m }: { message: Message }) {
  return (
    <>
      {m.type === 'IMAGE' && (
        <div className="mb-1 grid grid-cols-2 gap-1">
          {m.attachments.map((a) => (
            <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer">
              <img src={a.url} alt={a.name} className="max-h-48 rounded-lg object-cover" />
            </a>
          ))}
        </div>
      )}
      {m.type === 'FILE' &&
        m.attachments.map((a) => (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            download={a.name}
            className="mb-1 flex items-center gap-2 rounded-lg bg-black/10 px-2 py-1.5"
          >
            <FileText className="h-5 w-5 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{a.name}</span>
              <span className="block text-xs opacity-70">{formatBytes(a.size)}</span>
            </span>
          </a>
        ))}
      {m.type === 'LOCATION' && m.latitude !== null && m.longitude !== null && (
        <LocationCard latitude={m.latitude} longitude={m.longitude} label={m.locationLabel} />
      )}
      {m.content && (
        <p className="whitespace-pre-wrap break-words">
          {splitLinks(m.content).map((part, i) =>
            part.kind === 'link' ? (
              <a key={i} href={part.value} target="_blank" rel="noopener noreferrer" className="underline">
                {part.value}
              </a>
            ) : (
              <span key={i}>{part.value}</span>
            ),
          )}
        </p>
      )}
    </>
  );
}
