"use client";

import { useState } from "react";
import { Reveal, LiveDot } from "@/components/profile/wow";

const mockListings = [
  { id: "LST-001", title: "Xe máy Yamaha Sirius cũ mới 80%", price: 150000, location: "Quận 1, TP.HCM", category: "VEHICLE", provider: "Trần Văn Minh", status: "FLAGGED", flags: 3, reason: "Giá quá thấp, có dấu hiệu lừa đảo", reportedAt: "2024-09-14" },
  { id: "LST-002", title: "Lều camping 4 người Naturehike", price: 80000, location: "Đà Lạt, Lâm Đồng", category: "CAMPING_TREKKING", provider: "Nguyễn Thị Lan", status: "PENDING", flags: 1, reason: "Hình ảnh không rõ ràng", reportedAt: "2024-09-13" },
  { id: "LST-003", title: "Homestay view biển Mũi Né", price: 450000, location: "Mũi Né, Bình Thuận", category: "STAY", provider: "Lê Hoàng Nam", status: "FLAGGED", flags: 5, reason: "Spam đăng tin trùng lặp", reportedAt: "2024-09-12" },
  { id: "LST-004", title: "Tour ẩm thực Sài Gòn 4h", price: 350000, location: "Quận 3, TP.HCM", category: "EXPERIENCE", provider: "Phạm Đức Anh", status: "PENDING", flags: 0, reason: "", reportedAt: "2024-09-11" },
  { id: "LST-005", title: "Xe đạp đua carbon Giant", price: 120000, location: "Cần Thơ", category: "VEHICLE", provider: "Hoàng Minh Châu", status: "ACTIVE", flags: 0, reason: "", reportedAt: "" },
];

const statusStyles: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: "Active", color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
  PENDING: { label: "Pending Review", color: "#ca8a04", bg: "rgba(234,179,8,0.1)" },
  FLAGGED: { label: "Flagged", color: "#dc2626", bg: "rgba(239,68,68,0.1)" },
  REMOVED: { label: "Removed", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

const categoryEmoji: Record<string, string> = {
  CAMPING_TREKKING: "⛺",
  VEHICLE: "🚗",
  STAY: "🏨",
  EXPERIENCE: "🎯",
};

export default function ModerateListingsPage() {
  const [filter, setFilter] = useState<"ALL" | "FLAGGED" | "PENDING" | "ACTIVE">("FLAGGED");

  const filtered = mockListings.filter((l) => filter === "ALL" || l.status === filter);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN-03</span>
            <LiveDot label="MODERATING" tone="red" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#0f1729" }}>Moderate Listings</h1>
          <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Duyệt hoặc gỡ bỏ tin đăng bị gắn cờ vi phạm chính sách</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]" style={{ borderColor: "#e2e8f3", color: "#5a6b85" }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            Export Report
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Flagged Listings", value: 18, trend: "+3 today", color: "#dc2626", bg: "rgba(239,68,68,0.1)" },
          { label: "Pending Review", value: 24, trend: "Need attention", color: "#ca8a04", bg: "rgba(234,179,8,0.1)" },
          { label: "Removed This Week", value: 7, trend: "-2 vs last week", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
          { label: "Avg Resolution", value: "2.4h", trend: "SLA: 4h", color: "#2a7bd9", bg: "rgba(42,123,217,0.1)" },
        ].map((stat) => (
          <Reveal key={stat.label}>
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: "#e2e8f3" }}>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: stat.bg }}>
                  <div className="h-3 w-3 rounded-full" style={{ background: stat.color }} />
                </div>
              </div>
              <div className="mt-1 text-xs" style={{ color: "#5a6b85" }}>{stat.label}</div>
              <div className="mt-1 text-[10px] font-medium" style={{ color: stat.color }}>{stat.trend}</div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2 border-b" style={{ borderColor: "#e2e8f3" }}>
        {(["ALL", "FLAGGED", "PENDING", "ACTIVE"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-sm font-semibold transition-all ${filter === tab ? "border-b-2 text-[#2a7bd9]" : "text-[#5a6b85] hover:text-[#0f1729]"}`}
            style={{ borderColor: filter === tab ? "#2a7bd9" : "transparent" }}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
            {tab === "FLAGGED" && <span className="ml-2 rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(239,68,68,0.2)", color: "#dc2626" }}>18</span>}
            {tab === "PENDING" && <span className="ml-2 rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(234,179,8,0.2)", color: "#ca8a04" }}>24</span>}
          </button>
        ))}
      </div>

      {/* Listings */}
      <div className="space-y-4">
        {filtered.map((listing, i) => (
          <Reveal key={listing.id} delay={i * 80}>
            <div className={`rounded-2xl border bg-white p-6 transition-all hover:shadow-lg ${listing.status === "FLAGGED" ? "ring-2 ring-red-200" : ""}`} style={{ borderColor: listing.status === "FLAGGED" ? "#fecaca" : "#e2e8f3" }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ background: "rgba(146,238,232,0.2)" }}>
                    {categoryEmoji[listing.category] || "📦"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold" style={{ color: "#0f1729" }}>{listing.title}</h3>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "rgba(42,123,217,0.1)", color: "#2a7bd9" }}>{listing.id}</span>
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ ...statusStyles[listing.status], background: statusStyles[listing.status].bg }}>
                        {listing.status === "FLAGGED" && "🚩"}
                        {listing.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Provider: <span className="font-semibold" style={{ color: "#0f1729" }}>{listing.provider}</span></p>
                    <p className="text-sm" style={{ color: "#5a6b85" }}>📍 {listing.location} · <span className="font-semibold" style={{ color: "#16a34a" }}>{listing.price.toLocaleString("vi-VN")}đ/ngày</span></p>
                    {listing.flags > 0 && (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">{listing.flags}</span>
                          <span className="text-sm font-semibold text-red-700">Flag Reason:</span>
                        </div>
                        <p className="text-sm text-red-600">{listing.reason}</p>
                        <p className="mt-1 text-xs text-red-400">Reported: {listing.reportedAt}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]" style={{ borderColor: "#e2e8f3", color: "#5a6b85" }}>Preview</button>
                  <button className="rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#fef2f2]" style={{ borderColor: "#fecaca", color: "#dc2626" }}>Remove</button>
                  <button className="rounded-full bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#15803d]">Keep Live</button>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
