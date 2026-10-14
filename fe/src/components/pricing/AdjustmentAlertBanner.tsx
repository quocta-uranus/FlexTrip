'use client';

import { usePriceAdjustment } from '@/hooks/pricing/use-price-adjustment';

const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN');

const URGENCY_STYLE = {
  HIGH: { bg: '#fef2f2', border: '#fca5a5', icon: '#dc2626', badge: '#dc2626', badgeBg: '#fef2f2' },
  MEDIUM: { bg: '#fffbeb', border: '#fcd34d', icon: '#ca8a04', badge: '#ca8a04', badgeBg: '#fffbeb' },
  LOW: { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a', badge: '#16a34a', badgeBg: '#f0fdf4' },
};

const URGENCY_LABEL = { HIGH: 'Cần xem ngay', MEDIUM: 'Nên điều chỉnh', LOW: 'Có thể tối ưu' };

type Props = {
  listingId: string;
  listingTitle: string;
  onApply?: (price: number) => void;
};

export function AdjustmentAlertBanner({ listingId, listingTitle, onApply }: Props) {
  const { data, isLoading } = usePriceAdjustment(listingId);

  if (isLoading || !data || Math.abs(data.changePercent) < 5) return null;

  const s = URGENCY_STYLE[data.urgency];
  const isUp = data.changePercent > 0;

  return (
    <div
      className="rounded-2xl border p-4 transition-all"
      style={{ background: s.bg, borderColor: s.border }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${s.icon}18` }}
        >
          <svg className="h-4.5 w-4.5" style={{ color: s.icon }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {isUp ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.306-4.307a11.95 11.95 0 015.814 5.519l2.74 1.22m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941" />
            )}
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold" style={{ color: '#0f1729' }}>{listingTitle}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: s.badgeBg, color: s.badge, border: `1px solid ${s.border}` }}
            >
              {URGENCY_LABEL[data.urgency]}
            </span>
          </div>

          <p className="mt-1 text-xs leading-relaxed" style={{ color: '#5a6b85' }}>{data.reason}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <span style={{ color: '#8694ad' }}>
              Hiện tại: <strong style={{ color: '#0f1729' }}>{fmt(data.currentPrice)}₫</strong>
            </span>
            <span style={{ color: '#8694ad' }}>→</span>
            <span>
              Đề xuất:{' '}
              <strong style={{ color: s.icon }}>
                {fmt(data.suggestedPrice)}₫ ({isUp ? '+' : ''}{data.changePercent}%)
              </strong>
            </span>
          </div>
        </div>

        {onApply && (
          <button
            type="button"
            onClick={() => onApply(data.suggestedPrice)}
            className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-white transition-colors"
            style={{ background: s.icon }}
          >
            Áp dụng
          </button>
        )}
      </div>
    </div>
  );
}
