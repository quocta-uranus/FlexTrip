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
    return !!base && url.startsWith(`${base}/storage/v1/object/public/${BUCKET}/`);
  }
}
