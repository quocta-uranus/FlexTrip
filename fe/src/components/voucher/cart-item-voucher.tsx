'use client';

import { useState } from 'react';
import { Check, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useValidateVoucher } from '@/hooks/useVouchers';
import type { CartItem } from '@/types/booking';

export interface AppliedVoucher {
  code: string;
  discount: number;
}

interface Props {
  item: CartItem;
  applied?: AppliedVoucher;
  onChange: (voucher: AppliedVoucher | null) => void;
}

export function CartItemVoucher({ item, applied, onChange }: Props) {
  const [code, setCode] = useState('');
  const validate = useValidateVoucher();

  async function apply() {
    const value = code.trim();
    if (!value) return;
    const preview = await validate
      .mutateAsync({ code: value, listingId: item.listingId, startDate: item.startDate, endDate: item.endDate, quantity: item.quantity })
      .catch(() => null);
    if (preview) {
      onChange({ code: preview.code, discount: preview.discountAmount });
      setCode('');
    }
  }

  if (applied) {
    return (
      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        <span className="flex min-w-0 items-center gap-1.5">
          <Check className="size-3.5 shrink-0" />
          <span className="truncate font-semibold">{applied.code}</span>
          <span>· giảm {applied.discount.toLocaleString('vi-VN')} ₫ tiền thuê</span>
        </span>
        <button type="button" onClick={() => onChange(null)} aria-label="Bỏ mã giảm giá" className="shrink-0 rounded p-0.5 hover:bg-emerald-100">
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Tag className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={code}
            onChange={(e) => { setCode(e.target.value); validate.reset(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void apply(); } }}
            placeholder="Mã giảm giá"
            maxLength={32}
            aria-label="Mã giảm giá"
            className="h-8 pl-8 text-xs uppercase"
          />
        </div>
        <Button type="button" size="sm" variant="outline" disabled={!code.trim() || validate.isPending} onClick={apply} className="h-8">
          {validate.isPending ? 'Đang kiểm tra…' : 'Áp dụng'}
        </Button>
      </div>
      {validate.error && <p role="alert" className="mt-1 text-[11px] text-red-600">{validate.error.message}</p>}
    </div>
  );
}
