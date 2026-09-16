"use client";

import { useState } from "react";
import { Reveal, LiveDot } from "@/components/profile/wow";

const mockLogs = [
  { id: "LOG-001", timestamp: "2024-09-15 10:42:33", user: "Trần Quốc Bảo", userId: "EMP-AD-0042", action: "KYC_APPROVED", target: "KYC-2024-0892", detail: "Approved CCCD + selfie for Nguyễn Văn X", module: "KYC" },
  { id: "LOG-002", timestamp: "2024-09-15 09:15:22", user: "Trần Quốc Bảo", userId: "EMP-AD-0042", action: "TICKET_CLOSED", target: "SUP-1934", detail: "Closed refund ticket with 50% resolution", module: "SUPPORT" },
  { id: "LOG-003", timestamp: "2024-09-15 08:50:01", user: "Trần Quốc Bảo", userId: "EMP-AD-0042", action: "CONFIG_UPDATED", target: "BOOK-07", detail: "Updated cancel window: 5 → 7 days before check-in", module: "CONFIG" },
  { id: "LOG-004", timestamp: "2024-09-14 17:20:45", user: "Trần Quốc Bảo", userId: "EMP-AD-0042", action: "LISTING_SUSPENDED", target: "LST-882", detail: "Suspended listing for fake flag, notification sent", module: "MODERATION" },
  { id: "LOG-005", timestamp: "2024-09-14 14:05:11", user: "Trần Quốc Bảo", userId: "EMP-AD-0042", action: "TICKET_ASSIGNED", target: "12 tickets", detail: "Bulk assigned tickets to Support L1 shift", module: "SUPPORT" },
  { id: "LOG-006", timestamp: "2024-09-14 11:30:00", user: "Lê Thị Hà My", userId: "EMP-AD-0015", action: "USER_LOCKED", target: "USR-0892", detail: "Locked account for fraud investigation", module: "USER" },
  { id: "LOG-007", timestamp: "2024-09-14 10:15:33", user: "Nguyễn Văn Toàn", userId: "EMP-SUPPORT-0033", action: "TICKET_REPLIED", target: "SUP-1920", detail: "Replied to traveler inquiry", module: "SUPPORT" },
  { id: "LOG-008", timestamp: "2024-09-14 09:00:00", user: "Phạm Đức Minh", userId: "EMP-FIN-0008", action: "PAYOUT_APPROVED", target: "PAY-2024-0421", detail: "Approved provider payout batch #42", module: "FINANCE" },
];

const moduleColors: Record<string, { bg: string; text: string; icon: string }> = {
  KYC: { bg: "rgba(34,197,94,0.1)", text: "#16a34a", icon: "✓" },
  SUPPORT: { bg: "rgba(42,123,217,0.1)", text: "#2a7bd9", icon: "💬" },
  CONFIG: { bg: "rgba(124,58,237,0.1)", text: "#7c3aed", icon: "⚙️" },
  MODERATION: { bg: "rgba(239,68,68,0.1)", text: "#dc2626", icon: "🛡️" },
  USER: { bg: "rgba(234,179,8,0.1)", text: "#ca8a04", icon: "👤" },
  FINANCE: { bg: "rgba(146,238,232,0.3)", text: "#1e5aa8", icon: "💰" },
};

const actionColors: Record<string, string> = {
  APPROVED: "#16a34a",
  REJECTED: "#dc2626",
  UPDATED: "#7c3aed",
  SUSPENDED: "#ea580c",
  CLOSED: "#6b7280",
  ASSIGNED: "#2a7bd9",
  LOCKED: "#dc2626",
  REPLIED: "#2a7bd9",
};

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("ALL");
  const [filterDate, setFilterDate] = useState("today");

  const filtered = mockLogs.filter((log) => {
    const matchSearch = log.user.toLowerCase().includes(search.toLowerCase()) || log.detail.toLowerCase().includes(search.toLowerCase()) || log.target.toLowerCase().includes(search.toLowerCase());
    const matchModule = filterModule === "ALL" || log.module === filterModule;
    return matchSearch && matchModule;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN-09</span>
            <LiveDot label="TRACKING" tone="blue" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#0f1729" }}>Audit Log</h1>
          <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Xem lịch sử thao tác của toàn bộ nhân sự vận hành</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]" style={{ borderColor: "#e2e8f3", color: "#5a6b85" }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            Export Logs
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Actions (Today)", value: 234, color: "#2a7bd9" },
          { label: "Active Staff", value: 28, color: "#16a34a" },
          { label: "Config Changes", value: 3, color: "#7c3aed" },
          { label: "Flagged Actions", value: 0, color: "#dc2626" },
        ].map((stat) => (
          <Reveal key={stat.label}>
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: "#e2e8f3" }}>
              <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="mt-1 text-xs" style={{ color: "#5a6b85" }}>{stat.label}</div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4" style={{ borderColor: "#e2e8f3" }}>
        <div className="relative flex-1 min-w-[240px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#8694ad" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          <input type="text" placeholder="Search user, action, or target..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border bg-[#f8fafc] py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2" style={{ borderColor: "#e2e8f3" }} />
        </div>
        <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="rounded-xl border bg-white px-4 py-2.5 text-sm outline-none" style={{ borderColor: "#e2e8f3" }}>
          <option value="ALL">All Modules</option>
          <option value="KYC">KYC</option>
          <option value="SUPPORT">Support</option>
          <option value="CONFIG">Config</option>
          <option value="MODERATION">Moderation</option>
          <option value="USER">User</option>
          <option value="FINANCE">Finance</option>
        </select>
        <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="rounded-xl border bg-white px-4 py-2.5 text-sm outline-none" style={{ borderColor: "#e2e8f3" }}>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
        </select>
      </div>

      {/* Timeline Log */}
      <Reveal>
        <div className="space-y-3">
          {filtered.map((log, i) => {
            const mod = moduleColors[log.module] || { bg: "#f1f5fa", text: "#5a6b85", icon: "📋" };
            const actionVerb = log.action.split("_")[0];
            return (
              <div key={log.id} className="relative border-l-2 pl-6" style={{ borderColor: "rgba(146,238,232,0.5)" }}>
                <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2" style={{ ringColor: "#92eee8" }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: mod.text }} />
                </span>
                <div className="rounded-2xl border bg-white p-5 transition-all hover:shadow-lg" style={{ borderColor: "#e2e8f3" }}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: mod.bg }}>
                        <span style={{ color: mod.text }}>{mod.icon}</span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold" style={{ color: "#0f1729" }}>{log.user}</span>
                          <span className="text-xs" style={{ color: "#8694ad" }}>({log.userId})</span>
                          <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: mod.bg, color: mod.text }}>
                            {log.module}
                          </span>
                        </div>
                        <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>
                          <span style={{ color: actionColors[actionVerb] || "#5a6b85", fontWeight: 600 }}>{log.action.replace(/_/g, " ")}</span>
                          {" → "}
                          <span className="font-medium" style={{ color: "#0f1729" }}>{log.target}</span>
                        </p>
                        <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>{log.detail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs" style={{ color: "#8694ad" }}>{log.timestamp.split(" ")[1]}</div>
                      <div className="text-[10px]" style={{ color: "#aab4c4" }}>{log.timestamp.split(" ")[0]}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
}
