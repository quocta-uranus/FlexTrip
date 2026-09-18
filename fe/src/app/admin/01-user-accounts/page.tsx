"use client";

import { useState } from "react";
import { SectionTitle, Card, KpiCards } from "@/components/profile/ui";
import { Reveal, Counter, LiveDot } from "@/components/profile/wow";

const mockUsers = [
  { id: "USR-001", name: "Nguyễn Văn Minh", email: "minh.nv@gmail.com", role: "TRAVELER", status: "ACTIVE", kyc: true, bookings: 12, flag: 0, joined: "2024-03-15" },
  { id: "USR-002", name: "Trần Thị Lan", email: "lan.tt@outlook.com", role: "PROVIDER", status: "SUSPENDED", kyc: true, bookings: 34, flag: 2, joined: "2023-11-20" },
  { id: "USR-003", name: "Lê Hoàng Nam", email: "nam.lh@gmail.com", role: "TRAVELER", status: "ACTIVE", kyc: false, bookings: 3, flag: 0, joined: "2024-08-01" },
  { id: "USR-004", name: "Phạm Đức Anh", email: "anh.pd@yahoo.com", role: "PROVIDER", status: "ACTIVE", kyc: true, bookings: 89, flag: 0, joined: "2023-06-10" },
  { id: "USR-005", name: "Hoàng Minh Châu", email: "chau.hm@gmail.com", role: "TRAVELER", status: "DISABLED", kyc: true, bookings: 0, flag: 5, joined: "2024-01-05" },
  { id: "USR-006", name: "Vũ Thị Hương", email: "huong.vt@icloud.com", role: "PROVIDER", status: "ACTIVE", kyc: true, bookings: 56, flag: 1, joined: "2023-09-22" },
];

const statusColors: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "rgba(34,197,94,0.1)", text: "#16a34a" },
  SUSPENDED: { bg: "rgba(234,179,8,0.1)", text: "#ca8a04" },
  DISABLED: { bg: "rgba(239,68,68,0.1)", text: "#dc2626" },
};

const roleColors: Record<string, { bg: string; text: string }> = {
  TRAVELER: { bg: "rgba(42,123,217,0.1)", text: "#2a7bd9" },
  PROVIDER: { bg: "rgba(146,238,232,0.3)", text: "#1e5aa8" },
  ADMIN: { bg: "rgba(15,23,41,0.1)", text: "#0f1729" },
};

export default function UserAccountsPage() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState<typeof mockUsers[0] | null>(null);
  const [actionType, setActionType] = useState<"lock" | "unlock" | "disable" | null>(null);

  const filtered = mockUsers.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.id.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "ALL" || u.role === filterRole;
    const matchStatus = filterStatus === "ALL" || u.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  function handleAction(user: typeof mockUsers[0], action: typeof actionType) {
    setSelectedUser(user);
    setActionType(action);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN-01</span>
            <LiveDot label="ON-DUTY" tone="red" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#0f1729" }}>Manage User Accounts</h1>
          <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Khoá/mở khoá tài khoản Traveler · Provider vi phạm chính sách</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]" style={{ borderColor: "#e2e8f3", color: "#5a6b85" }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            Export CSV
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-[#0f1729] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-95">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Add User
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-8">
        <Reveal>
          <KpiCards items={[
            { label: "Total Users", value: "2,847", hint: "+128 this month", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> },
            { label: "Active", value: "2,691", hint: "94.5% of total", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: "Suspended", value: "89", hint: "Pending review", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg> },
            { label: "Flagged Accounts", value: "34", hint: "Need attention", icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg> },
          ]} />
        </Reveal>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4" style={{ borderColor: "#e2e8f3" }}>
        <div className="relative flex-1 min-w-[240px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#8694ad" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          <input type="text" placeholder="Search by name, email, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border bg-[#f8fafc] py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2" style={{ borderColor: "#e2e8f3", "--tw-ring-color": "#2a7bd9" } as any} />
        </div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="rounded-xl border bg-white px-4 py-2.5 text-sm outline-none" style={{ borderColor: "#e2e8f3" }}>
          <option value="ALL">All Roles</option>
          <option value="TRAVELER">Traveler</option>
          <option value="PROVIDER">Provider</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-xl border bg-white px-4 py-2.5 text-sm outline-none" style={{ borderColor: "#e2e8f3" }}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      {/* Table */}
      <Reveal delay={100}>
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "#e2e8f3" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>User</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>KYC</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Bookings</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Flags</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#e2e8f3" }}>
              {filtered.map((user, i) => (
                <tr key={user.id} className="bg-white transition-colors hover:bg-[#f8fafc]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">{user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                      <div>
                        <div className="font-semibold" style={{ color: "#0f1729" }}>{user.name}</div>
                        <div className="text-xs" style={{ color: "#5a6b85" }}>{user.email}</div>
                        <div className="text-[10px]" style={{ color: "#8694ad" }}>ID: {user.id} · Joined {user.joined}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold" style={{ ...roleColors[user.role], background: roleColors[user.role].bg }}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ ...statusColors[user.status], background: statusColors[user.status].bg }}>
                      {user.status === "ACTIVE" && <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: statusColors[user.status].text }} />}
                      {user.status === "SUSPENDED" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColors[user.status].text }} />}
                      {user.status === "DISABLED" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColors[user.status].text }} />}
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.kyc ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#16a34a" }}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#ca8a04" }}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold tabular-nums" style={{ color: "#0f1729" }}>{user.bookings}</td>
                  <td className="px-6 py-4 text-center">
                    {user.flag > 0 ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#dc2626" }}>{user.flag}</span>
                    ) : (
                      <span className="text-xs" style={{ color: "#8694ad" }}>—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleAction(user, "lock")} className="rounded-lg border p-2 transition-all hover:bg-[#fef2f2]" style={{ borderColor: "#fecaca", color: "#dc2626" }} title="Lock Account">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                      </button>
                      <button className="rounded-lg border p-2 transition-all hover:bg-[#f0fdf4]" style={{ borderColor: "#bbf7d0", color: "#16a34a" }} title="View Details">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </button>
                      <button className="rounded-lg border p-2 transition-all hover:bg-[#eff6ff]" style={{ borderColor: "#bfdbfe", color: "#2563eb" }} title="Send Message">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm" style={{ color: "#5a6b85" }}>Showing <span className="font-semibold" style={{ color: "#0f1729" }}>{filtered.length}</span> of <span className="font-semibold" style={{ color: "#0f1729" }}>{mockUsers.length}</span> users</p>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[#f1f5fa]" style={{ borderColor: "#e2e8f3" }}>← Previous</button>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((p) => (
              <button key={p} className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${p === 1 ? "bg-[#2a7bd9] text-white" : "border hover:bg-[#f1f5fa]" }`} style={{ borderColor: p === 1 ? "#2a7bd9" : "#e2e8f3" }}>{p}</button>
            ))}
          </div>
          <button className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[#f1f5fa]" style={{ borderColor: "#e2e8f3" }}>Next →</button>
        </div>
      </div>
    </div>
  );
}
