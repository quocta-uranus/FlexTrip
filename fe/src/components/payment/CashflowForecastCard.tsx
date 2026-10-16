'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCashflowForecast } from '@/hooks/usePaymentAi';

const TREND_CONFIG = {
  up:     { icon: TrendingUp,   color: '#16a34a', label: 'Tăng trưởng' },
  stable: { icon: Minus,        color: '#2a7bd9', label: 'Ổn định'     },
  down:   { icon: TrendingDown, color: '#dc2626', label: 'Giảm'        },
};

export function CashflowForecastCard() {
  const [days, setDays] = useState<30 | 60 | 90>(30);
  const { data, isLoading } = useCashflowForecast(days);

  const trend = data ? TREND_CONFIG[data.trend] : null;
  const TrendIcon = trend?.icon ?? Minus;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <h2 className="font-semibold text-slate-800">Dự báo dòng tiền AI</h2>
        </div>
        <div className="flex gap-1">
          {([30, 60, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-all"
              style={
                days === d
                  ? { background: '#2a7bd9', color: '#fff' }
                  : { background: '#f1f5fa', color: '#5a6b85' }
              }
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
          </div>
        ) : data ? (
          <>
            {/* Main metric */}
            <div className="mb-4 flex items-end gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Doanh thu dự báo {days} ngày</p>
                <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {data.projectedRevenue.toLocaleString('vi-VN')} ₫
                </p>
              </div>
              {trend && (
                <div
                  className="mb-1 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ background: `${trend.color}15`, color: trend.color }}
                >
                  <TrendIcon className="h-3 w-3" />
                  {trend.label}
                </div>
              )}
            </div>

            {/* Sub-metrics */}
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Đã xác nhận</p>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {data.confirmedRevenue.toLocaleString('vi-VN')} ₫
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Đơn dự báo</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{data.projectedBookings}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">TB/đơn</p>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {data.avgRevenuePerBooking.toLocaleString('vi-VN')} ₫
                </p>
              </div>
            </div>

            {/* AI reasoning */}
            <p className="text-xs text-slate-500 leading-relaxed">{data.reasoning}</p>
          </>
        ) : (
          <p className="text-sm text-slate-400">Không thể tải dự báo. Vui lòng thử lại.</p>
        )}
      </div>
    </div>
  );
}
