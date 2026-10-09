import { api, toQuery } from '@/lib/api/client';
import type * as T from '@/types/admin';

type Q = Record<string, string | number | boolean | null | undefined>;
const today = () => new Date().toISOString().slice(0, 10);

export const adminApi = {
  dashboard: () => api.get('/admin/dashboard') as Promise<T.AdminDashboard>,

  users: {
    list: (q: Q) => api.get(`/admin/users${toQuery(q)}`) as Promise<T.Paginated<T.AdminUser>>,
    stats: () => api.get('/admin/users/stats') as Promise<T.AdminUserStats>,
    suspend: (id: string, reason: string) => api.patch(`/admin/users/${id}/suspend`, { reason }),
    unsuspend: (id: string, note?: string) => api.patch(`/admin/users/${id}/unsuspend`, note ? { note } : {}),
  },

  listings: {
    list: (q: Q) => api.get(`/admin/listings${toQuery(q)}`) as Promise<T.Paginated<T.AdminListing>>,
    stats: () => api.get('/admin/listings/stats') as Promise<T.ListingModerationStats>,
    flags: (id: string) => api.get(`/admin/listings/${id}/flags`) as Promise<T.ListingFlag[]>,
    moderate: (id: string, action: T.ModerateAction, note?: string) =>
      api.patch(`/admin/listings/${id}/moderate`, note ? { action, note } : { action }) as Promise<{ id: string; status: string; flagsUpdated: number }>,
  },

  reviews: {
    list: (q: Q) => api.get(`/admin/reviews${toQuery(q)}`) as Promise<T.Paginated<T.AdminReview>>,
    moderate: (id: string, decision: 'APPROVE' | 'REJECT', note?: string) =>
      api.patch(`/admin/reviews/${id}/moderate`, note ? { decision, note } : { decision }) as Promise<T.AdminReview>,
    reanalyze: (id: string) => api.post(`/admin/reviews/${id}/reanalyze`, {}) as Promise<{ id: string; status: 'PENDING'; queued: boolean }>,
  },

  disputes: {
    list: (q: Q) => api.get(`/admin/disputes${toQuery(q)}`) as Promise<T.Paginated<T.AdminDispute>>,
    stats: () => api.get('/admin/disputes/stats') as Promise<T.DisputeStats>,
    detail: (id: string) => api.get(`/admin/disputes/${id}`) as Promise<T.AdminDisputeDetail>,
    setStatus: (id: string, status: 'UNDER_REVIEW' | 'PENDING_INFO' | 'ESCALATED', note?: string) =>
      api.patch(`/admin/disputes/${id}/status`, note ? { status, note } : { status }),
    setPriority: (id: string, priority: T.DisputePriority) => api.patch(`/admin/disputes/${id}/priority`, { priority }),
    resolve: (id: string, body: { outcome: 'RESOLVED' | 'REJECTED'; resolution: string; refundAmount?: number }) =>
      api.post(`/admin/disputes/${id}/resolve`, body),
  },

  finance: {
    summary: (q: Q) => api.get(`/admin/finance/summary${toQuery(q)}`) as Promise<T.FinanceSummary>,
    transactions: (q: Q) => api.get(`/admin/finance/transactions${toQuery(q)}`) as Promise<T.Paginated<T.AdminTransaction>>,
    exportTransactions: (q: Q) => api.download(`/admin/finance/transactions/export${toQuery(q)}`, `giao-dich-${today()}.csv`),
    payouts: (q: Q) => api.get(`/admin/finance/payouts${toQuery(q)}`) as Promise<T.Paginated<T.AdminPayout>>,
    exportPayouts: (q: Q) => api.download(`/admin/finance/payouts/export${toQuery(q)}`, `payout-${today()}.csv`),
    generate: (periodStart: string, periodEnd: string) =>
      api.post('/admin/finance/payouts/generate', { periodStart, periodEnd }) as Promise<T.GeneratePayoutsResult>,
    updatePayout: (id: string, body: { status?: T.PayoutStatus; actualPaid?: number; transferRef?: string; note?: string }) =>
      api.patch(`/admin/finance/payouts/${id}`, body) as Promise<T.AdminPayout>,
  },

  analytics: {
    overview: (q: Q) => api.get(`/admin/analytics/overview${toQuery(q)}`) as Promise<T.AnalyticsOverview>,
    timeseries: (q: Q) => api.get(`/admin/analytics/timeseries${toQuery(q)}`) as Promise<T.TimeseriesPoint[]>,
  },

  config: {
    get: () => api.get('/admin/config') as Promise<T.ConfigGroup[]>,
    update: (values: Record<string, number>) => api.put('/admin/config', { values }) as Promise<T.ConfigGroup[]>,
    reset: (keys?: string[]) => api.post('/admin/config/reset', keys ? { keys } : {}) as Promise<T.ConfigGroup[]>,
  },

  audit: {
    list: (q: Q) => api.get(`/admin/audit-logs${toQuery(q)}`) as Promise<T.Paginated<T.AuditLogItem>>,
    stats: () => api.get('/admin/audit-logs/stats') as Promise<T.AuditStats>,
    export: (q: Q) => api.download(`/admin/audit-logs/export${toQuery(q)}`, `audit-log-${today()}.csv`),
  },

  staff: {
    list: (q: Q) => api.get(`/admin/staff${toQuery(q)}`) as Promise<T.Paginated<T.AdminStaff>>,
    stats: () => api.get('/admin/staff/stats') as Promise<T.StaffStats>,
    create: (body: { name: string; email: string; phone?: string; password: string; regions: string[] }) =>
      api.post('/admin/staff', body) as Promise<{ staff: T.AdminStaff }>,
    update: (id: string, body: Partial<{ name: string; phone: string; regions: string[]; isActive: boolean }>) =>
      api.patch(`/admin/staff/${id}`, body) as Promise<T.AdminStaff>,
    rules: () => api.get('/admin/staff-rules') as Promise<T.StaffRule[]>,
    createRule: (body: { name: string; region: string; staffId: string; priority: number; isActive?: boolean }) =>
      api.post('/admin/staff-rules', body) as Promise<T.StaffRule>,
    updateRule: (id: string, body: Partial<{ name: string; region: string; staffId: string; priority: number; isActive: boolean }>) =>
      api.patch(`/admin/staff-rules/${id}`, body) as Promise<T.StaffRule>,
    deleteRule: (id: string) => api.delete(`/admin/staff-rules/${id}`),
    bookings: (q: Q) => api.get(`/admin/bookings${toQuery(q)}`) as Promise<T.Paginated<T.AssignableBooking>>,
    assign: (bookingId: string, staffId: string) => api.patch(`/admin/bookings/${bookingId}/assign`, { staffId }) as Promise<T.AssignableBooking>,
    autoAssign: (bookingId: string) =>
      api.post(`/admin/bookings/${bookingId}/auto-assign`, {}) as Promise<{ booking: T.AssignableBooking; rule: { id: string; name: string } }>,
    unassign: (bookingId: string) => api.delete(`/admin/bookings/${bookingId}/assign`) as Promise<T.AssignableBooking>,
  },
};
