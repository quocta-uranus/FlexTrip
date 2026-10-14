'use client';

import {
  ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { usePriceOptimization } from '@/hooks/pricing/use-price-optimization';
import { Skeleton } from '@/components/ui/skeleton';

const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN');

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: Record<string, number> }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-xl border border-[#e2e8f3] bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-bold" style={{ color: '#0f1729' }}>
        {p.price != null ? `Giá: ${fmt(p.price)}₫` : `Giá: ${fmt(p.price_rc ?? 0)}₫`}
      </p>
      {p.bookingRate != null && (
        <p className="text-xs" style={{ color: '#2a7bd9' }}>Booking rate: {p.bookingRate.toFixed(3)}/ngày</p>
      )}
      {p.revenue != null && (
        <p className="text-xs" style={{ color: '#7c3aed' }}>Doanh thu: {fmt(p.revenue)}₫</p>
      )}
    </div>
  );
}

type Props = { listingId: string };

export function PriceVolumeChart({ listingId }: Props) {
  const { data, isLoading } = usePriceOptimization(listingId);

  if (isLoading) return <Skeleton className="h-72 w-full rounded-2xl" />;
  if (!data) return null;

  const gainColor = data.expectedRevenueGain > 0 ? '#16a34a' : data.expectedRevenueGain < 0 ? '#dc2626' : '#8694ad';

  // Merge scatter + revenue curve on same price axis
  const scatterData = data.dataPoints.map((p) => ({ price: p.price, bookingRate: p.bookingRate }));
  const curveData = data.revenueCurve.map((p) => ({ price_rc: p.price, revenue: p.revenue }));

  return (
    <div className="rounded-2xl border border-[#e2e8f3] bg-white p-5">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold" style={{ color: '#0f1729' }}>Tối ưu hoá giá & doanh thu</h3>
          <p className="mt-0.5 text-xs" style={{ color: '#8694ad' }}>
            Tương quan giá ↔ lượt thuê trên thị trường
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold" style={{ color: gainColor }}>
            {data.expectedRevenueGain > 0 ? '+' : ''}{data.expectedRevenueGain}%
          </div>
          <div className="text-[10px]" style={{ color: '#8694ad' }}>doanh thu dự kiến</div>
        </div>
      </div>

      {!data.hasSufficientData ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-[#f8fafc] py-10">
          <svg className="mb-3 h-10 w-10" style={{ color: '#e2e8f3' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: '#5a6b85' }}>{data.insight}</p>
        </div>
      ) : (
        <>
          {/* Insight box */}
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#2a7bd9]/15 bg-[#eff6ff] p-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#2a7bd9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: '#1d4ed8' }}>{data.insight}</p>
          </div>

          {/* Stats */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Giá hiện tại', value: `${fmt(data.currentPrice)}₫`, color: '#5a6b85' },
              { label: 'Giá tối ưu', value: `${fmt(data.optimalPrice)}₫`, color: '#2a7bd9' },
              { label: 'Tương quan', value: `r = ${data.correlation.toFixed(2)}`, color: Math.abs(data.correlation) > 0.5 ? '#16a34a' : '#ca8a04' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-[#f8fafc] p-3 text-center">
                <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px]" style={{ color: '#8694ad' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Scatter chart — price vs booking rate */}
          <div className="mb-1">
            <p className="mb-1 text-[11px] font-semibold" style={{ color: '#5a6b85' }}>
              Giá vs. Booking rate (thị trường)
            </p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5fa" />
                  <XAxis
                    dataKey="price"
                    type="number"
                    domain={['auto', 'auto']}
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                    tick={{ fontSize: 10, fill: '#8694ad' }}
                    name="Giá"
                  />
                  <YAxis
                    dataKey="bookingRate"
                    type="number"
                    tick={{ fontSize: 10, fill: '#8694ad' }}
                    name="Booking/ngày"
                  />
                  <Tooltip content={<ScatterTooltip />} />
                  <ReferenceLine
                    x={data.currentPrice}
                    stroke="#ca8a04"
                    strokeDasharray="4 2"
                    label={{ value: 'Hiện tại', fontSize: 9, fill: '#ca8a04' }}
                  />
                  <ReferenceLine
                    x={data.optimalPrice}
                    stroke="#2a7bd9"
                    strokeDasharray="4 2"
                    label={{ value: 'Tối ưu', fontSize: 9, fill: '#2a7bd9' }}
                  />
                  <Scatter data={scatterData} fill="#2a7bd9" fillOpacity={0.6} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue curve */}
          <div>
            <p className="mb-1 text-[11px] font-semibold" style={{ color: '#5a6b85' }}>
              Đường cong doanh thu dự kiến
            </p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={curveData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5fa" />
                  <XAxis
                    dataKey="price_rc"
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                    tick={{ fontSize: 10, fill: '#8694ad' }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#8694ad' }} />
                  <Tooltip content={<ScatterTooltip />} />
                  <ReferenceLine
                    x={data.optimalPrice}
                    stroke="#7c3aed"
                    strokeDasharray="4 2"
                    label={{ value: 'Peak', fontSize: 9, fill: '#7c3aed' }}
                  />
                  <Line
                    dataKey="revenue"
                    type="monotone"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
