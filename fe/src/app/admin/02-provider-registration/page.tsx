"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Reveal, LiveDot } from "@/components/profile/wow";
import { providerApplicationApi, type ProviderApplication } from "@/lib/api/client";

import { CATEGORY_ICONS } from "@/constants/categories";

const categoryIcons: Record<string, string> = {
  ...CATEGORY_ICONS,
  // legacy values
  CAMPING_TREKKING: "⛺", VEHICLE: "🚗", STAY: "🏨", EXPERIENCE: "🎯", OTHER: "📦",
};

type FilterTab = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export default function ProviderRegistrationPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterTab>("PENDING");
  const [rejectTarget, setRejectTarget] = useState<ProviderApplication | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const queryKey = ["provider-applications", filter];
  const { data: applications = [], isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      providerApplicationApi.list(filter === "ALL" ? undefined : filter),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => providerApplicationApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider-applications"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      providerApplicationApi.reject(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provider-applications"] });
      setRejectTarget(null);
      setAdminNote("");
    },
  });

  const pendingCount = applications.filter((a) => a.status === "PENDING").length;

  const handleReject = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!rejectTarget) return;
      rejectMutation.mutate({ id: rejectTarget.id, note: adminNote || undefined });
    },
    [rejectTarget, adminNote, rejectMutation],
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Hồ sơ Provider 
            </span>
            <LiveDot label="ĐANG DUYỆT" tone="blue" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#0f1729" }}>
            Đăng ký Provider
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>
            Duyệt hoặc từ chối hồ sơ đăng ký Provider mới
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        className="mb-6 flex items-center gap-2 border-b"
        style={{ borderColor: "#e2e8f3" }}
      >
        {(["ALL", "PENDING", "APPROVED", "REJECTED"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-3 text-sm font-semibold transition-all ${
              filter === tab
                ? "border-b-2 text-[#2a7bd9]"
                : "text-[#5a6b85] hover:text-[#0f1729]"
            }`}
            style={{ borderColor: filter === tab ? "#2a7bd9" : "transparent" }}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
            {tab === "PENDING" && pendingCount > 0 && (
              <span
                className="ml-2 rounded-full px-2 py-0.5 text-xs"
                style={{ background: "rgba(234,179,8,0.2)", color: "#ca8a04" }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="py-20 text-center text-sm" style={{ color: "#5a6b85" }}>
          Đang tải...
        </div>
      ) : applications.length === 0 ? (
        <div
          className="rounded-2xl border bg-white py-16 text-center text-sm"
          style={{ borderColor: "#e2e8f3", color: "#5a6b85" }}
        >
          Không có đơn đăng ký nào
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app, i) => (
            <Reveal key={app.id} delay={i * 60}>
              <div
                className="rounded-2xl border bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderColor: "#e2e8f3" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                      style={{ background: "rgba(146,238,232,0.2)" }}
                    >
                      {categoryIcons[app.categories[0]] ?? "📦"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold" style={{ color: "#0f1729" }}>
                          {app.name}
                        </h3>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ background: "rgba(42,123,217,0.1)", color: "#2a7bd9" }}
                        >
                          {app.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>
                        {app.email} · {app.phone}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span
                          className="rounded-lg bg-[#f1f5fa] px-2.5 py-1 text-xs font-medium"
                          style={{ color: "#5a6b85" }}
                        >
                          {app.city}
                        </span>
                        {app.categories.map((cat) => (
                          <span
                            key={cat}
                            className="rounded-lg bg-[#f1f5fa] px-2.5 py-1 text-xs font-medium"
                            style={{ color: "#5a6b85" }}
                          >
                            {categoryIcons[cat]} {cat.replace("_", " ")}
                          </span>
                        ))}
                        <span className="text-xs" style={{ color: "#8694ad" }}>
                          📅 {new Date(app.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      {app.description && (
                        <p
                          className="mt-2 max-w-lg text-sm leading-relaxed"
                          style={{ color: "#5a6b85" }}
                        >
                          {app.description}
                        </p>
                      )}
                      {app.adminNote && (
                        <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>
                          Ghi chú: {app.adminNote}
                        </p>
                      )}
                    </div>
                  </div>

                  {app.status === "PENDING" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setRejectTarget(app);
                          setAdminNote("");
                        }}
                        className="rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#fef2f2]"
                        style={{ borderColor: "#fecaca", color: "#dc2626" }}
                      >
                        Từ chối
                      </button>
                      <button
                        onClick={() => approveMutation.mutate(app.id)}
                        disabled={approveMutation.isPending}
                        className="rounded-full bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#15803d] disabled:opacity-60"
                      >
                        {approveMutation.isPending ? "..." : "Duyệt"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,41,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectTarget(null);
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <h3 className="mb-1 text-lg font-bold" style={{ color: "#0f1729" }}>
              Từ chối đơn đăng ký
            </h3>
            <p className="mb-5 text-sm" style={{ color: "#5a6b85" }}>
              Đơn của <strong>{rejectTarget.name}</strong> ({rejectTarget.email})
            </p>
            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label
                  className="mb-1.5 block text-xs font-semibold"
                  style={{ color: "#0f1729" }}
                >
                  Lý do từ chối (tuỳ chọn)
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  placeholder="Ghi chú lý do để gửi feedback cho người đăng ký..."
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-200"
                  style={{ borderColor: "#e2e8f3" }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="flex-1 rounded-2xl border py-3 text-sm font-semibold transition-all hover:bg-[#f1f5fa]"
                  style={{ borderColor: "#e2e8f3", color: "#5a6b85" }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={rejectMutation.isPending}
                  className="flex-1 rounded-2xl bg-[#dc2626] py-3 text-sm font-bold text-white transition-all hover:bg-[#b91c1c] disabled:opacity-60"
                >
                  {rejectMutation.isPending ? "Đang xử lý..." : "Xác nhận từ chối"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
