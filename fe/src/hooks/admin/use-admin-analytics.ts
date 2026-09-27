import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { Granularity } from '@/types/admin';

export type RangeKey = '30d' | '90d' | 'month' | 'year';

const vnToday = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

export function rangeOf(key: RangeKey): { from: string; to: string; granularity: Granularity } {
  const to = vnToday();
  const d = new Date(`${to}T00:00:00Z`);
  if (key === 'month') return { from: `${to.slice(0, 7)}-01`, to, granularity: 'day' };
  if (key === 'year') return { from: `${to.slice(0, 4)}-01-01`, to, granularity: 'month' };
  const days = key === '30d' ? 29 : 89;
  d.setUTCDate(d.getUTCDate() - days);
  return { from: d.toISOString().slice(0, 10), to, granularity: key === '30d' ? 'day' : 'week' };
}

export function useAnalyticsOverview(key: RangeKey) {
  const { from, to } = rangeOf(key);
  return useQuery({ queryKey: ['admin', 'analytics', 'overview', key], queryFn: () => adminApi.analytics.overview({ from, to }) });
}
export function useAnalyticsTimeseries(key: RangeKey) {
  const r = rangeOf(key);
  return useQuery({ queryKey: ['admin', 'analytics', 'timeseries', key], queryFn: () => adminApi.analytics.timeseries(r) });
}
