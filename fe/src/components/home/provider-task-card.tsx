'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Store } from 'lucide-react';
import { useAppMode } from '@/hooks/useAppMode';
import { useProviderBookings } from '@/hooks/useBookings';

const PAGE = 50;

// Shown only to accounts that are also Providers, and only while the API reports orders waiting for approval.
export function ProviderTaskCard() {
  const router = useRouter();
  const { isDual, setMode } = useAppMode();
  const { data } = useProviderBookings({ status: 'PENDING_APPROVAL', limit: PAGE }, { enabled: isDual });

  const count = data?.length ?? 0;
  if (!isDual || count === 0) return null;

  function openOrders() {
    setMode('provider');
    router.push('/dashboard/bookings');
  }

  return (
    <button
      type="button"
      onClick={openOrders}
      className="mt-4 flex w-full items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100 sm:px-5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600">
        <Store className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink">
          {count >= PAGE ? `${PAGE}+` : count} đơn thuê đang chờ bạn xác nhận
        </span>
        <span className="block text-xs text-slate-600">Việc của bạn với vai trò Provider</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-amber-700">
        Xử lý đơn <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}
