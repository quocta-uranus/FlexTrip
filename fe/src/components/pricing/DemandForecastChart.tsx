'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useDemandForecast } from '@/hooks/pricing/use-demand-forecast';
import { LISTING_CATEGORIES } from '@/constants/categories';
import { Skeleton } from '@/components/ui/skeleton';

const DAYS_OPTIONS = [30, 60, 90] as const;

const SCORE_COLOR = (score: number) =>
  score >= 70 ? '#16a34a' : score >= 40 ? '#2a7bd9' : '#dc2626';

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { isProjected: boolean; bookingCount: number } }>;
  label?: string;
}) {
  if (!active || !payload?.[0]) return null;
  const { value, payload: p } = payload[0];
  return (
    <div className="rounded-xl border border-[#e2e8f3] bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold" style={{ color: '#0f1729' }}>
        {label ? new Date(label).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' }) : ''}
      </p>
      <p className="mt-0.5 text-xs" style={{ color: SCORE_COLOR(value) }}>
        Chỉ số nhu cầu: <strong>{value}</strong>/100
      </p>
      <p className="text-[10px]" style={{ color: '#8694ad' }}>
        {p.isProjected ? '📊 Dự báo' : '📈 Thực tế'} · {p.bookingCount} booking
      </p>
    </div>
  );
}

const REGIONS = ['Đà Nẵng', 'Hà Nội', 'Hồ Chí Minh', 'Đà Lạt', 'Nha Trang', 'Huế', 'Phú Quốc'];

type Props = {
  defaultRegion?: string;
  defaultCategory?: string;
};

export function DemandForecastChart({ defaultRegion = 'Đà Nẵng', defaultCategory = 'VEHICLE' }: Props) {
  const [region, setRegion] = useState(defaultRegion);
  const [category, setCategory] = useState(defaultCategory);
  const [days, setDays] = useState<30 | 60 | 90>(30);

  const { data, isLoading } = useDemandForecast({ region, category, days });

  const todayKey = new Date().toISOString().slice(0, 10);
  const points = data?.points ?? [];

  const trendColor =
    data?.trend === 'UP' ? '#16a34a' : data?.trend === 'DOWN' ? '#dc2626' : '#5a6b85';
  const trendLabel =
    data?.trend === 'UP' ? '↑ Đang tăng' : data?.trend === 'DOWN' ? '↓ Đang giảm' : '→ Ổn định';

  return (
    <div className="rounded-2xl border border-[#e2e8f3] bg-white p-5">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold" style={{ color: '#0f1729' }}>Dự báo nhu cầu thị trường</h3>
          <p className="mt-0.5 text-xs" style={{ color: '#8694ad' }}>
            Phân tích xu hướng thuê theo khu vực & danh mục
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: trendColor }}>{trendLabel}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{ background: `${SCORE_COLOR(data.currentScore)}14`, color: SCORE_COLOR(data.currentScore) }}
            >
              {data.currentScore}/100 hôm nay
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="rounded-xl border border-[#e2e8f3] bg-[#f8fafc] px-3 py-1.5 text-sm outline-none focus:border-[#2a7bd9]"
        >
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-[#e2e8f3] bg-[#f8fafc] px-3 py-1.5 text-sm outline-none focus:border-[#2a7bd9]"
        >
          {LISTING_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <div className="flex rounded-xl border border-[#e2e8f3] overflow-hidden">
          {DAYS_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className="px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: days === d ? '#2a7bd9' : 'white',
                color: days === d ? 'white' : '#5a6b85',
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <Skeleton className="h-52 w-full rounded-xl" />
      ) : points.length === 0 ? (
        <div className="flex h-52 items-center justify-center rounded-xl bg-[#f8fafc]">
          <p className="text-sm" style={{ color: '#8694ad' }}>Chưa có đủ dữ liệu trong khu vực này</p>
        </div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2a7bd9" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#2a7bd9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5fa" />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => new Date(v).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}
                tick={{ fontSize: 10, fill: '#8694ad' }}
                interval={Math.floor(points.length / 6)}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8694ad' }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={todayKey} stroke="#e2e8f3" strokeDasharray="4 2" label={{ value: 'Hôm nay', fontSize: 10, fill: '#8694ad' }} />
              {/* Historical */}
              <Area
                dataKey="score"
                data={points.filter((p) => !p.isProjected)}
                type="monotone"
                stroke="#2a7bd9"
                strokeWidth={2}
                fill="url(#scoreGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#2a7bd9' }}
              />
              {/* Projected */}
              <Area
                dataKey="score"
                data={points.filter((p) => p.isProjected)}
                type="monotone"
                stroke="#7c3aed"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                fill="url(#projGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#7c3aed' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Peak periods */}
      {(data?.peakPeriods?.length ?? 0) > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs font-semibold" style={{ color: '#5a6b85' }}>Cao điểm dự báo:</span>
          {data!.peakPeriods.map((p) => (
            <span
              key={p.start}
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: '#16a34a14', color: '#16a34a' }}
            >
              {p.label} (score {p.avgScore})
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-4 text-[11px]" style={{ color: '#8694ad' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded" style={{ background: '#2a7bd9' }} />
          Thực tế
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded border-t-2 border-dashed" style={{ borderColor: '#7c3aed' }} />
          Dự báo
        </span>
      </div>
    </div>
  );
}
