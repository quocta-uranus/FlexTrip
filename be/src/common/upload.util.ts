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
  folder = 'avatars',
): Promise<string> {
  // Tạo unique filename
  const ext = filename.split('.').pop() || 'jpg';
  const uniqueName = `${Date.now()}-${createHash('sha1').update(buffer).digest('hex').slice(0, 8)}.${ext}`;
  
  const filePath = `${folder}/${uniqueName}`;
  
  // Check if Supabase is accessible, fallback to data URL if not
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: getMimeType(ext),
        upsert: false,
      });

    if (error) {
      console.warn('Supabase upload failed, using data URL fallback:', error.message);
      // Fallback: return base64 data URL (for small images)
      const base64 = buffer.toString('base64');
      const mimeType = getMimeType(ext);
      return `data:${mimeType};base64,${base64}`;
    }

    // Lấy public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (fetchError) {
    console.warn('Supabase not accessible, using data URL fallback');
    // Fallback: return base64 data URL
    const base64 = buffer.toString('base64');
    const mimeType = getMimeType(ext);
    return `data:${mimeType};base64,${base64}`;
  }
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteFromSupabase(publicUrl: string): Promise<void> {
  try {
    const url = new URL(publicUrl);
    // URL format: https://xxx.supabase.co/storage/v1/object/public/avatars/filename
    const pathParts = url.pathname.split('/');
    const filenameIndex = pathParts.indexOf('avatars');
    if (filenameIndex === -1) return;
    
    const filePath = pathParts.slice(filenameIndex).join('/');
    
    const { error } = await supabaseAdmin.storage
      .from('avatars')
      .remove([filePath]);
    
    if (error) {
      console.warn('Failed to delete from Supabase:', error.message);
    }
  } catch (e) {
    // ignore
  }
}

/**
 * Upload image - wrapper function
 */
export async function uploadImage(
  buffer: Buffer,
  filename: string,
  folder = 'avatars',
): Promise<string> {
  return uploadToSupabase(buffer, filename, folder);
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
