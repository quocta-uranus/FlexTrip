'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export type PayGateway = 'PAYOS' | 'WALLET';

interface Props {
  amount: number;
  actionLabel: string;
  walletBalance: number | null;
  pending: boolean;
  onPay: (gateway: PayGateway) => void;
}

const vnd = (n: number) => n.toLocaleString('vi-VN');

export function PaymentMethodPicker({ amount, actionLabel, walletBalance, pending, onPay }: Props) {
  const walletEnough = walletBalance != null && walletBalance >= amount;
  const [method, setMethod] = useState<PayGateway>('PAYOS');
  // Ví không đủ tiền thì không thể giữ lựa chọn Ví.
  const selected: PayGateway = method === 'WALLET' && !walletEnough ? 'PAYOS' : method;

  const options: Array<{ id: PayGateway; title: string; hint: string; disabled: boolean; hintClass: string }> = [
    { id: 'PAYOS', title: 'PayOS', hint: 'Chuyển khoản · Thẻ ATM · VISA', disabled: false, hintClass: 'text-[#5a6b85]' },
    {
      id: 'WALLET',
      title: 'Ví FlexTrip',
      hint: `Số dư: ${vnd(walletBalance ?? 0)} VND${walletEnough ? '' : ' · không đủ'}`,
      disabled: !walletEnough,
      hintClass: walletEnough ? 'text-green-600' : 'text-red-500',
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-[#0f1729]">Chọn phương thức thanh toán</p>
      <div role="radiogroup" aria-label="Phương thức thanh toán" className="space-y-2">
        {options.map((o) => {
          const active = selected === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={o.disabled || pending}
              onClick={() => setMethod(o.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50',
                active ? 'border-[#2a7bd9] bg-[#eaf3fd]' : 'border-[#DCEFFB] bg-white hover:border-[#2a7bd9]/50',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                  active ? 'border-[#2a7bd9]' : 'border-[#c4d3e6]',
                )}
              >
                {active && <span className="h-2.5 w-2.5 rounded-full bg-[#2a7bd9]" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[#0f1729]">{o.title}</span>
                <span className={cn('block text-xs', o.hintClass)}>{o.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      {!walletEnough && (
        <Link href="/profile/payments" className="block text-center text-xs font-semibold text-[#2a7bd9] hover:underline">
          Nạp thêm tiền vào ví
        </Link>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => onPay(selected)}
        className="w-full rounded-xl bg-[#2a7bd9] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1f6bc4] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Đang xử lý…' : `${actionLabel} ${vnd(amount)} VND`}
      </button>
    </div>
  );
}
