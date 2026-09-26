'use client';

import { useRef, useState } from 'react';
import { listingApi } from '@/lib/api/client';

interface ImageUploaderProps {
  urls: string[];
  onChange: (urls: string[]) => void;
}

export function ImageUploader({ urls, onChange }: ImageUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const res = await listingApi.uploadImage(file);
        uploaded.push(res.url);
      } catch {
        setError('Một số ảnh upload thất bại. Kiểm tra kết nối hoặc thử lại.');
      }
    }
    if (uploaded.length) onChange([...urls, ...uploaded]);
    setUploading(false);
  }

  async function removeUrl(idx: number) {
    const url = urls[idx];
    if (url.includes('supabase.co')) {
      try { await listingApi.deleteImage(url); } catch { /* ignore */ }
    }
    onChange(urls.filter((_, i) => i !== idx));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      {/* Previews */}
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {urls.map((url, idx) => (
            <div key={idx} className="relative h-24 w-24 overflow-hidden rounded-xl border group" style={{ borderColor: '#DCEFFB' }}>
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeUrl(idx)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-bold"
              >
                ✕
              </button>
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: '#2a7bd9' }}>
                  Ảnh bìa
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-8 transition-all hover:bg-[#f8fbff]"
        style={{ borderColor: '#DCEFFB' }}
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: '#2a7bd9' }}>
            <span className="animate-spin">⏳</span> Đang upload...
          </div>
        ) : (
          <>
            <span className="text-3xl">🖼️</span>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Kéo thả hoặc click để chọn ảnh</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">JPG, PNG, WEBP — tối đa 10MB mỗi ảnh</p>
          </>
        )}
      </div>

      {error && <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
