"use client";

import { Reveal, LiveDot } from "@/components/profile/wow";

const monthlyData = [
  { month: "Jan", revenue: 220, bookings: 145, users: 890 },
  { month: "Feb", revenue: 280, bookings: 178, users: 920 },
  { month: "Mar", revenue: 310, bookings: 195, users: 980 },
  { month: "Apr", revenue: 295, bookings: 188, users: 940 },
  { month: "May", revenue: 340, bookings: 210, users: 1050 },
  { month: "Jun", revenue: 380, bookings: 235, users: 1120 },
  { month: "Jul", revenue: 420, bookings: 268, users: 1280 },
  { month: "Aug", revenue: 395, bookings: 245, users: 1190 },
  { month: "Sep", revenue: 450, bookings: 280, users: 1340 },
];

const maxRevenue = Math.max(...monthlyData.map(d => d.revenue));

export default function AnalyticsPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN-06</span>
            <LiveDot label="LIVE" tone="blue" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#0f1729" }}>Platform Analytics</h1>
          <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Số liệu tổng quan: doanh thu, hoa hồng, người dùng, tỷ lệ huỷ đơn</p>
        </div>
        <div className="flex gap-2">
          <select className="rounded-xl border bg-white px-4 py-2 text-sm outline-none" style={{ borderColor: "#e2e8f3" }}>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>This month</option>
            <option>This year</option>
          </select>
          <button className="inline-flex items-center gap-2 rounded-full bg-[#2a7bd9] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1e5aa8]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Revenue (YTD)", value: "₫3.45B", change: "+28.4%", icon: "💰", color: "#16a34a" },
          { label: "Platform Commission", value: "₫345M", change: "+28.4%", icon: "📈", color: "#2a7bd9" },
          { label: "Active Users", value: "1,847", change: "+15.2%", icon: "👥", color: "#7c3aed" },
          { label: "Cancellation Rate", value: "3.2%", change: "-0.8%", icon: "📉", color: "#dc2626" },
        ].map((kpi) => (
          <Reveal key={kpi.label}>
            <div className="rounded-2xl border bg-white p-5" style={{ borderColor: "#e2e8f3" }}>
              <div className="flex items-center justify-between">
                <div className="text-3xl">{kpi.icon}</div>
                <div className={`rounded-full px-2 py-1 text-xs font-bold ${kpi.change.startsWith("+") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {kpi.change}
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold tabular-nums" style={{ color: "#0f1729" }}>{kpi.value}</div>
              <div className="mt-1 text-xs" style={{ color: "#5a6b85" }}>{kpi.label}</div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-6 lg:col-span-2" style={{ borderColor: "#e2e8f3" }}>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold" style={{ color: "#0f1729" }}>Revenue Trend</h3>
              <p className="text-xs" style={{ color: "#5a6b85" }}>Monthly revenue in millions VND</p>
            </div>
          </div>
          <div className="flex items-end gap-3" style={{ height: "200px" }}>
            {monthlyData.map((d, i) => (
              <div key={d.month} className="group relative flex flex-1 flex-col items-center">
                <div className="w-full rounded-t-lg transition-all hover:opacity-80" style={{ height: `${(d.revenue / maxRevenue) * 100}%`, background: i === monthlyData.length - 1 ? "linear-gradient(to top, #2a7bd9, #92eee8)" : "linear-gradient(to top, #93c5fd, #bfdbfe)" }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-lg bg-[#0f1729] px-2 py-1 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                    ₫{d.revenue}M
                  </div>
                </div>
                <div className="mt-2 text-[10px] font-medium" style={{ color: "#5a6b85" }}>{d.month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Metrics */}
        <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#e2e8f3" }}>
          <h3 className="mb-4 text-lg font-bold" style={{ color: "#0f1729" }}>Top Metrics</h3>
          <div className="space-y-4">
            {[
              { label: "Avg. Booking Value", value: "₫1.2M", change: "+5.2%" },
              { label: "Total Bookings", value: "1,944", change: "+18.3%" },
              { label: "Avg. Review Rating", value: "4.7★", change: "+0.1" },
              { label: "Provider Count", value: "342", change: "+24" },
              { label: "Listing Count", value: "2,156", change: "+128" },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between border-b pb-3 last:border-0" style={{ borderColor: "#f1f5fa" }}>
                <span className="text-sm" style={{ color: "#5a6b85" }}>{m.label}</span>
                <div className="text-right">
                  <div className="font-bold" style={{ color: "#0f1729" }}>{m.value}</div>
                  <div className="text-xs" style={{ color: "#16a34a" }}>{m.change}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal>
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#e2e8f3" }}>
            <h3 className="mb-4 text-lg font-bold" style={{ color: "#0f1729" }}>Revenue by Category</h3>
            <div className="space-y-4">
              {[
                { category: "STAY", revenue: 1250, percent: 36, color: "#2a7bd9" },
                { category: "VEHICLE", revenue: 890, percent: 26, color: "#16a34a" },
                { category: "EXPERIENCE", revenue: 680, percent: 20, color: "#7c3aed" },
                { category: "CAMPING", revenue: 420, percent: 12, color: "#f59e0b" },
                { category: "OTHER", revenue: 210, percent: 6, color: "#6b7280" },
              ].map((cat) => (
                <div key={cat.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium" style={{ color: "#0f1729" }}>{cat.category}</span>
                    <span className="font-bold tabular-nums" style={{ color: cat.color }}>₫{cat.revenue}M</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#f1f5fa]">
                    <div className="h-full rounded-full transition-all" style={{ width: `${cat.percent}%`, background: cat.color }} />
                  </div>
                  <div className="mt-0.5 text-xs" style={{ color: "#8694ad" }}>{cat.percent}% of total</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#e2e8f3" }}>
            <h3 className="mb-4 text-lg font-bold" style={{ color: "#0f1729" }}>User Growth</h3>
            <div className="space-y-4">
              {[
                { type: "New Travelers", value: 428, change: "+12%" },
                { type: "New Providers", value: 34, change: "+8%" },
                { type: "Repeat Bookers", value: 892, change: "+22%" },
                { type: "Churned Users", value: 23, change: "-15%" },
              ].map((u) => (
                <div key={u.type} className="flex items-center justify-between rounded-xl border p-4" style={{ borderColor: "#f1f5fa" }}>
                  <span className="text-sm font-medium" style={{ color: "#5a6b85" }}>{u.type}</span>
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: "#0f1729" }}>{u.value}</div>
                    <div className="text-xs font-semibold" style={{ color: u.change.startsWith("+") ? "#16a34a" : "#dc2626" }}>{u.change} vs last month</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
