"use client";

import { useState } from "react";
import { Reveal, LiveDot } from "@/components/profile/wow";

const mockStaff = [
  { id: "EMP-AD-0042", name: "Trần Quốc Bảo", email: "bao.admin@flextrip.vn", role: "ADMIN", department: "TRUST_SAFETY", level: "L2", status: "ACTIVE", assignments: 14, resolved: 9, lastActive: "2024-09-15 10:42" },
  { id: "EMP-AD-0015", name: "Lê Thị Hà My", email: "my.leh@flextrip.vn", role: "ADMIN", department: "FINANCE", level: "L2", status: "ACTIVE", assignments: 8, resolved: 12, lastActive: "2024-09-15 09:30" },
  { id: "EMP-SUPPORT-0033", name: "Nguyễn Văn Toàn", email: "toan.nv@flextrip.vn", role: "SUPPORT", department: "SUPPORT", level: "L1", status: "ACTIVE", assignments: 28, resolved: 45, lastActive: "2024-09-15 10:15" },
  { id: "EMP-FIN-0008", name: "Phạm Đức Minh", email: "minh.pd@flextrip.vn", role: "FINANCE", department: "FINANCE", level: "L3", status: "ACTIVE", assignments: 5, resolved: 3, lastActive: "2024-09-15 08:00" },
  { id: "EMP-SUPPORT-0012", name: "Vũ Thị Lan Anh", email: "anh.vt@flextrip.vn", role: "SUPPORT", department: "SUPPORT", level: "L1", status: "AWAY", assignments: 15, resolved: 32, lastActive: "2024-09-14 18:30" },
  { id: "EMP-OPS-0005", name: "Hoàng Đình Phong", email: "phong.hd@flextrip.vn", role: "OPS", department: "OPERATIONS", level: "L2", status: "ACTIVE", assignments: 22, resolved: 18, lastActive: "2024-09-15 07:45" },
];

const roleColors: Record<string, { bg: string; text: string }> = {
  ADMIN: { bg: "rgba(15,23,41,0.1)", text: "#0f1729" },
  SUPPORT: { bg: "rgba(42,123,217,0.1)", text: "#2a7bd9" },
  FINANCE: { bg: "rgba(146,238,232,0.3)", text: "#1e5aa8" },
  OPS: { bg: "rgba(124,58,237,0.1)", text: "#7c3aed" },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "rgba(34,197,94,0.1)", text: "#16a34a" },
  AWAY: { bg: "rgba(234,179,8,0.1)", text: "#ca8a04" },
  OFFLINE: { bg: "rgba(107,114,128,0.1)", text: "#6b7280" },
};

const departments = ["ALL", "TRUST_SAFETY", "FINANCE", "SUPPORT", "OPERATIONS"];

export default function StaffManagementPage() {
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterRole, setFilterRole] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<typeof mockStaff[0] | null>(null);

  const filtered = mockStaff.filter((s) => {
    const matchDept = filterDept === "ALL" || s.department === filterDept;
    const matchRole = filterRole === "ALL" || s.role === filterRole;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchRole && matchSearch;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN-10</span>
            <LiveDot label="MANAGING" tone="blue" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#0f1729" }}>Staff Management</h1>
          <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Tạo/quản lý tài khoản nhân viên, thiết lập rule chỉ định theo khu vực</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]" style={{ borderColor: "#e2e8f3", color: "#5a6b85" }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            Export Staff
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#15803d]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Add Staff
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Staff", value: mockStaff.length, color: "#2a7bd9" },
          { label: "Active Now", value: mockStaff.filter(s => s.status === "ACTIVE").length, color: "#16a34a" },
          { label: "Total Assignments", value: 92, color: "#7c3aed" },
          { label: "Resolved Today", value: 119, color: "#ca8a04" },
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
          <input type="text" placeholder="Search staff name, email, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border bg-[#f8fafc] py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2" style={{ borderColor: "#e2e8f3" }} />
        </div>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="rounded-xl border bg-white px-4 py-2.5 text-sm outline-none" style={{ borderColor: "#e2e8f3" }}>
          {departments.map((d) => (
            <option key={d} value={d}>{d === "ALL" ? "All Departments" : d.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="rounded-xl border bg-white px-4 py-2.5 text-sm outline-none" style={{ borderColor: "#e2e8f3" }}>
          <option value="ALL">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPPORT">Support</option>
          <option value="FINANCE">Finance</option>
          <option value="OPS">Operations</option>
        </select>
      </div>

      {/* Staff Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((staff, i) => (
          <Reveal key={staff.id} delay={i * 60}>
            <div
              onClick={() => setSelectedStaff(staff)}
              className={`group cursor-pointer rounded-2xl border bg-white p-5 transition-all hover:shadow-xl hover:-translate-y-1 ${selectedStaff?.id === staff.id ? "ring-2 ring-[#2a7bd9]" : ""}`}
              style={{ borderColor: selectedStaff?.id === staff.id ? "#2a7bd9" : "#e2e8f3" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-lg font-bold text-white">
                      {staff.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white" style={{ background: statusColors[staff.status].text }}>
                      {staff.status === "ACTIVE" && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                    </span>
                  </div>
                  <div>
                    <div className="font-bold" style={{ color: "#0f1729" }}>{staff.name}</div>
                    <div className="text-xs" style={{ color: "#5a6b85" }}>{staff.email}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ ...roleColors[staff.role], background: roleColors[staff.role].bg }}>
                        {staff.role}
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ ...statusColors[staff.status], background: statusColors[staff.status].bg, color: statusColors[staff.status].text }}>
                        {staff.status}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-medium" style={{ color: "#8694ad" }}>{staff.id}</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4" style={{ borderColor: "#f1f5fa" }}>
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: "#0f1729" }}>{staff.assignments}</div>
                  <div className="text-[10px]" style={{ color: "#8694ad" }}>Assignments</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color: "#16a34a" }}>{staff.resolved}</div>
                  <div className="text-[10px]" style={{ color: "#8694ad" }}>Resolved</div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "#f1f5fa" }}>
                <div>
                  <div className="text-[10px]" style={{ color: "#8694ad" }}>Department</div>
                  <div className="text-sm font-medium" style={{ color: "#0f1729" }}>{staff.department.replace(/_/g, " ")}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px]" style={{ color: "#8694ad" }}>Last Active</div>
                  <div className="text-sm font-medium" style={{ color: "#0f1729" }}>{staff.lastActive.split(" ")[1]}</div>
                </div>
              </div>

              <div className="mt-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button className="flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors hover:bg-[#f1f5fa]" style={{ borderColor: "#e2e8f3", color: "#5a6b85" }}>Edit</button>
                <button className="flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors hover:bg-[#f1f5fa]" style={{ borderColor: "#e2e8f3", color: "#5a6b85" }}>Assign</button>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Assignment Rules Section */}
      <Reveal>
        <div className="mt-8 rounded-2xl border bg-white p-6" style={{ borderColor: "#e2e8f3" }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold" style={{ color: "#0f1729" }}>Assignment Rules</h3>
              <p className="text-sm" style={{ color: "#5a6b85" }}>Configure auto-assignment rules for disputes and support tickets</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-full bg-[#2a7bd9] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1e5aa8]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Add Rule
            </button>
          </div>
          <div className="space-y-3">
            {[
              { id: "RULE-001", name: "Ho Chi Minh City Disputes", condition: "Location = HCMC + Type = REFUND", assignee: "Trần Quốc Bảo", priority: "HIGH" },
              { id: "RULE-002", name: "Finance Escalations", condition: "Type = PAYMENT_DISPUTE + Amount > 1M", assignee: "Phạm Đức Minh", priority: "CRITICAL" },
              { id: "RULE-003", name: "Support L1 Queue", condition: "All incoming tickets", assignee: "Nguyễn Văn Toàn", priority: "NORMAL" },
            ].map((rule) => (
              <div key={rule.id} className="flex items-center justify-between rounded-xl border p-4" style={{ borderColor: "#f1f5fa" }}>
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: rule.priority === "CRITICAL" ? "rgba(239,68,68,0.1)" : rule.priority === "HIGH" ? "rgba(234,88,12,0.1)" : "rgba(42,123,217,0.1)" }}>
                    <svg className="h-5 w-5" style={{ color: rule.priority === "CRITICAL" ? "#dc2626" : rule.priority === "HIGH" ? "#ea580c" : "#2a7bd9" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: "#0f1729" }}>{rule.name}</div>
                    <div className="text-xs" style={{ color: "#5a6b85" }}>{rule.condition}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[#f1f5fa] px-3 py-1 text-xs font-medium" style={{ color: "#5a6b85" }}>{rule.assignee.split(" ").slice(-1)[0]}</span>
                  <button className="rounded-lg border p-2 transition-all hover:bg-[#eff6ff]" style={{ borderColor: "#bfdbfe", color: "#2563eb" }}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
