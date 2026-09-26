"use client";

import { useState } from"react";
import { Card, SectionTitle, BadgeRow } from"@/components/profile/ui";

/**
 * ADMIN-01 — Manage User Accounts (Lock/Unlock)
 * Quản lý tài khoản Traveler/Provider; khoá tài khoản vi phạm.
 */

type UserStatus ="ACTIVE" |"SUSPENDED" |"DISABLED";
type UserRole ="TRAVELER" |"PROVIDER";

interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  kycStatus:"VERIFIED" |"PENDING" |"REJECTED";
  createdAt: string;
  violations: number;
  reason?: string;
}

const mockUsers: UserAccount[] = [
  { id:"USR-001", name:"Nguyễn Văn An", email:"an.nv@gmail.com", phone:"+84 909 123 456", role:"TRAVELER", status:"ACTIVE", kycStatus:"VERIFIED", createdAt:"2025-01-15", violations: 0 },
  { id:"USR-002", name:"Trần Thị Bình", email:"binh.tt@provider.vn", phone:"+84 912 234 567", role:"PROVIDER", status:"SUSPENDED", kycStatus:"VERIFIED", createdAt:"2024-08-20", violations: 2, reason:"Gian lận thanh toán" },
  { id:"USR-003", name:"Lê Hoàng Cường", email:"cuong.lh@gmail.com", phone:"+84 923 345 678", role:"TRAVELER", status:"ACTIVE", kycStatus:"PENDING", createdAt:"2025-09-10", violations: 0 },
  { id:"USR-004", name:"Phạm Minh Đức", email:"duc.pm@shop.vn", phone:"+84 934 456 789", role:"PROVIDER", status:"ACTIVE", kycStatus:"VERIFIED", createdAt:"2024-03-05", violations: 1, reason:"Tranh chấp lặp lại" },
  { id:"USR-005", name:"Hoàng Thị Em", email:"em.hoang@yahoo.com", phone:"+84 945 567 890", role:"TRAVELER", status:"DISABLED", kycStatus:"REJECTED", createdAt:"2025-06-22", violations: 3, reason:"Giấy tờ giả mạo" },
  { id:"USR-006", name:"Vũ Quang Hùng", email:"hung.vq@rent.vn", phone:"+84 956 678 901", role:"PROVIDER", status:"ACTIVE", kycStatus:"VERIFIED", createdAt:"2024-11-30", violations: 0 },
];

const statusConfig = {
  ACTIVE: { label:"Hoạt động", color:"#10b981", bg:"rgba(16,185,129,0.1)" },
  SUSPENDED: { label:"Tạm khoá", color:"#f59e0b", bg:"rgba(245,158,11,0.1)" },
  DISABLED: { label:"Vô hiệu", color:"#ef4444", bg:"rgba(239,68,68,0.1)" },
};

const roleConfig = {
  TRAVELER: { label:"Traveler", color:"#2a7bd9", bg:"rgba(42,123,217,0.1)" },
  PROVIDER: { label:"Provider", color:"#0f1729", bg:"rgba(15,23,41,0.1)" },
};

export default function AdminUserManagementPage() {
  const [users, setUsers] = useState(mockUsers);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"ALL" | UserRole>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | UserStatus>("ALL");
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockReason, setLockReason] = useState("");

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.id.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole ==="ALL" || u.role === filterRole;
    const matchStatus = filterStatus ==="ALL" || u.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status ==="ACTIVE").length,
    suspended: users.filter((u) => u.status ==="SUSPENDED").length,
    disabled: users.filter((u) => u.status ==="DISABLED").length,
  };

  function handleToggleStatus(user: UserAccount) {
    setSelectedUser(user);
    if (user.status ==="ACTIVE") {
      setShowLockModal(true);
    } else {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status:"ACTIVE", reason: undefined } : u)));
    }
  }

  function confirmLock() {
    if (selectedUser) {
      setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? { ...u, status:"SUSPENDED", reason: lockReason } : u)));
      setShowLockModal(false);
      setSelectedUser(null);
      setLockReason("");
    }
  }

  return (
    <div className="pb-20">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <SectionTitle eyebrow="ADMIN-01" title="Quản lý tài khoản" desc="Lock/unlock tài khoản Traveler & Provider vi phạm" />

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label:"Tổng tài khoản", value: stats.total, icon:"👥", color:"#2a7bd9" },
            { label:"Hoạt động", value: stats.active, icon:"✅", color:"#10b981" },
            { label:"Tạm khoá", value: stats.suspended, icon:"⏸", color:"#f59e0b" },
            { label:"Vô hiệu", value: stats.disabled, icon:"🚫", color:"#ef4444" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-white p-4 dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor:"#e2e8f3" }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{s.icon}</span>
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              </div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Tìm theo tên, email, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 dark:bg-[#121A2C] dark:text-white dark:border-white/10"
            style={{ borderColor:"#e2e8f3", minWidth: 200 }}
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as"ALL" | UserRole)}
            className="rounded-lg border bg-white px-4 py-2.5 text-sm dark:bg-[#121A2C] dark:text-white dark:border-white/10"
            style={{ borderColor:"#e2e8f3" }}
          >
            <option className="bg-white dark:bg-[#1A263E] text-slate-900 dark:text-white" value="ALL">Tất cả vai trò</option>
            <option className="bg-white dark:bg-[#1A263E] text-slate-900 dark:text-white" value="TRAVELER">Traveler</option>
            <option className="bg-white dark:bg-[#1A263E] text-slate-900 dark:text-white" value="PROVIDER">Provider</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as"ALL" | UserStatus)}
            className="rounded-lg border bg-white px-4 py-2.5 text-sm dark:bg-[#121A2C] dark:text-white dark:border-white/10"
            style={{ borderColor:"#e2e8f3" }}
          >
            <option className="bg-white dark:bg-[#1A263E] text-slate-900 dark:text-white" value="ALL">Tất cả trạng thái</option>
            <option className="bg-white dark:bg-[#1A263E] text-slate-900 dark:text-white" value="ACTIVE">Hoạt động</option>
            <option className="bg-white dark:bg-[#1A263E] text-slate-900 dark:text-white" value="SUSPENDED">Tạm khoá</option>
            <option className="bg-white dark:bg-[#1A263E] text-slate-900 dark:text-white" value="DISABLED">Vô hiệu</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor:"#e2e8f3" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background:"#f1f5fa" }}>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Người dùng</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Vai trò</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Trạng thái</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">KYC</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Vi phạm</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} className="border-t transition-colors hover:bg-[#f8fafd]" style={{ borderColor:"#e2e8f3" }}>
                  <td className="px-4 py-3 font-mono text-xs">{u.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{u.name}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">{u.email}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{u.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: roleConfig[u.role].bg, color: roleConfig[u.role].color }}>
                      {roleConfig[u.role].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: statusConfig[u.status].bg, color: statusConfig[u.status].color }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusConfig[u.status].color }} />
                      {statusConfig[u.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.kycStatus ==="VERIFIED" ?"text-green-600" : u.kycStatus ==="PENDING" ?"text-amber-600" :"text-red-600"}`}
                      style={{ background: u.kycStatus ==="VERIFIED" ?"rgba(16,185,129,0.1)" : u.kycStatus ==="PENDING" ?"rgba(245,158,11,0.1)" :"rgba(239,68,68,0.1)" }}>
                      {u.kycStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.violations > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                        ⚠️ {u.violations} vi phạm
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400">Không</span>
                    )}
                    {u.reason && <div className="mt-1 text-xs text-red-500">{u.reason}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-90 ${u.status ==="ACTIVE" ?"bg-red-100 text-red-700" :"bg-green-100 text-green-700"}`}
                    >
                      {u.status ==="ACTIVE" ?"🔒 Khoá" :"🔓 Mở khoá"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <div className="text-4xl">🔍</div>
              <div className="mt-2 font-semibold">Không tìm thấy kết quả</div>
            </div>
          )}
        </div>
      </div>

      {/* Lock Modal */}
      {showLockModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#121A2C] dark:text-white">
            <h3 className="text-lg font-bold">Khoá tài khoản</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Bạn sắp khoá tài khoản <strong>{selectedUser.name}</strong>. Vui lòng chọn lý do:
            </p>
            <div className="mt-4 space-y-2">
              {["Gian lận thanh toán","Tranh chấp lặp lại","Giấy tờ giả mạo","Vi phạm chính sách"].map((r) => (
                <label key={r} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-gray-50" style={{ borderColor:"#e2e8f3" }}>
                  <input type="radio" name="lockReason" value={r} checked={lockReason === r} onChange={(e) => setLockReason(e.target.value)} className="accent-[#2a7bd9]" />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => { setShowLockModal(false); setSelectedUser(null); }} className="flex-1 rounded-lg border py-2.5 text-sm font-semibold" style={{ borderColor:"#e2e8f3" }}>
                Huỷ
              </button>
              <button onClick={confirmLock} disabled={!lockReason} className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                Xác nhận khoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
