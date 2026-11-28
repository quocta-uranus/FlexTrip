'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useOpenLateReturnDispute, useResolveOverdueHandover } from '@/hooks/admin/use-admin-bookings';
import { getOverdue, type OverdueInput } from '@/lib/overdue';
import type { HandoverFault } from '@/types/admin';

// Must match HANDOVER_ADMIN_DAYS and LATE_RETURN_DISPUTE_DAYS in be/src/modules/booking/overdue.service.ts
const NO_SHOW_DAYS = 2;
const DISPUTE_DAYS = 3;

const FAULTS: Array<{ value: HandoverFault; label: string; effect: string }> = [
  { value: 'TRAVELER_NO_SHOW', label: 'Khách không đến nhận', effect: 'Huỷ đơn. Khách mất cọc cho chủ đồ, được hoàn tiền thuê đã trả.' },
  { value: 'PROVIDER_FAULT', label: 'Lỗi chủ đồ', effect: 'Huỷ đơn. Khách được hoàn 100%, chủ đồ bị tính một lần vi phạm.' },
  { value: 'PLATFORM_FAULT', label: 'Lỗi FlexTrip', effect: 'Huỷ đơn. Khách được hoàn 100%.' },
];

export function OverdueActions({ booking }: { booking: OverdueInput & { id: string } }) {
  const [fault, setFault] = useState<HandoverFault | null>(null);
  const [note, setNote] = useState('');
  const resolve = useResolveOverdueHandover(booking.id);
  const dispute = useOpenLateReturnDispute(booking.id);
  const overdue = getOverdue(booking);

  if (dispute.data) {
    return (
      <Link href={`/admin/04-disputes-refunds/${dispute.data.disputeId}`} className="block rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 underline">
        Đã mở tranh chấp trả trễ. Đi tới tranh chấp
      </Link>
    );
  }
  if (!overdue) return null;

  const error = (resolve.error ?? dispute.error) as { message?: string } | null;
  const selected = FAULTS.find((f) => f.value === fault);

  return (
    <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-bold text-red-700">{overdue.label}</p>

      {overdue.kind === 'handover' ? (
        <>
          <p className="text-xs text-red-700">Liên hệ hai bên trước khi kết luận. Chỉ chọn được &quot;Khách không đến&quot; từ ngày quá hạn thứ {NO_SHOW_DAYS}.</p>
          <div className="flex flex-wrap gap-2">
            {FAULTS.map((f) => (
              <Button
                key={f.value}
                type="button"
                size="sm"
                variant={fault === f.value ? 'default' : 'outline'}
                disabled={f.value === 'TRAVELER_NO_SHOW' && overdue.days < NO_SHOW_DAYS}
                onClick={() => setFault(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          {selected && (
            <>
              <p className="text-xs font-semibold text-red-700">{selected.effect} Không hoàn tác được.</p>
              <input
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú xác minh (không bắt buộc)"
                className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
              />
              <Button
                type="button"
                size="sm"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate({ fault: selected.value, note: note.trim() || undefined })}
              >
                {resolve.isPending ? 'Đang xử lý…' : `Xác nhận: ${selected.label}`}
              </Button>
            </>
          )}
        </>
      ) : overdue.days >= DISPUTE_DAYS ? (
        <Button type="button" size="sm" disabled={dispute.isPending} onClick={() => dispute.mutate()}>
          {dispute.isPending ? 'Đang mở…' : 'Mở tranh chấp trả trễ'}
        </Button>
      ) : (
        <p className="text-xs text-red-700">Nhân viên liên hệ khách. Mở tranh chấp được từ ngày trễ thứ {DISPUTE_DAYS}.</p>
      )}

      {error && <p className="text-xs font-semibold text-red-700">{error.message ?? 'Không thể thực hiện. Vui lòng thử lại.'}</p>}
    </div>
  );
}
