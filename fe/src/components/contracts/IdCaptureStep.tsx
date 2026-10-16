'use client';

import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { PhotoUploadGrid } from './PhotoUploadGrid';

export type IdDocumentType = 'NATIONAL_ID' | 'PASSPORT';

interface IdCaptureStepProps {
  idPhotoUrl: string | null;
  idDocumentType: IdDocumentType;
  onIdPhotoChange: (url: string | null) => void;
  onDocumentTypeChange: (type: IdDocumentType) => void;
  disabled?: boolean;
}

const DOC_TYPES: Array<{ value: IdDocumentType; label: string }> = [
  { value: 'NATIONAL_ID', label: 'CCCD / CMND' },
  { value: 'PASSPORT', label: 'Hộ chiếu' },
];

export function IdCaptureStep({
  idPhotoUrl,
  idDocumentType,
  onIdPhotoChange,
  onDocumentTypeChange,
  disabled = false,
}: IdCaptureStepProps) {
  const [photos, setPhotos] = useState<string[]>(idPhotoUrl ? [idPhotoUrl] : []);

  function handlePhotosChange(newPhotos: string[]) {
    setPhotos(newPhotos);
    onIdPhotoChange(newPhotos[0] ?? null);
  }

  return (
    <div className="space-y-4">
      {/* Security notice */}
      <div
        className="flex items-start gap-3 rounded-xl border p-4 text-sm"
        style={{ borderColor: '#bfdbfe', background: '#eff6ff' }}
      >
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#1d4ed8' }} />
        <div style={{ color: '#1e40af' }}>
          <p className="font-semibold">Xác minh danh tính khách thuê</p>
          <p className="mt-0.5 text-xs">
            Chụp ảnh CCCD/Hộ chiếu của khách thuê đang cầm. Ảnh được mã hóa và chỉ dùng để giải quyết tranh chấp.
            Sẽ tự động xóa sau 90 ngày kể từ khi kết thúc thuê.
          </p>
        </div>
      </div>

      {/* Document type selector */}
      <div>
        <p className="mb-2 text-sm font-medium" style={{ color: '#0f1729' }}>Loại giấy tờ</p>
        <div className="flex gap-2">
          {DOC_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              disabled={disabled}
              onClick={() => onDocumentTypeChange(t.value)}
              className="rounded-xl border px-4 py-2 text-sm font-medium transition"
              style={
                idDocumentType === t.value
                  ? { background: '#2a7bd9', color: '#fff', borderColor: '#2a7bd9' }
                  : { borderColor: '#DCEFFB', color: '#5a6b85' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Photo upload — max 1 */}
      <PhotoUploadGrid
        photos={photos}
        onChange={handlePhotosChange}
        minCount={1}
        maxCount={1}
        label="Ảnh CCCD / Hộ chiếu"
        disabled={disabled}
      />

      {!idPhotoUrl && (
        <p className="text-xs" style={{ color: '#c2410c' }}>
          Bắt buộc chụp ảnh giấy tờ trước khi giao đồ.
        </p>
      )}
    </div>
  );
}
