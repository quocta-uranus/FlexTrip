'use client';

import { useDepositRecommendation } from '@/hooks/usePaymentAi';

interface DepositAiBadgeProps {
  listingId: string;
  currentRate: number;
}

export function DepositAiBadge({ listingId, currentRate }: DepositAiBadgeProps) {
  const { data, isLoading } = useDepositRecommendation(listingId);

  if (isLoading) {
    return (
      <div className="h-12 animate-pulse rounded-xl" style={{ background: '#e2e8f3' }} />
    );
  }

  if (!data) return null;

  const diff = data.recommendedRate - currentRate;
  const isHigher = diff > 0.02;
  const isLower = diff < -0.02;

  return (
    <div
      className="flex items-start gap-3 rounded-xl border px-4 py-3"
      style={{ borderColor: '#bfdbfe', background: 'rgba(239,246,255,0.8)' }}
    >
      <span className="text-base shrink-0">🤖</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold" style={{ color: '#1d4ed8' }}>
          AI gợi ý mức cọc:{' '}
          <span style={{ color: '#0f1729' }}>
            {Math.round(data.recommendedRate * 100)}%
          </span>
          {' '}
          <span className="font-normal" style={{ color: '#8694ad' }}>
            ({Math.round(data.minRate * 100)}%–{Math.round(data.maxRate * 100)}%)
          </span>
          {isHigher && <span className="ml-1" style={{ color: '#dc2626' }}>↑ cao hơn mặc định</span>}
          {isLower && <span className="ml-1" style={{ color: '#16a34a' }}>↓ thấp hơn mặc định</span>}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: '#5a6b85' }}>{data.reasoning}</p>
        <p className="mt-0.5 text-[10px]" style={{ color: '#94a3b8' }}>
          Độ tin cậy: {Math.round(data.confidence * 100)}%
        </p>
      </div>
    </div>
  );
}
