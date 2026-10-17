"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal, LiveDot } from "@/components/profile/wow";
import { Pagination } from "@/components/admin/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAdminDisputes, useDisputeStats } from "@/hooks/admin/use-admin-disputes";
import { formatDate, formatVnd } from "@/lib/format";
import { DISPUTE_PRIORITY_LABELS, DISPUTE_STATUS_LABELS, DISPUTE_TYPE_LABELS } from "@/lib/dispute-labels";
import type { DisputePriority, DisputeStatus, DisputeType } from "@/types/admin";

const statusStyles: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: DISPUTE_STATUS_LABELS.OPEN, color: "#dc2626", bg: "rgba(239,68,68,0.1)" },
  UNDER_REVIEW: { label: DISPUTE_STATUS_LABELS.UNDER_REVIEW, color: "#ca8a04", bg: "rgba(234,179,8,0.1)" },
  RESOLVED: { label: DISPUTE_STATUS_LABELS.RESOLVED, color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
  REJECTED: { label: DISPUTE_STATUS_LABELS.REJECTED, color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  ESCALATED: { label: DISPUTE_STATUS_LABELS.ESCALATED, color: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
  PENDING_INFO: { label: DISPUTE_STATUS_LABELS.PENDING_INFO, color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

const priorityStyles: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: "#dc2626", bg: "rgba(239,68,68,0.2)" },
  HIGH: { color: "#ea580c", bg: "rgba(234,88,12,0.2)" },
  MEDIUM: { color: "#ca8a04", bg: "rgba(234,179,8,0.2)" },
  LOW: { color: "#16a34a", bg: "rgba(34,197,94,0.2)" },
};

const typeLabels = DISPUTE_TYPE_LABELS;

const STATUS_TABS: Array<DisputeStatus | "ALL"> = [
  "ALL",
  "OPEN",
  "UNDER_REVIEW",
  "PENDING_INFO",
  "ESCALATED",
  "RESOLVED",
  "REJECTED",
];

export default function DisputesRefundsPage() {
  const [status, setStatus] = useState<DisputeStatus | "ALL">("ALL");
  const [type, setType] = useState<DisputeType | "ALL">("ALL");
  const [priority, setPriority] = useState<DisputePriority | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search);
  const filterKey = `${status}|${type}|${priority}|${debounced}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const { data, isLoading } = useAdminDisputes({ status, type, priority, search: debounced, page });
  const { data: stats } = useDisputeStats();
  const disputes = data?.items ?? [];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <LiveDot label="ĐANG XỬ LÝ" tone="red" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#0f1729" }}>Tranh chấp & Hoàn tiền</h1>
          <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Theo dõi toàn bộ case tranh chấp và trạng thái xử lý</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-5">
        {[
          { label: DISPUTE_STATUS_LABELS.OPEN, value: stats?.byStatus.OPEN ?? 0, color: "#dc2626" },
          { label: DISPUTE_STATUS_LABELS.UNDER_REVIEW, value: stats?.byStatus.UNDER_REVIEW ?? 0, color: "#ca8a04" },
          { label: DISPUTE_STATUS_LABELS.ESCALATED, value: stats?.byStatus.ESCALATED ?? 0, color: "#7c3aed" },
          { label: DISPUTE_STATUS_LABELS.RESOLVED, value: stats?.byStatus.RESOLVED ?? 0, color: "#16a34a" },
          { label: "Đang tranh chấp", value: formatVnd(stats?.openAmount), color: "#2a7bd9" },
        ].map((stat) => (
          <Reveal key={stat.label}>
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: "#e2e8f3" }}>
              <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="mt-1 text-xs" style={{ color: "#5a6b85" }}>{stat.label}</div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo ID, traveler, provider..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as DisputeType | "ALL")}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none"
        >
          <option value="ALL">Tất cả loại</option>
          {Object.entries(typeLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as DisputePriority | "ALL")}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none"
        >
          <option value="ALL">Tất cả ưu tiên</option>
          {Object.entries(DISPUTE_PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 border-b" style={{ borderColor: "#e2e8f3" }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatus(tab)}
            className={`px-4 py-3 text-sm font-semibold transition-all ${status === tab ? "border-b-2 text-[#2a7bd9]" : "text-[#5a6b85] hover:text-[#0f1729]"}`}
            style={{ borderColor: status === tab ? "#2a7bd9" : "transparent" }}
          >
            {tab === "ALL" ? "Tất cả" : DISPUTE_STATUS_LABELS[tab]}
            {tab !== "ALL" && stats?.byStatus[tab] != null && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {stats.byStatus[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "#e2e8f3" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Tranh chấp</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Loại</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Các bên</th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Số tiền</th>
              <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Ưu tiên</th>
              <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Trạng thái</th>
              <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "#e2e8f3" }}>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-6 py-3">
                    <Skeleton className="h-12 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && disputes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                  Không tìm thấy tranh chấp.
                </td>
              </tr>
            )}
            {disputes.map((d) => (
              <tr key={d.id} className="bg-white transition-colors hover:bg-[#f8fafc]">
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold" style={{ color: "#0f1729" }}>{d.id}</span>
                    <span className="text-xs" style={{ color: "#5a6b85" }}>Đơn thuê: {d.bookingId}</span>
                    <span className="text-[10px]" style={{ color: "#8694ad" }}>📅 {formatDate(d.createdAt)}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium" style={{ color: "#5a6b85" }}>{typeLabels[d.type]}</span>
                  <p className="mt-0.5 max-w-[180px] truncate text-xs text-slate-400" title={d.reason}>{d.reason}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-blue-100 text-center text-[10px] font-bold leading-6 text-blue-600">T</div>
                      <span className="text-sm">{d.traveler.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-teal-100 text-center text-[10px] font-bold leading-6 text-teal-600">P</div>
                      <span className="text-sm">{d.provider.shopName ?? d.provider.name}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-bold tabular-nums" style={{ color: "#dc2626" }}>
                  {formatVnd(d.amount)}
                  {d.refundAmount != null && (
                    <div className="mt-0.5 text-xs font-semibold" style={{ color: "#16a34a" }}>
                      Đã hoàn {formatVnd(d.refundAmount)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ color: priorityStyles[d.priority].color, background: priorityStyles[d.priority].bg }}
                  >
                    {DISPUTE_PRIORITY_LABELS[d.priority]}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ color: statusStyles[d.status].color, background: statusStyles[d.status].bg }}
                  >
                    {statusStyles[d.status].label}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center">
                    <Link
                      href={`/admin/04-disputes-refunds/${d.id}`}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:bg-[#eff6ff]"
                      style={{ borderColor: "#bfdbfe", color: "#2563eb" }}
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  );
}
