"use client";

import { useState } from "react";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { Reveal, LiveDot } from "@/components/profile/wow";
import { Pagination } from "@/components/admin/pagination";
import { EmptyState } from "@/components/empty-state";
import { TicketCategoryBadge, TicketPriorityBadge, TicketStatusBadge } from "@/components/support/ticket-parts";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAdminTickets, useTicketStats } from "@/hooks/admin/use-admin-support";
import { formatDateTime } from "@/lib/format";
import { TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS } from "@/types/support";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/types/support";

const STATUS_TABS: Array<TicketStatus | "ALL"> = ["ALL", "OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"];
const SELECT_CLASS = "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none";
const TH = "px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#5a6b85]";

export default function SupportTicketsPage() {
  const [status, setStatus] = useState<TicketStatus | "ALL">("ALL");
  const [category, setCategory] = useState<TicketCategory | "ALL">("ALL");
  const [priority, setPriority] = useState<TicketPriority | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search);
  const filterKey = `${status}|${category}|${priority}|${debounced}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const { data, isLoading } = useAdminTickets({ status, category, priority, search: debounced, page });
  const { data: stats } = useTicketStats();
  const tickets = data?.items ?? [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-3">
          <LiveDot label="SUPPORT" tone="red" />
        </div>
        <h1 className="text-3xl font-bold text-[#0f1729]">Ticket hỗ trợ</h1>
        <p className="mt-1 text-sm text-[#5a6b85]">Theo dõi, phản hồi và đóng yêu cầu hỗ trợ từ Traveler và Provider</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-5">
        {[
          { label: "Mới", value: stats?.byStatus.OPEN ?? 0, color: "#dc2626" },
          { label: "Chưa có người nhận", value: stats?.unassigned ?? 0, color: "#7c3aed" },
          { label: "Đang xử lý", value: stats?.byStatus.IN_PROGRESS ?? 0, color: "#ca8a04" },
          { label: "Chờ người dùng", value: stats?.byStatus.WAITING_USER ?? 0, color: "#2a7bd9" },
          { label: "Đã giải quyết", value: stats?.byStatus.RESOLVED ?? 0, color: "#16a34a" },
        ].map((stat) => (
          <Reveal key={stat.label}>
            <div className="rounded-2xl border border-[#e2e8f3] bg-white p-4">
              <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="mt-1 text-xs text-[#5a6b85]">{stat.label}</div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo mã, tiêu đề, tên hoặc email..."
          className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory | "ALL")} className={SELECT_CLASS}>
          <option value="ALL">Tất cả chủ đề</option>
          {Object.entries(TICKET_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority | "ALL")} className={SELECT_CLASS}>
          <option value="ALL">Tất cả ưu tiên</option>
          {(["URGENT", "HIGH", "MEDIUM", "LOW"] as const).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-[#e2e8f3]">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatus(tab)}
            className={`px-4 py-3 text-sm font-semibold transition-all ${status === tab ? "border-b-2 border-[#2a7bd9] text-[#2a7bd9]" : "border-b-2 border-transparent text-[#5a6b85] hover:text-[#0f1729]"}`}
          >
            {tab === "ALL" ? "Tất cả" : TICKET_STATUS_LABELS[tab].replace("Chờ bạn phản hồi", "Chờ người dùng")}
            {tab !== "ALL" && stats?.byStatus[tab] != null && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{stats.byStatus[tab]}</span>
            )}
          </button>
        ))}
      </div>

      {!isLoading && tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="Không có ticket" description="Thử đổi bộ lọc hoặc từ khoá tìm kiếm." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f3]">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th className={`${TH} text-left`}>Ticket</th>
                <th className={`${TH} text-left`}>Người gửi</th>
                <th className={`${TH} text-center`}>Chủ đề</th>
                <th className={`${TH} text-center`}>Ưu tiên</th>
                <th className={`${TH} text-center`}>Trạng thái</th>
                <th className={`${TH} text-center`}>Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f3]">
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-6 py-3"><Skeleton className="h-12 w-full" /></td></tr>
                ))}
              {tickets.map((t) => (
                <tr key={t.id} className="bg-white transition-colors hover:bg-[#f8fafc]">
                  <td className="px-6 py-4">
                    <p className="max-w-[280px] truncate font-semibold text-[#0f1729]" title={t.subject}>{t.subject}</p>
                    <p className="mt-0.5 text-xs text-[#8694ad]">{t.messageCount} phản hồi · {formatDateTime(t.updatedAt)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-[#0f1729]">{t.requester.name}</p>
                    <p className="text-xs text-[#8694ad]">{t.assignedTo ? `Phụ trách: ${t.assignedTo.name}` : "Chưa có người nhận"}</p>
                  </td>
                  <td className="px-6 py-4 text-center"><TicketCategoryBadge category={t.category} /></td>
                  <td className="px-6 py-4 text-center"><TicketPriorityBadge priority={t.priority} /></td>
                  <td className="px-6 py-4 text-center"><TicketStatusBadge status={t.status} audience="admin" /></td>
                  <td className="px-6 py-4 text-center">
                    <Link
                      href={`/admin/12-support-tickets/${t.id}`}
                      className="rounded-lg border border-[#bfdbfe] px-3 py-1.5 text-xs font-semibold text-[#2563eb] transition-all hover:bg-[#eff6ff]"
                    >
                      Xử lý
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  );
}
