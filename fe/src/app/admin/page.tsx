"use client";

import Link from "next/link";
import { Reveal, LiveDot } from "@/components/profile/wow";
import { useAdminDashboard } from "@/hooks/admin/use-admin-dashboard";
import { useAuthStore } from "@/store/auth.store";
import { formatDateTime } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

const quickActions = [
  { code: "ADMIN-01", title: "Manage Users", desc: "Lock/unlock accounts", icon: "👥", href: "/admin/01-user-accounts", color: "#2a7bd9" },
  { code: "ADMIN-03", title: "Moderation", desc: "Review flagged content", icon: "🛡️", href: "/admin/03-moderate-listings", color: "#dc2626" },
  { code: "ADMIN-04", title: "Disputes", desc: "Handle refunds", icon: "💬", href: "/admin/04-disputes-refunds", color: "#ca8a04" },
  { code: "ADMIN-05", title: "Transactions", desc: "Reconcile payments", icon: "💰", href: "/admin/05-transactions", color: "#7c3aed" },
  { code: "ADMIN-06", title: "Analytics", desc: "View platform metrics", icon: "📊", href: "/admin/06-analytics", color: "#2a7bd9" },
  { code: "ADMIN-08", title: "AI Config", desc: "Adjust thresholds", icon: "⚙️", href: "/admin/08-ai-config", color: "#6b7280" },
  { code: "ADMIN-09", title: "Audit Log", desc: "View activity history", icon: "📜", href: "/admin/09-audit-log", color: "#f59e0b" },
  { code: "ADMIN-10", title: "Staff Mgmt", desc: "Manage team", icon: "👔", href: "/admin/10-staff-management", color: "#0f1729" },
];

const MODULE_COLORS: Record<string, string> = {
  USER: "#ca8a04",
  MODERATION: "#dc2626",
  DISPUTE: "#7c3aed",
  FINANCE: "#2a7bd9",
  CONFIG: "#7c3aed",
  STAFF: "#0f1729",
  KYC: "#16a34a",
  PROVIDER: "#16a34a",
};

export default function AdminDashboardPage() {
  const me = useAuthStore((s) => s.user);
  const { data, isLoading } = useAdminDashboard();

  const stats = [
    { label: "Open Disputes", value: data?.openDisputes ?? 0, color: "#ca8a04", icon: "🎫" },
    { label: "Flagged Content", value: data?.openFlags ?? 0, color: "#dc2626", icon: "🚩" },
    { label: "Pending KYC", value: data?.pendingKyc ?? 0, color: "#7c3aed", icon: "⏳" },
    { label: "Resolved Today", value: data?.resolvedToday ?? 0, color: "#16a34a", icon: "✅" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN</span>
          <LiveDot label="ON-DUTY" tone="red" />
        </div>
        <h1 className="text-3xl font-bold" style={{ color: "#0f1729" }}>Admin Dashboard</h1>
        <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Xin chào, {me?.name ?? ""}</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Reveal key={stat.label}>
            <div className="rounded-2xl border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg" style={{ borderColor: "#e2e8f3" }}>
              <div className="flex items-center justify-between">
                <span className="text-3xl">{stat.icon}</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: `${stat.color}15`, color: stat.color }}>
                  Needs attention
                </span>
              </div>
              <div className="mt-3 text-3xl font-bold" style={{ color: stat.color }}>
                {isLoading ? <Skeleton className="h-9 w-12" /> : stat.value}
              </div>
              <div className="mt-1 text-sm" style={{ color: "#5a6b85" }}>{stat.label}</div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-lg font-bold" style={{ color: "#0f1729" }}>Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {quickActions.map((action, i) => (
            <Reveal key={action.code} delay={i * 50}>
              <Link
                href={action.href}
                className="group flex flex-col items-center rounded-2xl border bg-white p-5 text-center transition-all hover:-translate-y-1 hover:shadow-xl"
                style={{ borderColor: "#e2e8f3" }}
              >
                <div
                  className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                  style={{ background: `${action.color}15` }}
                >
                  <span className="text-3xl">{action.icon}</span>
                </div>
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: action.color }}>{action.code}</div>
                <div className="mt-1 font-semibold" style={{ color: "#0f1729" }}>{action.title}</div>
                <div className="mt-0.5 text-xs" style={{ color: "#5a6b85" }}>{action.desc}</div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <Reveal>
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#e2e8f3" }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold" style={{ color: "#0f1729" }}>Recent Activity</h3>
              <Link href="/admin/09-audit-log" className="text-sm font-semibold" style={{ color: "#2a7bd9" }}>
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              {!isLoading && (data?.recentActivity?.length ?? 0) === 0 && (
                <p className="text-sm" style={{ color: "#5a6b85" }}>Chưa có hoạt động gần đây.</p>
              )}
              {(data?.recentActivity ?? []).map((activity) => {
                const color = MODULE_COLORS[activity.module] ?? "#2a7bd9";
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-[#f8fafc]"
                    style={{ borderColor: "#f1f5fa" }}
                  >
                    <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                    <div className="flex-1">
                      <div className="font-semibold" style={{ color: "#0f1729" }}>{activity.action}</div>
                      <div className="text-xs" style={{ color: "#5a6b85" }}>{activity.actor?.name ?? "Hệ thống"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium" style={{ color }}>{activity.module}</div>
                      <div className="text-[10px]" style={{ color: "#8694ad" }}>{formatDateTime(activity.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
