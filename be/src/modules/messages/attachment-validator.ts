import { BadRequestException } from '@nestjs/common';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 10;

type Kind = 'jpeg' | 'png' | 'gif' | 'webp' | 'pdf' | 'zip' | 'ole2' | 'text';

export const ALLOWED_MIME: Record<string, { kind: Kind; ext: string }> = {
  'image/jpeg': { kind: 'jpeg', ext: 'jpg' },
  'image/png': { kind: 'png', ext: 'png' },
  'image/gif': { kind: 'gif', ext: 'gif' },
  'image/webp': { kind: 'webp', ext: 'webp' },
  'application/pdf': { kind: 'pdf', ext: 'pdf' },
  'application/msword': { kind: 'ole2', ext: 'doc' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { kind: 'zip', ext: 'docx' },
  'application/vnd.ms-excel': { kind: 'ole2', ext: 'xls' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { kind: 'zip', ext: 'xlsx' },
  'text/plain': { kind: 'text', ext: 'txt' },
  'application/zip': { kind: 'zip', ext: 'zip' },
};

export const isImageMime = (mime: string): boolean => mime.startsWith('image/');

const startsWith = (buf: Buffer, bytes: number[], offset = 0) =>
  bytes.every((b, i) => buf[offset + i] === b);

// The declared mime comes from the client, so the content signature is what we trust.
function sniff(buf: Buffer): Kind | null {
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38]) && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61) return 'gif';
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf';
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) return 'zip';
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole2';
  return buf.subarray(0, 8000).includes(0) ? null : 'text';
}

export function validateAttachment(file: { buffer: Buffer; mimetype: string; size: number }): {
  mime: string;
  ext: string;
} {
  const entry = ALLOWED_MIME[file.mimetype];
  if (!entry) throw new BadRequestException('Định dạng file không được hỗ trợ');
  if (file.size === 0) throw new BadRequestException('File rỗng');
  if (file.size > MAX_FILE_BYTES) throw new BadRequestException('File vượt quá 10MB');
  if (sniff(file.buffer) !== entry.kind) throw new BadRequestException('Nội dung file không khớp định dạng');
  return { mime: file.mimetype, ext: entry.ext };
}

export function safeFileName(name: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = name.replace(/[\\/]/g, '_').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return cleaned.slice(0, 200) || 'file';
}
