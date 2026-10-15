"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { KpiCards } from "@/components/profile/ui";
import { Reveal, LiveDot } from "@/components/profile/wow";
import { Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminToast } from "@/components/admin/use-admin-toast";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAdminUsers, useAdminUserStats, useSuspendUser, useUnsuspendUser } from "@/hooks/admin/use-admin-users";
import { useAuthStore } from "@/store/auth.store";
import { formatDate } from "@/lib/format";
import type { AdminUser, Role, UserStatus } from "@/types/admin";

const statusColors: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: "rgba(34,197,94,0.1)", text: "#16a34a" },
  SUSPENDED: { bg: "rgba(234,179,8,0.1)", text: "#ca8a04" },
  DISABLED: { bg: "rgba(239,68,68,0.1)", text: "#dc2626" },
};

const roleColors: Record<string, { bg: string; text: string }> = {
  TRAVELER: { bg: "rgba(42,123,217,0.1)", text: "#2a7bd9" },
  PROVIDER: { bg: "rgba(146,238,232,0.3)", text: "#1e5aa8" },
  ADMIN: { bg: "rgba(15,23,41,0.1)", text: "#0f1729" },
  STAFF: { bg: "rgba(124,58,237,0.1)", text: "#7c3aed" },
};

export default function UserAccountsPage() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<Role | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<UserStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search);
  const filterKey = `${debounced}|${filterRole}|${filterStatus}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const { data, isLoading } = useAdminUsers({ search: debounced, role: filterRole, status: filterStatus, page });
  const { data: stats } = useAdminUserStats();
  const me = useAuthStore((s) => s.user);
  const suspend = useSuspendUser();
  const unsuspend = useUnsuspendUser();
  const toast = useAdminToast();
  const [target, setTarget] = useState<{ user: AdminUser; mode: "suspend" | "unsuspend" } | null>(null);
  const users = data?.items ?? [];
  const canSuspend = (u: AdminUser) => u.id !== me?.id && !u.roles.includes("ADMIN");

  const onConfirm = (reason: string) => {
    if (!target) return;
    const done = {
      onSuccess: () => {
        toast.success(target.mode === "suspend" ? "Đã khoá tài khoản" : "Đã mở khoá tài khoản");
        setTarget(null);
      },
      onError: toast.error,
    };
    if (target.mode === "suspend") suspend.mutate({ id: target.user.id, reason }, done);
    else unsuspend.mutate({ id: target.user.id, note: reason || undefined }, done);
  };

  const activePct =
    stats && stats.total > 0 ? `${((stats.active / stats.total) * 100).toFixed(1)}% of total` : undefined;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <LiveDot label="ON-DUTY" tone="red" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#0f1729" }}>Manage User Accounts</h1>
          <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Khoá/mở khoá tài khoản Traveler · Provider vi phạm chính sách</p>
        </div>
      </div>

      <div className="mb-8">
        <Reveal>
          <KpiCards
            items={[
              {
                label: "Total Users",
                value: String(stats?.total ?? "—"),
                hint: `+${stats?.newThisMonth ?? 0} this month`,
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                ),
              },
              {
                label: "Active",
                value: String(stats?.active ?? "—"),
                hint: activePct,
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                label: "Suspended",
                value: String(stats?.suspended ?? "—"),
                hint: "Pending review",
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                ),
              },
              {
                label: "Disabled",
                value: String(stats?.disabled ?? "—"),
                hint: "Inactive accounts",
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                ),
              },
            ]}
          />
        </Reveal>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4" style={{ borderColor: "#e2e8f3" }}>
        <div className="relative min-w-[240px] flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#8694ad" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border bg-[#f8fafc] py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2"
            style={{ borderColor: "#e2e8f3", "--tw-ring-color": "#2a7bd9" } as React.CSSProperties}
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as Role | "ALL")}
          className="rounded-xl border bg-white px-4 py-2.5 text-sm outline-none"
          style={{ borderColor: "#e2e8f3" }}
        >
          <option value="ALL">All Roles</option>
          <option value="TRAVELER">Traveler</option>
          <option value="PROVIDER">Provider</option>
          <option value="ADMIN">Admin</option>
          <option value="STAFF">Staff</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as UserStatus | "ALL")}
          className="rounded-xl border bg-white px-4 py-2.5 text-sm outline-none"
          style={{ borderColor: "#e2e8f3" }}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

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
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#e2e8f3" }}>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    <td colSpan={6} className="px-6 py-3">
                      <Skeleton className="h-14 w-full" />
                    </td>
                  </tr>
                ))}
              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6">
                    <EmptyState icon={Users} title="Không tìm thấy người dùng" description="Thử đổi bộ lọc hoặc từ khoá tìm kiếm." />
                  </td>
                </tr>
              )}
              {!isLoading &&
                users.map((user) => {
                  const primaryRole = user.roles[0] ?? "TRAVELER";
                  const roleStyle = roleColors[primaryRole] ?? roleColors.TRAVELER;
                  const statusStyle = statusColors[user.status] ?? statusColors.ACTIVE;
                  return (
                    <tr key={user.id} className="bg-white transition-colors hover:bg-[#f8fafc]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold" style={{ color: "#0f1729" }}>{user.name}</div>
                            <div className="text-xs" style={{ color: "#5a6b85" }}>{user.email}</div>
                            <div className="text-[10px]" style={{ color: "#8694ad" }}>
                              ID: {user.id} · Joined {formatDate(user.createdAt)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ color: roleStyle.text, background: roleStyle.bg }}
                        >
                          {user.roles.join(", ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ color: statusStyle.text, background: statusStyle.bg }}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${user.status === "ACTIVE" ? "animate-pulse" : ""}`} style={{ background: statusStyle.text }} />
                          {user.status}
                        </span>
                        {user.status === "SUSPENDED" && user.suspensionReason && (
                          <div className="mt-1 max-w-[180px] truncate text-[10px]" style={{ color: "#ca8a04" }} title={user.suspensionReason}>
                            {user.suspensionReason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.isKycVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#16a34a" }}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#ca8a04" }}>
                            {user.kycStatus ?? "None"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold tabular-nums" style={{ color: "#0f1729" }}>
                        {user.bookingsCount}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {user.status === "ACTIVE" && canSuspend(user) && (
                            <button
                              type="button"
                              onClick={() => setTarget({ user, mode: "suspend" })}
                              className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:bg-[#fef2f2]"
                              style={{ borderColor: "#fecaca", color: "#dc2626" }}
                            >
                              Khoá
                            </button>
                          )}
                          {user.status === "SUSPENDED" && (
                            <button
                              type="button"
                              onClick={() => setTarget({ user, mode: "unsuspend" })}
                              className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:bg-[#f0fdf4]"
                              style={{ borderColor: "#bbf7d0", color: "#16a34a" }}
                            >
                              Mở khoá
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Reveal>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm" style={{ color: "#5a6b85" }}>
          Hiển thị <span className="font-semibold" style={{ color: "#0f1729" }}>{users.length}</span> /{" "}
          <span className="font-semibold" style={{ color: "#0f1729" }}>{data?.total ?? 0}</span>
        </p>
        <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
      </div>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        title={target?.mode === "suspend" ? `Khoá tài khoản ${target.user.name}?` : `Mở khoá ${target?.user.name}?`}
        description={target?.mode === "suspend" ? "Người dùng sẽ bị đăng xuất khỏi mọi thiết bị ngay lập tức." : undefined}
        confirmLabel={target?.mode === "suspend" ? "Khoá tài khoản" : "Mở khoá"}
        tone={target?.mode === "suspend" ? "danger" : "default"}
        requireReason={target?.mode === "suspend"}
        optionalReason={target?.mode === "unsuspend"}
        reasonPresets={
          target?.mode === "suspend"
            ? ["Gian lận thanh toán", "Tranh chấp lặp lại", "Giấy tờ giả mạo", "Vi phạm chính sách"]
            : undefined
        }
        pending={suspend.isPending || unsuspend.isPending}
        onConfirm={onConfirm}
      />
      {toast.node}
    </div>
  );
}
