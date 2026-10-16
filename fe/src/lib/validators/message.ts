import { z } from 'zod';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 10;

const ALLOWED = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'application/zip',
];

export const ACCEPT = ALLOWED.join(',');

export const textMessageSchema = z.object({
  content: z.string().trim().min(1, 'Nhập nội dung').max(4000, 'Tối đa 4000 ký tự'),
});

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationLabel: z.string().trim().max(200).optional(),
});

export function validateFiles(files: File[]): string | null {
  if (files.length > MAX_FILES) return `Tối đa ${MAX_FILES} file mỗi tin nhắn`;
  for (const f of files) {
    if (!ALLOWED.includes(f.type)) return `"${f.name}": định dạng không được hỗ trợ`;
    if (f.size > MAX_FILE_BYTES) return `"${f.name}": vượt quá 10MB`;
  }
  return null;
}
