'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  tone?: 'default' | 'danger';
  /** Show a reason textarea; `true` = required. */
  requireReason?: boolean;
  optionalReason?: boolean;
  reasonPresets?: string[];
  pending?: boolean;
  onConfirm: (reason: string) => void;
}

export function ConfirmDialog(p: Props) {
  const [reason, setReason] = useState('');
  const [wasOpen, setWasOpen] = useState(p.open);
  if (p.open !== wasOpen) {
    setWasOpen(p.open);
    if (p.open) setReason('');
  }
  const showReason = p.requireReason || p.optionalReason;
  const invalid = !!p.requireReason && reason.trim().length === 0;

  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{p.title}</DialogTitle>
          {p.description && <DialogDescription>{p.description}</DialogDescription>}
        </DialogHeader>
        {showReason && (
          <div className="space-y-2">
            {p.reasonPresets && (
              <div className="flex flex-wrap gap-2">
                {p.reasonPresets.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`rounded-full border px-3 py-1 text-xs ${reason === r ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
            <Label htmlFor="confirm-reason">{p.requireReason ? 'Lý do (bắt buộc)' : 'Ghi chú (tuỳ chọn)'}</Label>
            <Textarea id="confirm-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => p.onOpenChange(false)} disabled={p.pending}>Huỷ</Button>
          <Button
            variant={p.tone === 'danger' ? 'destructive' : 'default'}
            disabled={invalid || p.pending}
            onClick={() => p.onConfirm(reason.trim())}
          >
            {p.pending ? 'Đang xử lý…' : p.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
