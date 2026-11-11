import type { MessageType } from '@/types/message';

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const TYPE_LABEL: Record<MessageType, string> = {
  TEXT: '',
  IMAGE: '[Ảnh]',
  FILE: '[File]',
  LOCATION: '[Vị trí]',
};

export function previewText(m: { type: MessageType; content: string | null; deleted?: boolean }): string {
  if (m.deleted) return 'Tin nhắn đã bị thu hồi';
  return m.content?.trim() || TYPE_LABEL[m.type];
}

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
