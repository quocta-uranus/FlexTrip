'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { locationSchema } from '@/lib/validators/message';
import type { Point } from './location-picker-map';

const PickerMap = dynamic(() => import('./location-picker-map'), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-lg bg-[#e2e8f3]" />,
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: { latitude: number; longitude: number; locationLabel?: string }) => void;
}

export function LocationPicker({ open, onOpenChange, onSubmit }: Props) {
  const [position, setPosition] = useState<Point | null>(null);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPosition(null);
    setLabel('');
    setError(null);
  }

  // Every close path (Esc, backdrop, submit) must clear state so a reopened dialog starts fresh.
  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function fillCurrentPosition() {
    setError(null);
    if (!navigator.geolocation) return setError('Trình duyệt không hỗ trợ định vị. Hãy chọn điểm trên bản đồ.');
    navigator.geolocation.getCurrentPosition(
      (p) => setPosition({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => setError('Không lấy được vị trí. Hãy cho phép truy cập vị trí hoặc chọn điểm trên bản đồ.'),
      { timeout: 10000 },
    );
  }

  function submit() {
    const parsed = locationSchema.safeParse({ ...position, locationLabel: label.trim() || undefined });
    if (!parsed.success) return setError('Vị trí không hợp lệ');
    onSubmit(parsed.data);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chia sẻ vị trí</DialogTitle>
        </DialogHeader>
        <PickerMap
          position={position}
          onChange={(p) => {
            setError(null);
            setPosition(p);
          }}
        />
        <Button type="button" variant="outline" onClick={fillCurrentPosition}>Dùng vị trí hiện tại</Button>
        <Input aria-label="Tên địa điểm (tuỳ chọn)" placeholder="Tên địa điểm (tuỳ chọn)" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={200} />
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <Button type="button" disabled={!position} onClick={submit}>Gửi vị trí</Button>
      </DialogContent>
    </Dialog>
  );
}
