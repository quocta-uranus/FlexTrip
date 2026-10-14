import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { WebSocket as NodeWebSocket } from 'ws';

// Node.js <22 không có native WebSocket — polyfill trước khi Supabase client khởi tạo
if (!(globalThis as any).WebSocket) {
  (globalThis as any).WebSocket = NodeWebSocket;
}

// Supabase client cho server-side (dùng secret key để upload)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SECRET_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Upload image to Supabase Storage
 * Returns public URL that anyone can view
 */
export async function uploadToSupabase(
  buffer: Buffer,
  filename: string,
  bucket = 'avatars',
  contentType?: string,
): Promise<string> {
  const ext = filename.split('.').pop() || 'jpg';
  const uniqueName = `${Date.now()}-${createHash('sha1').update(buffer).digest('hex').slice(0, 8)}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(uniqueName, buffer, {
      contentType: contentType ?? getMimeType(ext),
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase upload to bucket "${bucket}" failed: ${error.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(uniqueName);
  return urlData.publicUrl;
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteFromSupabase(publicUrl: string): Promise<void> {
  try {
    const url = new URL(publicUrl);
    // URL format: .../storage/v1/object/public/<bucket>/<filename>
    const parts = url.pathname.split('/');
    const publicIdx = parts.indexOf('public');
    if (publicIdx === -1 || publicIdx + 2 >= parts.length) return;
    const bucket = parts[publicIdx + 1];
    const filename = parts.slice(publicIdx + 2).join('/');
    const { error } = await supabaseAdmin.storage.from(bucket).remove([filename]);
    if (error) console.warn('Failed to delete from Supabase:', error.message);
  } catch {
    // ignore
  }
}

/**
 * Upload image - wrapper function
 */
export async function uploadImage(
  buffer: Buffer,
  filename: string,
  bucket = 'avatars',
): Promise<string> {
  return uploadToSupabase(buffer, filename, bucket);
}

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return mimeTypes[ext.toLowerCase()] || 'image/jpeg';
}
