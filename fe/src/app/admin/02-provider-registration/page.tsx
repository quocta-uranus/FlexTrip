"use client";

import { useState } from "react";
import { Card } from "@/components/profile/ui";
import { Reveal, LiveDot } from "@/components/profile/wow";

const mockApplications = [
  { id: "APP-001", name: "Cửa hàng Đà Lạt Camping", owner: "Nguyễn Văn Toàn", category: "CAMPING_TREKKING", submittedAt: "2024-09-14", docs: 5, verified: true, risk: "LOW" },
  { id: "APP-002", name: "Cho thuê xe máy Sài Gòn", owner: "Trần Thị Mai", category: "VEHICLE", submittedAt: "2024-09-13", docs: 4, verified: false, risk: "MEDIUM" },
  { id: "APP-003", name: "Homestay Hội An", owner: "Lê Đình Phong", category: "STAY", submittedAt: "2024-09-12", docs: 6, verified: true, risk: "LOW" },
  { id: "APP-004", name: "Tour trải nghiệm biển", owner: "Phạm Thị Hương", category: "EXPERIENCE", submittedAt: "2024-09-11", docs: 3, verified: false, risk: "HIGH" },
  { id: "APP-005", name: "Thuê xe đạp Phú Quốc", owner: "Hoàng Minh Tuấn", category: "VEHICLE", submittedAt: "2024-09-10", docs: 5, verified: true, risk: "LOW" },
];

const categoryIcons: Record<string, string> = {
  CAMPING_TREKKING: "⛺",
  VEHICLE: "🚗",
  STAY: "🏨",
  EXPERIENCE: "🎯",
};

const riskColors: Record<string, { bg: string; text: string }> = {
  LOW: { bg: "rgba(34,197,94,0.1)", text: "#16a34a" },
  MEDIUM: { bg: "rgba(234,179,8,0.1)", text: "#ca8a04" },
  HIGH: { bg: "rgba(239,68,68,0.1)", text: "#dc2626" },
};

export default function ProviderRegistrationPage() {
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [selectedApp, setSelectedApp] = useState<typeof mockApplications[0] | null>(null);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN-02</span>
            <LiveDot label="REVIEWING" tone="blue" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#0f1729" }}>Provider Registration</h1>
          <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Duyệt hoặc từ chối hồ sơ đăng ký Provider mới</p>
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
          { label: "Pending Review", value: 12, color: "#ca8a04", bg: "rgba(234,179,8,0.1)" },
          { label: "Approved Today", value: 8, color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
          { label: "Rejected Today", value: 2, color: "#dc2626", bg: "rgba(239,68,68,0.1)" },
          { label: "Avg. Review Time", value: "4.2h", color: "#2a7bd9", bg: "rgba(42,123,217,0.1)" },
        ].map((stat) => (
          <Reveal key={stat.label}>
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: "#e2e8f3" }}>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: stat.bg }}>
                  <div className="h-3 w-3 rounded-full" style={{ background: stat.color }} />
                </div>
              </div>
              <div className="mt-2 text-xs" style={{ color: "#5a6b85" }}>{stat.label}</div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex items-center gap-2 border-b" style={{ borderColor: "#e2e8f3" }}>
        {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-sm font-semibold transition-all ${filter === tab ? "border-b-2 text-[#2a7bd9]" : "text-[#5a6b85] hover:text-[#0f1729]"}`}
            style={{ borderColor: filter === tab ? "#2a7bd9" : "transparent" }}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
            {tab === "PENDING" && <span className="ml-2 rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(234,179,8,0.2)", color: "#ca8a04" }}>12</span>}
          </button>
        ))}
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {mockApplications.map((app, i) => (
          <Reveal key={app.id} delay={i * 80}>
            <div className="rounded-2xl border bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5" style={{ borderColor: "#e2e8f3" }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ background: "rgba(146,238,232,0.2)" }}>
                    {categoryIcons[app.category] || "📦"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold" style={{ color: "#0f1729" }}>{app.name}</h3>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "rgba(42,123,217,0.1)", color: "#2a7bd9" }}>{app.id}</span>
                    </div>
                    <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Owner: <span className="font-semibold" style={{ color: "#0f1729" }}>{app.owner}</span></p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="rounded-lg bg-[#f1f5fa] px-2.5 py-1 text-xs font-medium" style={{ color: "#5a6b85" }}>{app.category.replace("_", " ")}</span>
                      <span className="text-xs" style={{ color: "#8694ad" }}>📅 Submitted {app.submittedAt}</span>
                      <span className="text-xs" style={{ color: "#8694ad" }}>📄 {app.docs} documents</span>
                      {app.verified && (
                        <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium" style={{ background: "rgba(34,197,94,0.1)", color: "#16a34a" }}>
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" /></svg>
                          ID Verified
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold" style={{ ...riskColors[app.risk], background: riskColors[app.risk].bg }}>
                        ⚠️ Risk: {app.risk}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]" style={{ borderColor: "#e2e8f3", color: "#5a6b85" }}>View Docs</button>
                  <button className="rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#fef2f2]" style={{ borderColor: "#fecaca", color: "#dc2626" }}>Reject</button>
                  <button className="rounded-full bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#15803d]">Approve</button>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
