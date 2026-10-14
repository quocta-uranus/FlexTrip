'use client';

import { MapPin, Paperclip, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { previewText } from '@/lib/chat/format';
import { ACCEPT, textMessageSchema, validateFiles } from '@/lib/validators/message';
import type { AttachmentInput, Message, SendMessageInput } from '@/types/message';
import { LocationPicker } from './location-picker';

interface Props {
  replyTo: Message | null;
  onCancelReply: () => void;
  initialText?: string;
  onSend: (input: SendMessageInput) => Promise<void>;
  onUpload: (files: File[]) => Promise<AttachmentInput[]>;
}

const iconButton = 'rounded-lg p-2 text-[#5a6b85] hover:bg-[#e2e8f3] disabled:opacity-50';

export function MessageComposer({ replyTo, onCancelReply, initialText, onSend, onUpload }: Props) {
  const { register, getValues, setValue, control, reset } = useForm<{ content: string }>({
    defaultValues: { content: initialText ?? '' },
  });
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // State is stale between rapid Enter presses; the ref blocks a double submit synchronously.
  const busy = useRef(false);
  const content = useWatch({ control, name: 'content' });

  useEffect(() => {
    if (initialText && !getValues('content')) setValue('content', initialText);
  }, [initialText, getValues, setValue]);

  function pickFiles(selected: FileList | null) {
    const next = [...files, ...Array.from(selected ?? [])];
    const problem = validateFiles(next);
    setError(problem);
    if (!problem) setFiles(next);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function submit() {
    if (busy.current) return;
    const raw = getValues('content');
    const text = textMessageSchema.safeParse({ content: raw });
    if (!text.success && raw.trim()) return setError(text.error.issues[0].message);
    if (!files.length && !text.success) return;
    const caption = text.success ? text.data.content : '';
    busy.current = true;
    setSending(true);
    setError(null);
    try {
      const replyToId = replyTo?.id;
      if (!files.length) {
        await onSend({ type: 'TEXT', content: caption, replyToId });
        reset({ content: '' });
        onCancelReply();
      } else {
        const groups = [
          { type: 'IMAGE' as const, items: files.filter((f) => f.type.startsWith('image/')) },
          { type: 'FILE' as const, items: files.filter((f) => !f.type.startsWith('image/')) },
        ].filter((g) => g.items.length);
        for (const [i, group] of groups.entries()) {
          const attachments = await onUpload(group.items);
          await onSend({ type: group.type, content: i === 0 ? caption : '', replyToId: i === 0 ? replyToId : undefined, attachments });
          // Consume what was delivered right away so a retry after a later group fails cannot resend it.
          setFiles((prev) => prev.filter((f) => !group.items.includes(f)));
          if (i === 0) {
            reset({ content: '' });
            onCancelReply();
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gửi thất bại, thử lại');
    } finally {
      busy.current = false;
      setSending(false);
    }
  }

  async function sendLocation(value: { latitude: number; longitude: number; locationLabel?: string }) {
    setError(null);
    try {
      await onSend({ type: 'LOCATION', replyToId: replyTo?.id, ...value });
      onCancelReply();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gửi vị trí thất bại');
    }
  }

  const canSend = !sending && (files.length > 0 || content.trim().length > 0);

  return (
    <div className="border-t border-[#DCEFFB] bg-white p-3">
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-[#f6fbfe] px-3 py-1.5 text-xs">
          <span className="truncate">
            Đang trả lời <b>{replyTo.sender.name}</b>: {previewText({ type: replyTo.type, content: replyTo.content })}
          </span>
          <button type="button" aria-label="Huỷ trả lời" onClick={onCancelReply}><X className="h-4 w-4" /></button>
        </div>
      )}
      {files.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-1 rounded-full bg-[#e2e8f3] px-2.5 py-1 text-xs">
              <span className="max-w-32 truncate">{f.name}</span>
              <button type="button" aria-label={`Bỏ ${f.name}`} disabled={sending} onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mb-2 text-xs text-red-500">{error}</p>}
      <div className="flex items-end gap-1">
        <input ref={fileInput} type="file" multiple accept={ACCEPT} aria-label="Chọn file" className="hidden" onChange={(e) => pickFiles(e.target.files)} />
        <button type="button" aria-label="Đính kèm" className={iconButton} onClick={() => fileInput.current?.click()}><Paperclip className="h-5 w-5" /></button>
        <button type="button" aria-label="Chia sẻ vị trí" className={iconButton} onClick={() => setPickerOpen(true)}><MapPin className="h-5 w-5" /></button>
        <textarea
          aria-label="Nhập tin nhắn"
          rows={1}
          placeholder="Nhập tin nhắn..."
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-[#DCEFFB] px-3 py-2 text-sm outline-none focus:border-[#2a7bd9]"
          {...register('content')}
          onKeyDown={(e) => {
            // Enter while composing (Vietnamese IME) confirms the candidate, it must not send.
            // Safari fires that keydown after compositionend (isComposing false) but with keyCode 229.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.nativeEvent.keyCode !== 229) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <button type="button" aria-label="Gửi" disabled={!canSend} onClick={() => void submit()} className="rounded-xl bg-[#2a7bd9] p-2.5 text-white disabled:opacity-50">
          <Send className="h-5 w-5" />
        </button>
      </div>
      <LocationPicker open={pickerOpen} onOpenChange={setPickerOpen} onSubmit={sendLocation} />
    </div>
  );
}
