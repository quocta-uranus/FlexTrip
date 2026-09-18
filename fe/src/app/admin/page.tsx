"use client";

import Link from "next/link";
import { Reveal, LiveDot } from "@/components/profile/wow";

const quickActions = [
  { code: "ADMIN-01", title: "Manage Users", desc: "Lock/unlock accounts", icon: "👥", href: "/admin/01-user-accounts", color: "#2a7bd9" },
  { code: "ADMIN-02", title: "Provider Reg", desc: "Approve registrations", icon: "✅", href: "/admin/02-provider-registration", color: "#16a34a" },
  { code: "ADMIN-03", title: "Moderation", desc: "Review flagged content", icon: "🛡️", href: "/admin/03-moderate-listings", color: "#dc2626" },
  { code: "ADMIN-04", title: "Disputes", desc: "Handle refunds", icon: "💬", href: "/admin/04-disputes-refunds", color: "#ca8a04" },
  { code: "ADMIN-05", title: "Transactions", desc: "Reconcile payments", icon: "💰", href: "/admin/05-transactions", color: "#7c3aed" },
  { code: "ADMIN-06", title: "Analytics", desc: "View platform metrics", icon: "📊", href: "/admin/06-analytics", color: "#2a7bd9" },
  { code: "ADMIN-07", title: "AI Forecast", desc: "Revenue predictions", icon: "🤖", href: "/admin/07-ai-forecast", color: "#16a34a" },
  { code: "ADMIN-08", title: "AI Config", desc: "Adjust thresholds", icon: "⚙️", href: "/admin/08-ai-config", color: "#6b7280" },
  { code: "ADMIN-09", title: "Audit Log", desc: "View activity history", icon: "📜", href: "/admin/09-audit-log", color: "#f59e0b" },
  { code: "ADMIN-10", title: "Staff Mgmt", desc: "Manage team", icon: "👔", href: "/admin/10-staff-management", color: "#0f1729" },
];

const recentActivity = [
  { time: "2 min ago", action: "KYC Approved", user: "Nguyễn Văn X", module: "KYC", color: "#16a34a" },
  { time: "15 min ago", action: "Listing Flagged", user: "LST-882", module: "Moderation", color: "#dc2626" },
  { time: "1 hour ago", action: "Ticket Resolved", user: "SUP-1934", module: "Support", color: "#2a7bd9" },
  { time: "2 hours ago", action: "User Locked", user: "USR-0892", module: "User", color: "#ca8a04" },
  { time: "3 hours ago", action: "Config Updated", user: "BOOK-07", module: "Config", color: "#7c3aed" },
];

export default function AdminDashboardPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN</span>
          <LiveDot label="ON-DUTY" tone="red" />
        </div>
        <h1 className="text-3xl font-bold" style={{ color: "#0f1729" }}>Admin Dashboard</h1>
        <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Welcome back, Trần Quốc Bảo · Trust & Safety · L2</p>
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Open Tickets", value: 14, color: "#ca8a04", icon: "🎫" },
          { label: "Flagged Content", value: 6, color: "#dc2626", icon: "🚩" },
          { label: "Pending KYC", value: 12, color: "#7c3aed", icon: "⏳" },
          { label: "Resolved Today", value: 9, color: "#16a34a", icon: "✅" },
        ].map((stat) => (
          <Reveal key={stat.label}>
            <div className="rounded-2xl border bg-white p-5 transition-all hover:shadow-lg hover:-translate-y-0.5" style={{ borderColor: "#e2e8f3" }}>
              <div className="flex items-center justify-between">
                <span className="text-3xl">{stat.icon}</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: `${stat.color}15`, color: stat.color }}>
                  Needs attention
                </span>
              </div>
              <div className="mt-3 text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="mt-1 text-sm" style={{ color: "#5a6b85" }}>{stat.label}</div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Quick Actions Grid */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-bold" style={{ color: "#0f1729" }}>Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-5">
          {quickActions.map((action, i) => (
            <Reveal key={action.code} delay={i * 50}>
              <Link
                href={action.href}
                className="group flex flex-col items-center rounded-2xl border bg-white p-5 text-center transition-all hover:shadow-xl hover:-translate-y-1"
                style={{ borderColor: "#e2e8f3" }}
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110" style={{ background: `${action.color}15` }}>
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

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Reveal>
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#e2e8f3" }}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold" style={{ color: "#0f1729" }}>Recent Activity</h3>
                <Link href="/admin/09-audit-log" className="text-sm font-semibold" style={{ color: "#2a7bd9" }}>View All →</Link>
              </div>
              <div className="space-y-3">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-[#f8fafc]" style={{ borderColor: "#f1f5fa" }}>
                    <div className="h-2 w-2 rounded-full" style={{ background: activity.color }} />
                    <div className="flex-1">
                      <div className="font-semibold" style={{ color: "#0f1729" }}>{activity.action}</div>
                      <div className="text-xs" style={{ color: "#5a6b85" }}>{activity.user}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium" style={{ color: activity.color }}>{activity.module}</div>
                      <div className="text-[10px]" style={{ color: "#8694ad" }}>{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* Platform Health */}
        <div>
          <Reveal delay={100}>
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#e2e8f3" }}>
              <h3 className="mb-4 text-lg font-bold" style={{ color: "#0f1729" }}>Platform Health</h3>
              <div className="space-y-4">
                {[
                  { label: "System Status", value: "Operational", color: "#16a34a", icon: "🟢" },
                  { label: "DB Response", value: "24ms avg", color: "#2a7bd9", icon: "⚡" },
                  { label: "API Uptime", value: "99.98%", color: "#16a34a", icon: "📈" },
                  { label: "Active Users", value: "1,284", color: "#7c3aed", icon: "👥" },
                  { label: "Error Rate", value: "0.02%", color: "#16a34a", icon: "✅" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: "#f1f5fa" }}>
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span className="text-sm" style={{ color: "#5a6b85" }}>{item.label}</span>
                    </div>
                    <span className="font-semibold" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
