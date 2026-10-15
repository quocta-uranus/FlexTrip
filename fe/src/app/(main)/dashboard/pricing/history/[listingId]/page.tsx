'use client';

import { use } from 'react';
import Link from 'next/link';
import { usePriceHistory } from '@/hooks/pricing/use-price-history';
import { Skeleton } from '@/components/ui/skeleton';
import type { PriceHistoryItem } from '@/types/pricing';

const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN');

const SOURCE_LABEL: Record<PriceHistoryItem['source'], { label: string; color: string; bg: string }> = {
  MANUAL: { label: 'Thủ công', color: '#5a6b85', bg: '#f1f5fa' },
  AI_SUGGESTED: { label: 'Từ AI', color: '#2a7bd9', bg: '#eff6ff' },
  AI_AUTO: { label: 'AI tự động', color: '#7c3aed', bg: '#f5f3ff' },
};

function HistoryRow({ item, prev }: { item: PriceHistoryItem; prev?: PriceHistoryItem }) {
  const src = SOURCE_LABEL[item.source];
  const priceDiff = prev ? item.price - prev.price : 0;
  const sign = priceDiff > 0 ? '+' : priceDiff < 0 ? '' : '';
  const diffColor = priceDiff > 0 ? '#dc2626' : priceDiff < 0 ? '#16a34a' : '#8694ad';

  return (
    <div className="flex items-start gap-4 rounded-2xl border border-[#e2e8f3] bg-white p-4 transition-all hover:shadow-sm">
      {/* Icon */}
      <div
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: src.bg }}
      >
        {item.source === 'AI_SUGGESTED' || item.source === 'AI_AUTO' ? (
          <svg className="h-4.5 w-4.5" style={{ color: src.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        ) : (
          <svg className="h-4.5 w-4.5" style={{ color: src.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-lg font-bold" style={{ color: '#0f1729' }}>
            {fmt(item.price)}₫<span className="text-xs font-normal text-[#8694ad]">/ngày</span>
          </span>
          {priceDiff !== 0 && (
            <span className="text-xs font-semibold" style={{ color: diffColor }}>
              {sign}{fmt(priceDiff)}₫
            </span>
          )}
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: src.bg, color: src.color }}
          >
            {src.label}
          </span>
          {item.aiScore != null && (
            <span className="text-[10px]" style={{ color: '#8694ad' }}>
              độ tin cậy {Math.round(item.aiScore * 100)}%
            </span>
          )}
        </div>

        {item.aiReason && (
          <p className="mt-1 text-xs leading-relaxed" style={{ color: '#5a6b85' }}>
            {item.aiReason}
          </p>
        )}

        {item.bookingRate != null && (
          <p className="mt-1 text-[11px]" style={{ color: '#8694ad' }}>
            Booking rate sau 30 ngày: {item.bookingRate.toFixed(2)}/ngày
          </p>
        )}

        <p className="mt-1.5 text-[10px]" style={{ color: '#8694ad' }}>
          {new Date(item.createdAt).toLocaleString('vi-VN')}
        </p>
      </div>
    </div>
  );
}

export default function PriceHistoryPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = use(params);
  const { data, isLoading } = usePriceHistory(listingId, 50);

  const items = data ?? [];
  const latest = items[0];
  const oldest = items[items.length - 1];
  const totalChange =
    latest && oldest ? latest.price - oldest.price : 0;

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/listings"
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: '#2a7bd9' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: '#0f1729' }}>
            Lịch sử thay đổi giá
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>
            Theo dõi toàn bộ lịch sử điều chỉnh giá và hiệu quả sau mỗi lần thay đổi
          </p>
        </div>

        {/* Summary strip */}
        {!isLoading && items.length >= 2 && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#e2e8f3] bg-white px-5 py-4">
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: '#0f1729' }}>
                {items.length}
              </div>
              <div className="text-xs" style={{ color: '#8694ad' }}>Lần thay đổi</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: '#0f1729' }}>
                {latest ? `${fmt(latest.price)}₫` : '—'}
              </div>
              <div className="text-xs" style={{ color: '#8694ad' }}>Giá hiện tại</div>
            </div>
            <div className="text-center">
              <div
                className="text-xl font-bold"
                style={{ color: totalChange > 0 ? '#dc2626' : totalChange < 0 ? '#16a34a' : '#8694ad' }}
              >
                {totalChange === 0 ? '—' : `${totalChange > 0 ? '+' : ''}${fmt(totalChange)}₫`}
              </div>
              <div className="text-xs" style={{ color: '#8694ad' }}>Tổng thay đổi</div>
            </div>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#e2e8f3] bg-white py-16">
            <svg className="mb-3 h-10 w-10" style={{ color: '#e2e8f3' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium" style={{ color: '#5a6b85' }}>Chưa có lịch sử thay đổi giá</p>
            <p className="mt-1 text-sm" style={{ color: '#8694ad' }}>
              Lịch sử sẽ được ghi lại khi bạn thay đổi giá lần tiếp theo
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => (
              <HistoryRow key={item.id} item={item} prev={items[i + 1]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
