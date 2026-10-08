'use client';

import { useState } from 'react';
import { Reveal, LiveDot } from '@/components/profile/wow';
import { Skeleton } from '@/components/ui/skeleton';
import { rangeOf, useAnalyticsOverview, useAnalyticsTimeseries, type RangeKey } from '@/hooks/admin/use-admin-analytics';
import { formatPct, formatVnd } from '@/lib/format';

const CATEGORY_COLORS = ['#2a7bd9', '#16a34a', '#7c3aed', '#f59e0b', '#6b7280', '#dc2626'];

function kpiPositive(change: number | null | undefined, invert = false): boolean | null {
  if (change === null || change === undefined) return null;
  if (change === 0) return null;
  return invert ? change < 0 : change > 0;
}

function bucketLabel(bucket: string, granularity: string): string {
  const d = new Date(bucket.includes('T') ? bucket : `${bucket}T00:00:00Z`);
  if (granularity === 'month') {
    return d.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric', timeZone: 'UTC' });
  }
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>('30d');
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(range);
  const { data: timeseries, isLoading: seriesLoading } = useAnalyticsTimeseries(range);
  const { granularity } = rangeOf(range);

  const points = timeseries ?? [];
  const maxRevenue = Math.max(1, ...points.map((p) => p.revenue));
  const allZero = points.length > 0 && points.every((p) => p.revenue === 0 && p.bookings === 0);
  const loading = overviewLoading || seriesLoading;

  const kpis = overview?.kpis;
  const kpiCards = [
    { label: 'Total Revenue', value: formatVnd(kpis?.totalRevenue.value), change: kpis?.totalRevenue.change, icon: '💰', invert: false },
    { label: 'Platform Commission', value: formatVnd(kpis?.platformCommission.value), change: kpis?.platformCommission.change, icon: '📈', invert: false },
    { label: 'Active Users', value: kpis?.activeUsers.value?.toLocaleString('vi-VN') ?? '—', change: kpis?.activeUsers.change, icon: '👥', invert: false },
    { label: 'Cancellation Rate', value: kpis ? `${kpis.cancellationRate.value}%` : '—', change: kpis?.cancellationRate.change, icon: '📉', invert: true },
  ];

  const top = overview?.topMetrics;
  const topMetrics = [
    { label: 'Avg. Booking Value', value: formatVnd(top?.avgBookingValue) },
    { label: 'Total Bookings', value: top?.totalBookings?.toLocaleString('vi-VN') ?? '—' },
    { label: 'Avg. Review Rating', value: top?.avgRating != null ? `${top.avgRating}★` : '—' },
    { label: 'Provider Count', value: top?.providerCount?.toLocaleString('vi-VN') ?? '—' },
    { label: 'Listing Count', value: top?.listingCount?.toLocaleString('vi-VN') ?? '—' },
  ];

  const growth = overview?.userGrowth;
  const growthCards = [
    { type: 'New Travelers', kpi: growth?.newTravelers, invert: false },
    { type: 'New Providers', kpi: growth?.newProviders, invert: false },
    { type: 'Repeat Bookers', kpi: growth?.repeatBookers, invert: false },
    { type: 'Churned Users', kpi: growth?.churnedUsers, invert: true },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <LiveDot label="LIVE" tone="blue" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: '#0f1729' }}>Platform Analytics</h1>
          <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>Số liệu tổng quan: doanh thu, hoa hồng, người dùng, tỷ lệ huỷ đơn</p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as RangeKey)}
          className="rounded-xl border bg-white px-4 py-2 text-sm outline-none"
          style={{ borderColor: '#e2e8f3' }}
        >
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="month">This month</option>
          <option value="year">This year</option>
        </select>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
          : kpiCards.map((kpi) => {
              const pos = kpiPositive(kpi.change, kpi.invert);
              return (
                <Reveal key={kpi.label}>
                  <div className="rounded-2xl border bg-white p-5" style={{ borderColor: '#e2e8f3' }}>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl">{kpi.icon}</div>
                      <div
                        className={`rounded-full px-2 py-1 text-xs font-bold ${
                          pos === true ? 'bg-green-100 text-green-700' : pos === false ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {formatPct(kpi.change)}
                      </div>
                    </div>
                    <div className="mt-3 text-2xl font-bold tabular-nums" style={{ color: '#0f1729' }}>{kpi.value}</div>
                    <div className="mt-1 text-xs" style={{ color: '#5a6b85' }}>{kpi.label}</div>
                  </div>
                </Reveal>
              );
            })}
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-6 lg:col-span-2" style={{ borderColor: '#e2e8f3' }}>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold" style={{ color: '#0f1729' }}>Revenue Trend</h3>
              <p className="text-xs" style={{ color: '#5a6b85' }}>
                {granularity === 'month' ? 'Monthly' : granularity === 'week' ? 'Weekly' : 'Daily'} revenue
              </p>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : points.length === 0 || allZero ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-500">Chưa có dữ liệu trong khoảng này</div>
          ) : (
            <div className="flex items-end gap-3" style={{ height: '200px' }}>
              {points.map((d, i) => (
                <div key={d.bucket} className="group relative flex flex-1 flex-col items-center">
                  <div
                    className="w-full rounded-t-lg transition-all hover:opacity-80"
                    style={{
                      height: `${(d.revenue / maxRevenue) * 100}%`,
                      background: i === points.length - 1 ? 'linear-gradient(to top, #2a7bd9, #92eee8)' : 'linear-gradient(to top, #93c5fd, #bfdbfe)',
                    }}
                  >
                    <div className="absolute -top-10 left-1/2 z-10 w-max -translate-x-1/2 rounded-lg bg-[#0f1729] px-2 py-1 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {formatVnd(d.revenue)} · {d.bookings} booking
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] font-medium" style={{ color: '#5a6b85' }}>{bucketLabel(d.bucket, granularity)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#e2e8f3' }}>
          <h3 className="mb-4 text-lg font-bold" style={{ color: '#0f1729' }}>Top Metrics</h3>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="space-y-4">
              {topMetrics.map((m) => (
                <div key={m.label} className="flex items-center justify-between border-b pb-3 last:border-0" style={{ borderColor: '#f1f5fa' }}>
                  <span className="text-sm" style={{ color: '#5a6b85' }}>{m.label}</span>
                  <div className="font-bold" style={{ color: '#0f1729' }}>{m.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal>
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#e2e8f3' }}>
            <h3 className="mb-4 text-lg font-bold" style={{ color: '#0f1729' }}>Revenue by Category</h3>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="space-y-4">
                {(overview?.revenueByCategory ?? []).map((cat, i) => {
                  const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                  return (
                    <div key={cat.category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium" style={{ color: '#0f1729' }}>{cat.category}</span>
                        <span className="font-bold tabular-nums" style={{ color }}>{formatVnd(cat.revenue)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#f1f5fa]">
                        {/* dynamic width from data */}
                        <div className="h-full rounded-full transition-all" style={{ width: `${cat.percent}%`, background: color }} />
                      </div>
                      <div className="mt-0.5 text-xs" style={{ color: '#8694ad' }}>{cat.percent}% of total</div>
                    </div>
                  );
                })}
                {(overview?.revenueByCategory?.length ?? 0) === 0 && (
                  <p className="text-sm text-slate-500">Chưa có dữ liệu</p>
                )}
              </div>
            )}
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#e2e8f3' }}>
            <h3 className="mb-4 text-lg font-bold" style={{ color: '#0f1729' }}>User Growth</h3>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : (
              <div className="space-y-4">
                {growthCards.map((u) => {
                  const pos = kpiPositive(u.kpi?.change, u.invert);
                  return (
                    <div key={u.type} className="flex items-center justify-between rounded-xl border p-4" style={{ borderColor: '#f1f5fa' }}>
                      <span className="text-sm font-medium" style={{ color: '#5a6b85' }}>{u.type}</span>
                      <div className="text-right">
                        <div className="text-lg font-bold" style={{ color: '#0f1729' }}>{u.kpi?.value?.toLocaleString('vi-VN') ?? '—'}</div>
                        <div
                          className="text-xs font-semibold"
                          style={{ color: pos === true ? '#16a34a' : pos === false ? '#dc2626' : '#5a6b85' }}
                        >
                          {formatPct(u.kpi?.change)} vs kỳ trước
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
