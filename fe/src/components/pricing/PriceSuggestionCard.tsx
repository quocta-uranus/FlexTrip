'use client';

import { useState } from 'react';
import { usePriceSuggestion } from '@/hooks/pricing/use-price-suggestion';
import type { PriceSuggestion } from '@/types/pricing';

const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN');

function DemandBadge({ score, trend }: { score: number; trend: string }) {
  const color =
    score >= 70 ? '#16a34a' : score >= 40 ? '#ca8a04' : '#dc2626';
  const label =
    score >= 70 ? 'Cao' : score >= 40 ? 'Trung bình' : 'Thấp';
  const arrow = trend === 'UP' ? '↑' : trend === 'DOWN' ? '↓' : '→';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: `${color}14`, color }}
    >
      {arrow} {label} ({score}/100)
    </span>
  );
}

function PercentileBar({ myPercentile }: { myPercentile: number | null }) {
  if (myPercentile == null) return null;
  const clamp = Math.min(99, Math.max(1, myPercentile));
  const color =
    clamp < 30 ? '#16a34a' : clamp < 60 ? '#2a7bd9' : clamp < 80 ? '#ca8a04' : '#dc2626';
  return (
    <div className="mt-2">
      <div className="relative h-2 w-full rounded-full bg-[#f1f5fa]">
        <div
          className="absolute left-0 top-0 h-2 rounded-full transition-all"
          style={{ width: `${clamp}%`, background: color }}
        />
        <div
          className="absolute -top-1 h-4 w-0.5 rounded-full"
          style={{ left: `${clamp}%`, background: color }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px]" style={{ color: '#8694ad' }}>
        <span>Rẻ nhất</span>
        <span style={{ color }}>Bạn: p{clamp}</span>
        <span>Đắt nhất</span>
      </div>
    </div>
  );
}

function ConfidenceDots({ confidence }: { confidence: number }) {
  const filled = Math.round(confidence * 5);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: i < filled ? '#2a7bd9' : '#e2e8f3' }}
        />
      ))}
      <span className="ml-1 text-[10px]" style={{ color: '#8694ad' }}>
        Độ tin cậy {Math.round(confidence * 100)}%
      </span>
    </div>
  );
}

type Props = {
  category: string;
  location: string;
  title?: string;
  currentPrice?: number;
  listingId?: string;
  onApply?: (price: number) => void;
};

export function PriceSuggestionCard({ category, location, title, currentPrice, listingId, onApply }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [requested, setRequested] = useState(false);
  const canRequest = !!(category && location);

  const { data, isLoading, isError, refetch } = usePriceSuggestion(
    requested && canRequest ? { category, location, title, currentPrice, listingId } : null,
  );

  if (!canRequest) return null;

  // Not yet requested — show trigger button
  if (!requested) {
    return (
      <button
        type="button"
        onClick={() => setRequested(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#2a7bd9]/40 bg-[#f8fafc] py-3 text-sm font-semibold text-[#2a7bd9] transition-all hover:border-[#2a7bd9] hover:bg-[#eff6ff]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        Gợi ý giá AI
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-3 animate-pulse rounded-2xl border border-[#e2e8f3] bg-[#f8fafc] p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-[#e2e8f3]" />
          <div className="h-3 w-40 rounded bg-[#e2e8f3]" />
        </div>
        <div className="mt-3 h-8 w-32 rounded-lg bg-[#e2e8f3]" />
        <div className="mt-2 h-3 w-full rounded bg-[#e2e8f3]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
        <p className="text-xs text-red-500">Không thể lấy gợi ý giá. Thử lại sau.</p>
        <button type="button" onClick={() => refetch()} className="text-xs font-semibold text-[#2a7bd9]">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-[#2a7bd9]/20 bg-gradient-to-br from-[#eff6ff] to-[#f0fdf4] p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2a7bd9]/10">
            <svg className="h-4 w-4" style={{ color: '#2a7bd9' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#2a7bd9' }}>
            Gợi ý AI
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DemandBadge score={data.demand.score} trend={data.demand.trend} />
          <button
            type="button"
            onClick={() => refetch()}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#2a7bd9]"
            title="Làm mới"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main suggestion */}
      <div className="mt-3">
        <div className="text-2xl font-bold" style={{ color: '#0f1729' }}>
          {fmt(data.suggestedPrice)}
          <span className="ml-1 text-sm font-normal" style={{ color: '#5a6b85' }}>₫/ngày</span>
        </div>
        <div className="mt-0.5 text-xs" style={{ color: '#5a6b85' }}>
          Khoảng hợp lý: {fmt(data.range.min)}₫ – {fmt(data.range.max)}₫
        </div>
      </div>

      {/* Reason */}
      <p className="mt-2 text-xs leading-relaxed" style={{ color: '#5a6b85' }}>
        {data.reason}
      </p>

      {/* Confidence */}
      <div className="mt-3">
        <ConfidenceDots confidence={data.confidence} />
      </div>

      {/* Expandable benchmark */}
      {data.benchmark.sampleCount > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: '#2a7bd9' }}
          >
            <svg
              className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {data.benchmark.sampleCount} sản phẩm tương tự trong khu vực
          </button>

          {expanded && (
            <div className="mt-2 rounded-xl border border-[#e2e8f3] bg-white p-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'p25', value: data.benchmark.p25 },
                  { label: 'p50', value: data.benchmark.p50 },
                  { label: 'p75', value: data.benchmark.p75 },
                  { label: 'p90', value: data.benchmark.p90 },
                ].map((p) => (
                  <div key={p.label}>
                    <div className="text-xs font-bold" style={{ color: '#0f1729' }}>
                      {fmt(p.value)}₫
                    </div>
                    <div className="text-[10px]" style={{ color: '#8694ad' }}>{p.label}</div>
                  </div>
                ))}
              </div>
              <PercentileBar myPercentile={data.benchmark.myPercentile} />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {onApply && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onApply(data.suggestedPrice)}
            className="flex-1 rounded-xl bg-[#2a7bd9] py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1d6abf]"
          >
            Áp dụng {fmt(data.suggestedPrice)}₫
          </button>
          <button
            type="button"
            onClick={() => onApply(data.range.min)}
            className="rounded-xl border border-[#e2e8f3] bg-white px-3 py-2 text-xs font-semibold transition-colors hover:bg-[#f8fafc]"
            style={{ color: '#5a6b85' }}
          >
            Tối thiểu
          </button>
          <button
            type="button"
            onClick={() => onApply(data.range.max)}
            className="rounded-xl border border-[#e2e8f3] bg-white px-3 py-2 text-xs font-semibold transition-colors hover:bg-[#f8fafc]"
            style={{ color: '#5a6b85' }}
          >
            Tối đa
          </button>
        </div>
      )}
    </div>
  );
}
