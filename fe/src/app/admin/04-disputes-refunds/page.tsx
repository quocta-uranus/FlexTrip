"use client";

import { useState } from "react";
import { Reveal, LiveDot } from "@/components/profile/wow";

const mockDisputes = [
  { id: "DSP-001", bookingId: "BKG-4421", type: "REFUND_REQUEST", status: "OPEN", traveler: "Nguyễn Văn Minh", provider: "Cửa hàng Đà Lạt Camping", amount: 450000, reason: "Listing không đúng mô tả, ảnh lừa đảo", createdAt: "2024-09-14", priority: "HIGH" },
  { id: "DSP-002", bookingId: "BKG-3398", type: "PAYMENT_DISPUTE", status: "UNDER_REVIEW", traveler: "Trần Thị Lan", provider: "Thuê xe máy Sài Gòn", amount: 280000, reason: "Thanh toán bị trùng lặp 2 lần", createdAt: "2024-09-12", priority: "MEDIUM" },
  { id: "DSP-003", bookingId: "BKG-2256", type: "CANCELLATION_DISPUTE", status: "RESOLVED", traveler: "Lê Hoàng Nam", provider: "Homestay Hội An", amount: 850000, reason: "Provider hủy đột ngột không hoàn tiền", createdAt: "2024-09-10", priority: "LOW" },
  { id: "DSP-004", bookingId: "BKG-1198", type: "DAMAGE_CLAIM", status: "ESCALATED", traveler: "Phạm Đức Anh", provider: "Tour trải nghiệm biển", amount: 1200000, reason: "Yêu cầu bồi thường thiết bị hư hỏng", createdAt: "2024-09-08", priority: "CRITICAL" },
  { id: "DSP-005", bookingId: "BKG-887", type: "REFUND_REQUEST", status: "PENDING_INFO", traveler: "Hoàng Minh Châu", provider: "Thuê xe đạp Phú Quốc", amount: 150000, reason: "Hàng giao muộn 3 ngày", createdAt: "2024-09-06", priority: "LOW" },
];

const statusStyles: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: "Open", color: "#dc2626", bg: "rgba(239,68,68,0.1)" },
  UNDER_REVIEW: { label: "Under Review", color: "#ca8a04", bg: "rgba(234,179,8,0.1)" },
  RESOLVED: { label: "Resolved", color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
  ESCALATED: { label: "Escalated", color: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
  PENDING_INFO: { label: "Pending Info", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

const priorityStyles: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: "#dc2626", bg: "rgba(239,68,68,0.2)" },
  HIGH: { color: "#ea580c", bg: "rgba(234,88,12,0.2)" },
  MEDIUM: { color: "#ca8a04", bg: "rgba(234,179,8,0.2)" },
  LOW: { color: "#16a34a", bg: "rgba(34,197,94,0.2)" },
};

const typeLabels: Record<string, string> = {
  REFUND_REQUEST: "Yêu cầu hoàn tiền",
  PAYMENT_DISPUTE: "Tranh chấp thanh toán",
  CANCELLATION_DISPUTE: "Tranh chấp hủy đơn",
  DAMAGE_CLAIM: "Yêu cầu bồi thường",
};

export default function DisputesRefundsPage() {
  const [filter, setFilter] = useState("ALL");

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN-04</span>
            <LiveDot label="HANDLING" tone="red" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#0f1729" }}>Disputes & Refunds</h1>
          <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Theo dõi toàn bộ case tranh chấp và trạng thái xử lý</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]" style={{ borderColor: "#e2e8f3", color: "#5a6b85" }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            Export Report
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-5">
        {[
          { label: "Open", value: 8, color: "#dc2626", bg: "rgba(239,68,68,0.1)" },
          { label: "Under Review", value: 12, color: "#ca8a04", bg: "rgba(234,179,8,0.1)" },
          { label: "Escalated", value: 3, color: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
          { label: "Resolved", value: 156, color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
          { label: "Total Amount", value: "₫42.8M", color: "#2a7bd9", bg: "rgba(42,123,217,0.1)" },
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
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b" style={{ borderColor: "#e2e8f3" }}>
        {["ALL", "OPEN", "UNDER_REVIEW", "ESCALATED", "RESOLVED", "PENDING_INFO"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-sm font-semibold transition-all ${filter === tab ? "border-b-2 text-[#2a7bd9]" : "text-[#5a6b85] hover:text-[#0f1729]"}`}
            style={{ borderColor: filter === tab ? "#2a7bd9" : "transparent" }}
          >
            {tab.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Disputes Table */}
      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "#e2e8f3" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Dispute</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Type</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Parties</th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Amount</th>
              <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Priority</th>
              <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Status</th>
              <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "#e2e8f3" }}>
            {mockDisputes.map((d) => (
              <tr key={d.id} className="bg-white transition-colors hover:bg-[#f8fafc]">
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold" style={{ color: "#0f1729" }}>{d.id}</span>
                    <span className="text-xs" style={{ color: "#5a6b85" }}>Booking: {d.bookingId}</span>
                    <span className="text-[10px]" style={{ color: "#8694ad" }}>📅 {d.createdAt}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium" style={{ color: "#5a6b85" }}>{typeLabels[d.type]}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-blue-100 text-center text-[10px] font-bold leading-6 text-blue-600">T</div>
                      <span className="text-sm">{d.traveler}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-teal-100 text-center text-[10px] font-bold leading-6 text-teal-600">P</div>
                      <span className="text-sm">{d.provider}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-bold tabular-nums" style={{ color: "#dc2626" }}>
                  {d.amount.toLocaleString("vi-VN")}đ
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ ...priorityStyles[d.priority], color: priorityStyles[d.priority].color }}>
                    {d.priority}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ ...statusStyles[d.status], color: statusStyles[d.status].color }}>
                    {statusStyles[d.status].label}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button className="rounded-lg border p-2 transition-all hover:bg-[#eff6ff]" style={{ borderColor: "#bfdbfe", color: "#2563eb" }} title="View Details">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    <button className="rounded-lg border p-2 transition-all hover:bg-[#fef2f2]" style={{ borderColor: "#fecaca", color: "#dc2626" }} title="Escalate">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4.875v10.5c0 .621.504 1.125 1.125 1.125h3.75m10.5 0v-.375c0-.621-.504-1.125-1.125-1.125H17.625m-10.5 0V6.5m10.5 0v.75c0 .621.504 1.125 1.125 1.125h1.5m-1.5 0H8.625m0 0a1.125 1.125 0 011.125-1.125m1.125 1.125v3.75m0 0H17.625m-10.5 0h1.875c.621 0 1.125-.504 1.125-1.125V8.25m0 0H4.5" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
