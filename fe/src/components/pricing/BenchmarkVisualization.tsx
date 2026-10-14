'use client';

import { useBenchmark } from '@/hooks/pricing/use-benchmark';
import { Skeleton } from '@/components/ui/skeleton';
import type { DetailedBenchmark } from '@/types/pricing';

const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN');

function PercentileTrack({ bench }: { bench: DetailedBenchmark }) {
  const { p25, p50, p75, p90, currentPrice, myPercentile } = bench;
  const max = p90 * 1.1;
  const pct = (v: number) => Math.min(100, Math.round((v / max) * 100));
  const myPct = pct(currentPrice);
  const myColor =
    (myPercentile ?? 50) < 30
      ? '#16a34a'
      : (myPercentile ?? 50) < 70
        ? '#2a7bd9'
        : '#ca8a04';

  const markers = [
    { label: 'p25', value: p25, color: '#16a34a' },
    { label: 'p50', value: p50, color: '#2a7bd9' },
    { label: 'p75', value: p75, color: '#ca8a04' },
    { label: 'p90', value: p90, color: '#dc2626' },
  ];

  return (
    <div className="mt-4">
      <div className="relative h-3 w-full overflow-visible rounded-full bg-gradient-to-r from-[#16a34a]/20 via-[#2a7bd9]/20 to-[#dc2626]/20">
        {/* percentile ticks */}
        {markers.map((m) => (
          <div
            key={m.label}
            className="absolute top-0 h-3 w-0.5 rounded-full"
            style={{ left: `${pct(m.value)}%`, background: m.color }}
          />
        ))}
        {/* my price marker */}
        <div
          className="absolute -top-1 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white shadow-md transition-all"
          style={{ left: `${myPct}%`, background: myColor }}
        >
          <span className="text-[8px] font-bold text-white">Bạn</span>
        </div>
      </div>

      {/* Labels */}
      <div className="relative mt-3 h-8">
        {markers.map((m) => (
          <div
            key={m.label}
            className="absolute -translate-x-1/2 text-center"
            style={{ left: `${pct(m.value)}%` }}
          >
            <div className="text-[10px] font-bold" style={{ color: m.color }}>{m.label}</div>
            <div className="text-[9px]" style={{ color: '#8694ad' }}>{fmt(m.value)}₫</div>
          </div>
        ))}
      </div>
    </div>
  );
}

type Props = { listingId: string };

export function BenchmarkVisualization({ listingId }: Props) {
  const { data, isLoading } = useBenchmark(listingId);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!data) return null;

  const noData = data.sampleCount === 0;
  const pctColor =
    (data.myPercentile ?? 50) < 30
      ? '#16a34a'
      : (data.myPercentile ?? 50) < 70
        ? '#2a7bd9'
        : '#ca8a04';

  return (
    <div className="rounded-2xl border border-[#e2e8f3] bg-white p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold" style={{ color: '#0f1729' }}>So sánh thị trường</h3>
          <p className="mt-0.5 text-xs" style={{ color: '#8694ad' }}>
            {noData ? 'Chưa đủ dữ liệu trong khu vực' : `${data.sampleCount} sản phẩm tương tự`}
          </p>
        </div>
        {!noData && data.myPercentile != null && (
          <div
            className="rounded-xl px-3 py-1.5 text-center"
            style={{ background: `${pctColor}12` }}
          >
            <div className="text-lg font-bold" style={{ color: pctColor }}>p{data.myPercentile}</div>
            <div className="text-[10px]" style={{ color: pctColor }}>Phân vị của bạn</div>
          </div>
        )}
      </div>

      {noData ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#f8fafc] p-3">
          <span className="text-xl">📊</span>
          <p className="text-sm" style={{ color: '#5a6b85' }}>Thêm listing vào khu vực có nhiều sản phẩm hơn để xem so sánh.</p>
        </div>
      ) : (
        <>
          {/* Percentile track */}
          <PercentileTrack bench={data} />

          {/* Stats grid */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#f8fafc] p-3">
              <div className="text-xs font-semibold" style={{ color: '#5a6b85' }}>Giá trung vị (p50)</div>
              <div className="mt-1 text-xl font-bold" style={{ color: '#0f1729' }}>{fmt(data.p50)}₫</div>
            </div>
            <div className="rounded-xl bg-[#f8fafc] p-3">
              <div className="text-xs font-semibold" style={{ color: '#5a6b85' }}>Giá của bạn</div>
              <div className="mt-1 text-xl font-bold" style={{ color: pctColor }}>{fmt(data.currentPrice)}₫</div>
            </div>
            {data.myBookingRate != null && (
              <div className="rounded-xl bg-[#f8fafc] p-3">
                <div className="text-xs font-semibold" style={{ color: '#5a6b85' }}>Booking rate của bạn</div>
                <div className="mt-1 text-xl font-bold" style={{ color: '#0f1729' }}>
                  {data.myBookingRate.toFixed(2)}<span className="text-xs font-normal">/ngày</span>
                </div>
              </div>
            )}
            {data.marketBookingRate != null && (
              <div className="rounded-xl bg-[#f8fafc] p-3">
                <div className="text-xs font-semibold" style={{ color: '#5a6b85' }}>Trung bình thị trường</div>
                <div className="mt-1 text-xl font-bold" style={{ color: '#0f1729' }}>
                  {data.marketBookingRate.toFixed(2)}<span className="text-xs font-normal">/ngày</span>
                </div>
              </div>
            )}
          </div>

          {/* Advice */}
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#2a7bd9]/15 bg-[#eff6ff] p-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#2a7bd9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: '#1d4ed8' }}>{data.priceAdvice}</p>
          </div>

          {/* Competitors preview */}
          {data.competitors.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold" style={{ color: '#5a6b85' }}>Sản phẩm cùng khu vực</p>
              <div className="space-y-1.5">
                {data.competitors.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg bg-[#f8fafc] px-3 py-2">
                    <span className="truncate text-xs" style={{ color: '#0f1729' }}>{c.title}</span>
                    <span className="ml-3 shrink-0 text-xs font-semibold" style={{ color: '#5a6b85' }}>
                      {fmt(c.price)}₫
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
