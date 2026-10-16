'use client';

import { useRef, useState } from 'react';
import { X, Plus, Image as ImageIcon } from 'lucide-react';
import { listingApi } from '@/lib/api/client';

interface PhotoUploadGridProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  minCount?: number;
  maxCount?: number;
  label?: string;
  disabled?: boolean;
}

export function PhotoUploadGrid({
  photos,
  onChange,
  minCount = 1,
  maxCount = 10,
  label,
  disabled = false,
}: PhotoUploadGridProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meetsMin = photos.length >= minCount;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (photos.length + files.length > maxCount) {
      setError(`Tối đa ${maxCount} ảnh`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const result = await listingApi.uploadImage(file);
        urls.push(result.url);
      }
      onChange([...photos, ...urls]);
    } catch {
      setError('Tải ảnh lên thất bại. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(idx: number) {
    onChange(photos.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: '#0f1729' }}>{label}</p>
          <span
            className="text-xs font-medium"
            style={{ color: meetsMin ? '#15803d' : '#c2410c' }}
          >
            {photos.length}/{minCount} ảnh tối thiểu
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {photos.map((url, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-xl" style={{ border: '1px solid #DCEFFB' }}>
            <img src={url} alt={`Ảnh ${i + 1}`} className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white transition hover:opacity-90"
                style={{ background: 'rgba(0,0,0,0.6)' }}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {!disabled && photos.length < maxCount && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl transition hover:opacity-80 disabled:opacity-50"
            style={{ border: '2px dashed #DCEFFB', background: '#f6fbfe' }}
          >
            {uploading ? (
              <svg className="h-5 w-5 animate-spin" style={{ color: '#2a7bd9' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <>
                <Plus className="h-5 w-5" style={{ color: '#2a7bd9' }} />
                <span className="text-[10px] font-medium" style={{ color: '#5a6b85' }}>Thêm ảnh</span>
              </>
            )}
          </button>
        )}

        {photos.length === 0 && disabled && (
          <div
            className="col-span-3 flex flex-col items-center justify-center gap-2 rounded-xl py-8 sm:col-span-4"
            style={{ border: '1px solid #DCEFFB', background: '#f6fbfe' }}
          >
            <ImageIcon className="h-8 w-8" style={{ color: '#DCEFFB' }} />
            <p className="text-xs" style={{ color: '#8694ad' }}>Chưa có ảnh</p>
          </div>
        )}
      </div>

      {error && <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>}
      {!meetsMin && photos.length > 0 && (
        <p className="text-xs" style={{ color: '#c2410c' }}>
          Cần ít nhất {minCount} ảnh (đang có {photos.length})
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
