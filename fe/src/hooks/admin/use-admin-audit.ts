import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import type { AuditModule } from '@/types/admin';

export type AuditDateKey = 'today' | 'yesterday' | '7d' | '30d';
export interface AuditFilters { module: AuditModule | 'ALL'; date: AuditDateKey; search: string; page: number }

const vnDay = (offset: number) => new Date(Date.now() + 7 * 3600_000 - offset * 24 * 3600_000).toISOString().slice(0, 10);

export function auditRange(key: AuditDateKey) {
  if (key === 'today') return { from: vnDay(0), to: vnDay(0) };
  if (key === 'yesterday') return { from: vnDay(1), to: vnDay(1) };
  return { from: vnDay(key === '7d' ? 6 : 29), to: vnDay(0) };
}

export function useAuditLogs(f: AuditFilters) {
  const q = { module: f.module, search: f.search, page: f.page, limit: 30, ...auditRange(f.date) };
  return { query: useQuery({ queryKey: ['admin', 'audit', f], queryFn: () => adminApi.audit.list(q), placeholderData: keepPreviousData }), params: q };
}
export function useAuditStats() {
  return useQuery({ queryKey: ['admin', 'audit', 'stats'], queryFn: adminApi.audit.stats });
}
