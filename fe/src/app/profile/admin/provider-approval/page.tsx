"use client";

import { useState } from "react";
import { SectionTitle } from "@/components/profile/ui";

/**
 * ADMIN-02 — Approve/Reject Provider Registration
 * Duyệt hoặc từ chối hồ sơ đăng ký Provider mới.
 */

interface ProviderApplication {
  id: string;
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  category: string;
  pickupAddress: string;
  documentUrls: string[];
  submittedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
}

const mockApplications: ProviderApplication[] = [
  {
    id: "APP-001",
    shopName: "Cho Thuê Xe Đạp Sài Gòn",
    ownerName: "Trần Văn Minh",
    email: "minh.bike@email.com",
    phone: "+84 901 234 567",
    category: "VEHICLE",
    pickupAddress: "123 Nguyễn Huệ, Quận 1, TP.HCM",
    documentUrls: ["https://picsum.photos/400/300?random=1", "https://picsum.photos/400/300?random=2"],
    submittedAt: "2025-09-15 08:30",
    status: "PENDING",
  },
  {
    id: "APP-002",
    shopName: "Camping Việt Travel",
    ownerName: "Lê Thị Hương",
    email: "huong.camp@gmail.com",
    phone: "+84 912 345 678",
    category: "CAMPING_TREKKING",
    pickupAddress: "45 Lý Tự Trọng, Quận 1, TP.HCM",
    documentUrls: ["https://picsum.photos/400/300?random=3", "https://picsum.photos/400/300?random=4"],
    submittedAt: "2025-09-14 14:20",
    status: "PENDING",
  },
  {
    id: "APP-003",
    shopName: "Homestay Đà Lạt Mùa Hạ",
    ownerName: "Nguyễn Đức Anh",
    email: "anh.homestay@email.com",
    phone: "+84 923 456 789",
    category: "STAY",
    pickupAddress: "78 Phan Đình Phùng, Đà Lạt",
    documentUrls: ["https://picsum.photos/400/300?random=5", "https://picsum.photos/400/300?random=6"],
    submittedAt: "2025-09-13 10:15",
    status: "APPROVED",
  },
  {
    id: "APP-004",
    shopName: "Thuê Xe Máy Phú Quốc",
    ownerName: "Phạm Hoàng Nam",
    email: "nam.rent@gmail.com",
    phone: "+84 934 567 890",
    category: "VEHICLE",
    pickupAddress: "Dương Đông, Phú Quốc, Kiên Giang",
    documentUrls: ["https://picsum.photos/400/300?random=7"],
    submittedAt: "2025-09-12 16:45",
    status: "REJECTED",
    rejectionReason: "Giấy tờ không hợp lệ",
  },
];

const categoryLabels: Record<string, string> = {
  CAMPING_TREKKING: "🏕️ Camping & Trekking",
  VEHICLE: "🚗 Vehicle",
  STAY: "🏨 Stay",
  EXPERIENCE: "🎯 Experience",
  OTHER: "📦 Other",
};

const statusConfig = {
  PENDING: { label: "Chờ duyệt", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  APPROVED: { label: "Đã duyệt", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  REJECTED: { label: "Từ chối", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

export default function AdminProviderApprovalPage() {
  const [apps, setApps] = useState(mockApplications);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [selected, setSelected] = useState<ProviderApplication | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const filtered = apps.filter((a) => filter === "ALL" || a.status === filter);

  const stats = {
    pending: apps.filter((a) => a.status === "PENDING").length,
    approved: apps.filter((a) => a.status === "APPROVED").length,
    rejected: apps.filter((a) => a.status === "REJECTED").length,
  };

  function handleApprove(app: ProviderApplication) {
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: "APPROVED" } : a)));
  }

  function handleReject() {
    if (selected) {
      setApps((prev) => prev.map((a) => (a.id === selected.id ? { ...a, status: "REJECTED", rejectionReason: rejectReason } : a)));
      setShowRejectModal(false);
      setSelected(null);
      setRejectReason("");
    }
  }

  return (
    <div className="pb-20">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <SectionTitle eyebrow="Quản lý hồ sơ" title="Duyệt đăng ký Provider" desc="Phê duyệt hoặc từ chối hồ sơ Provider mới" />

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: "Chờ duyệt", value: stats.pending, icon: "⏳", color: "#f59e0b" },
            { label: "Đã duyệt", value: stats.approved, icon: "✅", color: "#10b981" },
            { label: "Từ chối", value: stats.rejected, icon: "❌", color: "#ef4444" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-white p-4" style={{ borderColor: "#e2e8f3" }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{s.icon}</span>
                <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              </div>
              <div className="mt-1 text-xs" style={{ color: "#5a6b85" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${filter === f ? "text-white shadow-md" : "border bg-white"}`}
              style={filter === f ? { background: "#2a7bd9" } : { borderColor: "#e2e8f3", color: "#5a6b85" }}
            >
              {f === "ALL" ? "Tất cả" : statusConfig[f].label}
              {f !== "ALL" && <span className="ml-1.5 opacity-70">({apps.filter((a) => a.status === f).length})</span>}
            </button>
          ))}
        </div>

        {/* Applications Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((app) => (
            <div key={app.id} className="rounded-2xl border bg-white p-5" style={{ borderColor: "#e2e8f3" }}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: "rgba(42,123,217,0.1)", color: "#2a7bd9" }}>{app.id}</span>
                  <h3 className="mt-1.5 text-base font-bold">{app.shopName}</h3>
                  <p className="text-sm" style={{ color: "#5a6b85" }}>{app.ownerName}</p>
                </div>
                <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: statusConfig[app.status].bg, color: statusConfig[app.status].color }}>
                  {statusConfig[app.status].label}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span style={{ color: "#8694ad" }}>📧</span>
                  <span>{app.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: "#8694ad" }}>📱</span>
                  <span>{app.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: "#8694ad" }}>📍</span>
                  <span>{app.pickupAddress}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: "#8694ad" }}>🏷️</span>
                  <span>{categoryLabels[app.category] || app.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: "#8694ad" }}>📅</span>
                  <span>Ngày nộp: {app.submittedAt}</span>
                </div>
              </div>

              {/* Documents Preview */}
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold" style={{ color: "#5a6b85" }}>Giấy tờ đính kèm:</p>
                <div className="flex gap-2">
                  {app.documentUrls.map((url, i) => (
                    <div key={i} className="h-16 w-24 overflow-hidden rounded-lg border" style={{ borderColor: "#e2e8f3" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Document ${i + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              {app.rejectionReason && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <strong>Lý do từ chối:</strong> {app.rejectionReason}
                </div>
              )}

              {/* Actions */}
              {app.status === "PENDING" && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => handleApprove(app)}
                    className="flex-1 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-green-700"
                  >
                    ✅ Duyệt
                  </button>
                  <button
                    onClick={() => { setSelected(app); setShowRejectModal(true); }}
                    className="flex-1 rounded-lg border border-red-300 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50"
                  >
                    ❌ Từ chối
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-5xl">📋</div>
            <div className="mt-3 text-lg font-semibold">Không có hồ sơ nào</div>
            <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Không có hồ sơ nào phù hợp với bộ lọc hiện tại</p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-red-600">Từ chối hồ sơ</h3>
            <p className="mt-2 text-sm" style={{ color: "#5a6b85" }}>
              Bạn sắp từ chối hồ sơ của <strong>{selected.shopName}</strong>.
            </p>
            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium">Lý do từ chối</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                rows={3}
                className="w-full rounded-lg border p-3 text-sm outline-none focus:ring-2"
                style={{ borderColor: "#e2e8f3" }}
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => { setShowRejectModal(false); setSelected(null); }} className="flex-1 rounded-lg border py-2.5 text-sm font-semibold" style={{ borderColor: "#e2e8f3" }}>
                Huỷ
              </button>
              <button onClick={handleReject} disabled={!rejectReason.trim()} className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
