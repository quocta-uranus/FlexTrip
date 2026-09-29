'use client';

import { useState } from 'react';
import { Reveal, LiveDot } from '@/components/profile/wow';
import { Pagination } from '@/components/admin/pagination';
import { useAdminToast } from '@/components/admin/use-admin-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { History } from 'lucide-react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  useAuditLogs,
  useAuditStats,
  type AuditDateKey,
  type AuditFilters,
} from '@/hooks/admin/use-admin-audit';
import { adminApi } from '@/lib/api/admin';
import { formatDateTime } from '@/lib/format';
import type { AuditModule } from '@/types/admin';

const moduleColors: Record<string, { bg: string; text: string; icon: string }> = {
  KYC: { bg: 'rgba(34,197,94,0.1)', text: '#16a34a', icon: '✓' },
  PROVIDER: { bg: 'rgba(42,123,217,0.1)', text: '#2a7bd9', icon: '🏢' },
  CONFIG: { bg: 'rgba(124,58,237,0.1)', text: '#7c3aed', icon: '⚙️' },
  MODERATION: { bg: 'rgba(239,68,68,0.1)', text: '#dc2626', icon: '🛡️' },
  USER: { bg: 'rgba(234,179,8,0.1)', text: '#ca8a04', icon: '👤' },
  FINANCE: { bg: 'rgba(146,238,232,0.3)', text: '#1e5aa8', icon: '💰' },
  DISPUTE: { bg: 'rgba(249,115,22,0.1)', text: '#ea580c', icon: '⚖️' },
  STAFF: { bg: 'rgba(99,102,241,0.1)', text: '#4f46e5', icon: '👥' },
};

const ACTION_TONE: [RegExp, string][] = [
  [/_(SUSPENDED|REMOVE|REJECTED|DELETED)$/, 'text-red-600 bg-red-50'],
  [/_(HIDE|ESCALATED|UNASSIGNED)$/, 'text-amber-600 bg-amber-50'],
  [/_(APPROVED|UNSUSPENDED|RESTORE|RESOLVED|CREATED|ASSIGNED|AUTO_ASSIGNED)$/, 'text-green-600 bg-green-50'],
];
const toneOf = (a: string) => ACTION_TONE.find(([re]) => re.test(a))?.[1] ?? 'text-blue-600 bg-blue-50';

const MODULES: (AuditModule | 'ALL')[] = ['ALL', 'USER', 'MODERATION', 'DISPUTE', 'FINANCE', 'CONFIG', 'STAFF', 'KYC', 'PROVIDER'];

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [module, setModule] = useState<AuditModule | 'ALL'>('ALL');
  const [date, setDate] = useState<AuditDateKey>('7d');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const debounced = useDebouncedValue(search);
  const filterKey = `${debounced}|${module}|${date}`;
  const [prevKey, setPrevKey] = useState(filterKey);
  if (filterKey !== prevKey) {
    setPrevKey(filterKey);
    setPage(1);
  }

  const filters: AuditFilters = { module, date, search: debounced, page };
  const { query, params } = useAuditLogs(filters);
  const { data: stats } = useAuditStats();
  const toast = useAdminToast();
  const logs = query.data?.items ?? [];

  const exportLogs = async () => {
    try {
      await adminApi.audit.export(params);
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN-09</span>
            <LiveDot label="TRACKING" tone="blue" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: '#0f1729' }}>Audit Log</h1>
          <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>Xem lịch sử thao tác của toàn bộ nhân sự vận hành</p>
        </div>
        <button
          type="button"
          onClick={exportLogs}
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]"
          style={{ borderColor: '#e2e8f3', color: '#5a6b85' }}
        >
          Export Logs
        </button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Actions (Today)', value: stats?.actionsToday ?? '—', color: '#2a7bd9' },
          { label: 'Người thao tác hôm nay', value: stats?.activeActorsToday ?? '—', color: '#16a34a' },
          { label: 'Config Changes', value: stats?.configChangesWeek ?? '—', color: '#7c3aed' },
          { label: 'Suspensions (7 days)', value: stats?.suspensionsWeek ?? '—', color: '#dc2626' },
        ].map((stat) => (
          <Reveal key={stat.label}>
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: '#e2e8f3' }}>
              <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="mt-1 text-xs" style={{ color: '#5a6b85' }}>{stat.label}</div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4" style={{ borderColor: '#e2e8f3' }}>
        <div className="relative min-w-[240px] flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#8694ad' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search user, action, or target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border bg-[#f8fafc] py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2"
            style={{ borderColor: '#e2e8f3' }}
          />
        </div>
        <select
          value={module}
          onChange={(e) => setModule(e.target.value as AuditModule | 'ALL')}
          className="rounded-xl border bg-white px-4 py-2.5 text-sm outline-none"
          style={{ borderColor: '#e2e8f3' }}
        >
          {MODULES.map((m) => (
            <option key={m} value={m}>{m === 'ALL' ? 'All Modules' : m}</option>
          ))}
        </select>
        <select
          value={date}
          onChange={(e) => setDate(e.target.value as AuditDateKey)}
          className="rounded-xl border bg-white px-4 py-2.5 text-sm outline-none"
          style={{ borderColor: '#e2e8f3' }}
        >
          <option value="today">Hôm nay</option>
          <option value="yesterday">Hôm qua</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>

      <Reveal>
        {query.isLoading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
        ) : logs.length === 0 ? (
          <EmptyState icon={History} title="Không có nhật ký" description="Thử đổi khoảng thời gian hoặc module." />
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const mod = moduleColors[log.module] || { bg: '#f1f5fa', text: '#5a6b85', icon: '📋' };
              const open = openId === log.id;
              return (
                <div key={log.id} className="relative border-l-2 pl-6" style={{ borderColor: 'rgba(146,238,232,0.5)' }}>
                  <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-[#92eee8]">
                    <span className="h-2 w-2 rounded-full" style={{ background: mod.text }} />
                  </span>
                  <div className="rounded-2xl border bg-white p-5 transition-all hover:shadow-lg" style={{ borderColor: '#e2e8f3' }}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: mod.bg }}>
                          <span style={{ color: mod.text }}>{mod.icon}</span>
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold" style={{ color: '#0f1729' }}>{log.actor?.name ?? 'Hệ thống'}</span>
                            {log.actorRole && <span className="text-xs" style={{ color: '#8694ad' }}>({log.actorRole})</span>}
                            <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: mod.bg, color: mod.text }}>
                              {log.module}
                            </span>
                          </div>
                          <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>
                            <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${toneOf(log.action)}`}>
                              {log.action.replace(/_/g, ' ')}
                            </span>
                            {' → '}
                            <span className="font-medium" style={{ color: '#0f1729' }}>
                              {log.entityType} · {log.entityId ?? ''}
                            </span>
                          </p>
                          <button
                            type="button"
                            onClick={() => setOpenId(open ? null : log.id)}
                            className="mt-2 text-xs font-semibold text-[#2a7bd9] hover:underline"
                          >
                            {open ? 'Ẩn chi tiết' : 'Chi tiết'}
                          </button>
                          {open && (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <div>
                                <div className="mb-1 text-xs font-semibold text-slate-500">Trước</div>
                                <pre className="overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(log.before, null, 2)}</pre>
                              </div>
                              <div>
                                <div className="mb-1 text-xs font-semibold text-slate-500">Sau</div>
                                <pre className="overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(log.after, null, 2)}</pre>
                              </div>
                              {log.ipAddress && (
                                <div className="sm:col-span-2 text-xs text-slate-500">IP: {log.ipAddress}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs" style={{ color: '#8694ad' }}>
                        {formatDateTime(log.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Reveal>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>Hiển thị {logs.length} / {query.data?.total ?? 0}</span>
        <Pagination page={page} totalPages={query.data?.totalPages ?? 1} onChange={setPage} />
      </div>
      {toast.node}
    </div>
  );
}
