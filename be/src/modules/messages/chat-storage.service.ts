import { Injectable } from '@nestjs/common';
import { uploadToSupabase } from '../../common/upload.util';

const BUCKET = 'chat';

@Injectable()
export class ChatStorage {
  upload(buffer: Buffer, ext: string, mime: string): Promise<string> {
    return uploadToSupabase(buffer, `chat.${ext}`, BUCKET, mime);
  }

  /** Only URLs inside our own chat bucket may be attached to a message. */
  isOwnUrl(url: string): boolean {
    const base = process.env.SUPABASE_URL;
    if (!base) return false;
    try {
      const u = new URL(url);
      const prefix = `/storage/v1/object/public/${BUCKET}/`;
      if (u.origin !== new URL(base).origin || u.search || u.hash || !u.pathname.startsWith(prefix)) return false;
      // Decode so %2e%2e / %2f / %5c cannot smuggle traversal past the prefix check.
      const segments = decodeURIComponent(u.pathname.slice(prefix.length)).split('/');
      return segments.every((s) => s !== '' && s !== '.' && s !== '..' && !s.includes('\\'));
    } catch {
      return false;
    }
  }
}
