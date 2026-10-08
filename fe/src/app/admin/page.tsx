"use client";

import Link from "next/link";
import { useAdminDashboard } from "@/hooks/admin/use-admin-dashboard";
import { useAuthStore } from "@/store/auth.store";
import { formatDateTime } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

const QUICK_ACTIONS = [
  { title: "Người dùng", desc: "Khoá / mở tài khoản", icon: "👥", href: "/admin/01-user-accounts", color: "#2a7bd9" },
  { title: "Tin đăng vi phạm", desc: "Xét duyệt nội dung bị báo cáo", icon: "🛡️", href: "/admin/03-moderate-listings", color: "#dc2626" },
  { title: "Tranh chấp", desc: "Xử lý khiếu nại & hoàn tiền", icon: "⚖️", href: "/admin/04-disputes-refunds", color: "#ca8a04" },
  { title: "Giao dịch", desc: "Đối soát thanh toán", icon: "💰", href: "/admin/05-transactions", color: "#7c3aed" },
  { title: "Thống kê", desc: "Chỉ số nền tảng", icon: "📊", href: "/admin/06-analytics", color: "#2a7bd9" },
  { title: "Đăng ký Provider", desc: "Duyệt hồ sơ Provider mới", icon: "🏪", href: "/admin/02-provider-registration", color: "#16a34a" },
  { title: "Kiểm duyệt đánh giá", desc: "Xử lý đánh giá do AI hoặc hệ thống gắn cờ", icon: "⭐", href: "/admin/reviews", color: "#7c3aed" },
  { title: "Nhật ký", desc: "Lịch sử hoạt động hệ thống", icon: "📜", href: "/admin/09-audit-log", color: "#f59e0b" },
  { title: "Nhân sự", desc: "Phân công & quản lý staff", icon: "👔", href: "/admin/10-staff-management", color: "#0f1729" },
];

const MODULE_LABEL: Record<string, string> = {
  USER: "Tài khoản",
  MODERATION: "Kiểm duyệt",
  DISPUTE: "Tranh chấp",
  FINANCE: "Tài chính",
  CONFIG: "Cấu hình",
  STAFF: "Nhân sự",
  KYC: "KYC",
  PROVIDER: "Provider",
  REVIEW: "Đánh giá",
};

const ACTION_LABEL: Record<string, string> = {
  REVIEW_RESPONSE_CREATED: "Provider đã phản hồi đánh giá",
  REVIEW_RESPONSE_UPDATED: "Provider đã cập nhật phản hồi",
  REVIEW_REANALYZED: "Đã yêu cầu AI phân tích lại đánh giá",
  REVIEW_REJECTED: "Đánh giá đã bị từ chối",
  REVIEW_APPROVED: "Đánh giá đã được công khai",
};

function activityHref(module: string) {
  const routes: Record<string, string> = {
    USER: "/admin/01-user-accounts",
    MODERATION: "/admin/03-moderate-listings",
    DISPUTE: "/admin/04-disputes-refunds",
    FINANCE: "/admin/05-transactions",
    CONFIG: "/admin/08-ai-config",
    STAFF: "/admin/10-staff-management",
    KYC: "/admin/02-provider-registration",
    PROVIDER: "/admin/02-provider-registration",
    REVIEW: "/admin/reviews",
  };
  return routes[module] ?? "/admin/09-audit-log";
}

const MODULE_COLOR: Record<string, string> = {
  USER: "#ca8a04",
  MODERATION: "#dc2626",
  DISPUTE: "#7c3aed",
  FINANCE: "#2a7bd9",
  CONFIG: "#5a6b85",
  STAFF: "#0f1729",
  KYC: "#16a34a",
  PROVIDER: "#16a34a",
};

export default function AdminDashboardPage() {
  const me = useAuthStore((s) => s.user);
  const { data, isLoading } = useAdminDashboard();

  const stats = [
    { label: "Tranh chấp đang mở", value: data?.openDisputes ?? 0, color: "#ca8a04", icon: "⚖️", href: "/admin/04-disputes-refunds" },
    { label: "Nội dung bị báo cáo", value: data?.openFlags ?? 0, color: "#dc2626", icon: "🚩", href: "/admin/03-moderate-listings" },
    { label: "KYC chờ duyệt", value: data?.pendingKyc ?? 0, color: "#7c3aed", icon: "🪪", href: "/admin/02-provider-registration" },
    { label: "Xử lý hôm nay", value: data?.resolvedToday ?? 0, color: "#16a34a", icon: "✅", href: "/admin/09-audit-log" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#f6fbfe" }}>
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm" style={{ color: "#8694ad" }}>Xin chào, {me?.name ?? ""}</p>
          <h1 className="mt-1 text-2xl font-bold" style={{ color: "#0f1729" }}>Bảng điều khiển</h1>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-2xl border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{ borderColor: "#DCEFFB" }}
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{stat.icon}</span>
                {isLoading ? (
                  <Skeleton className="h-8 w-10" />
                ) : (
                  <span className="text-3xl font-bold" style={{ color: stat.color }}>
                    {stat.value}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm font-medium" style={{ color: "#5a6b85" }}>
                {stat.label}
              </p>
              {!isLoading && stat.value > 0 && (
                <p className="mt-0.5 text-xs font-semibold" style={{ color: stat.color }}>
                  Cần xử lý →
                </p>
              )}
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick actions */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold" style={{ color: "#0f1729" }}>
              Truy cập nhanh
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-4 rounded-2xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ borderColor: "#DCEFFB" }}
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl transition-transform group-hover:scale-110"
                    style={{ background: `${action.color}12` }}
                  >
                    {action.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-sm" style={{ color: "#0f1729" }}>
                      {action.title}
                    </p>
                    <p className="truncate text-xs mt-0.5" style={{ color: "#8694ad" }}>
                      {action.desc}
                    </p>
                  </div>
                  <svg
                    className="ml-auto h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    style={{ color: action.color }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold" style={{ color: "#0f1729" }}>
                Hoạt động gần đây
              </h2>
              <Link
                href="/admin/09-audit-log"
                className="text-xs font-semibold"
                style={{ color: "#2a7bd9" }}
              >
                Xem tất cả →
              </Link>
            </div>

            <div
              className="rounded-2xl border bg-white"
              style={{ borderColor: "#DCEFFB" }}
            >
              {isLoading && (
                <div className="divide-y" style={{ borderColor: "#f1f5fa" }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && (data?.recentActivity?.length ?? 0) === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="mb-2 text-3xl">📋</span>
                  <p className="text-sm" style={{ color: "#8694ad" }}>
                    Chưa có hoạt động nào
                  </p>
                </div>
              )}

              {!isLoading && (data?.recentActivity ?? []).length > 0 && (
                <div className="divide-y" style={{ borderColor: "#f6fbfe" }}>
                  {(data?.recentActivity ?? []).map((activity, i) => {
                    const color = MODULE_COLOR[activity.module] ?? "#2a7bd9";
                    const label = MODULE_LABEL[activity.module] ?? activity.module;
                    return (
                      <Link
                        key={activity.id}
                        href={activityHref(activity.module)}
                        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#f6fbfe]"
                        style={{ borderColor: i === 0 ? "transparent" : "#f1f5fa" }}
                      >
                        <div
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium" style={{ color: "#0f1729" }}>
                            {ACTION_LABEL[activity.action] ?? activity.action.replaceAll("_", " ").toLocaleLowerCase("vi")}
                          </p>
                          <p className="text-xs" style={{ color: "#8694ad" }}>
                            {activity.actor?.name ?? "Hệ thống"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{ background: `${color}12`, color }}
                          >
                            {label}
                          </span>
                          <p className="mt-1 text-[10px]" style={{ color: "#8694ad" }}>
                            {formatDateTime(activity.createdAt)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
