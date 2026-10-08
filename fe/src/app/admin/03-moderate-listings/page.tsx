"use client";

import { useState } from "react";
import { Reveal, LiveDot } from "@/components/profile/wow";
import { Pagination } from "@/components/admin/pagination";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminToast } from "@/components/admin/use-admin-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useAdminListings,
  useListingFlags,
  useListingModerationStats,
  useModerateListing,
} from "@/hooks/admin/use-admin-listings";
import { formatDate, formatDateTime, formatVnd } from "@/lib/format";
import type { AdminListing, ListingTab, ModerateAction } from "@/types/admin";

const statusStyles: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: "Active", color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
  INACTIVE: { label: "Inactive", color: "#ca8a04", bg: "rgba(234,179,8,0.1)" },
  SUSPENDED: { label: "Suspended", color: "#ea580c", bg: "rgba(234,88,12,0.1)" },
  REMOVED: { label: "Removed", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  DRAFT: { label: "Draft", color: "#8694ad", bg: "rgba(134,148,173,0.15)" },
};

const categoryEmoji: Record<string, string> = {
  CAMPING_TREKKING: "⛺",
  VEHICLE: "🚗",
  STAY: "🏨",
  EXPERIENCE: "🎯",
};

const TABS: ListingTab[] = ["FLAGGED", "ACTIVE", "SUSPENDED", "REMOVED", "ALL"];

const ACTION_LABEL: Record<ModerateAction, string> = {
  KEEP: "giữ tin",
  HIDE: "ẩn tin",
  REMOVE: "gỡ tin",
  RESTORE: "khôi phục",
};

type Target = { listing: AdminListing; action: ModerateAction };

export default function ModerateListingsPage() {
  const [tab, setTab] = useState<ListingTab>("FLAGGED");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search);
  const filterKey = `${tab}|${debounced}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const { data, isLoading } = useAdminListings({ tab, search: debounced, page });
  const { data: stats } = useListingModerationStats();
  const moderate = useModerateListing();
  const toast = useAdminToast();
  const [target, setTarget] = useState<Target | null>(null);
  const [openFlagsFor, setOpenFlagsFor] = useState<string | null>(null);
  const { data: flags, isLoading: flagsLoading } = useListingFlags(openFlagsFor);

  const listings = data?.items ?? [];

  const onConfirm = (note: string) => {
    if (!target) return;
    moderate.mutate(
      { id: target.listing.id, action: target.action, note: note || undefined },
      {
        onSuccess: (res) => {
          const base = `Đã ${ACTION_LABEL[target.action]}`;
          const extra = res.flagsUpdated > 0 ? `\n${res.flagsUpdated} báo cáo đã được xử lý` : "";
          toast.success(base + extra);
          setTarget(null);
        },
        onError: toast.error,
      },
    );
  };

  const actionButtons = (listing: AdminListing) => {
    const buttons: { label: string; action: ModerateAction; className: string; style: React.CSSProperties }[] = [];
    const live = listing.status === "ACTIVE" || listing.status === "INACTIVE";

    if (live && listing.openFlagsCount > 0) {
      buttons.push(
        { label: "Giữ tin", action: "KEEP", className: "rounded-full bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#15803d]", style: {} },
        { label: "Ẩn", action: "HIDE", className: "rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#fff7ed]", style: { borderColor: "#fed7aa", color: "#ea580c" } },
        { label: "Gỡ", action: "REMOVE", className: "rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#fef2f2]", style: { borderColor: "#fecaca", color: "#dc2626" } },
      );
    } else if (live) {
      buttons.push(
        { label: "Ẩn", action: "HIDE", className: "rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#fff7ed]", style: { borderColor: "#fed7aa", color: "#ea580c" } },
        { label: "Gỡ", action: "REMOVE", className: "rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#fef2f2]", style: { borderColor: "#fecaca", color: "#dc2626" } },
      );
    } else if (listing.status === "SUSPENDED") {
      buttons.push(
        { label: "Khôi phục", action: "RESTORE", className: "rounded-full bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#15803d]", style: {} },
        { label: "Gỡ", action: "REMOVE", className: "rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#fef2f2]", style: { borderColor: "#fecaca", color: "#dc2626" } },
      );
    } else if (listing.status === "REMOVED") {
      buttons.push(
        { label: "Khôi phục", action: "RESTORE", className: "rounded-full bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#15803d]", style: {} },
      );
    }

    return buttons;
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <LiveDot label="MODERATING" tone="red" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#0f1729" }}>Moderate Listings</h1>
          <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Duyệt hoặc gỡ bỏ tin đăng bị gắn cờ vi phạm chính sách</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Flagged Listings", value: stats?.flagged ?? "—", color: "#dc2626", bg: "rgba(239,68,68,0.1)" },
          { label: "Suspended", value: stats?.suspended ?? "—", color: "#ca8a04", bg: "rgba(234,179,8,0.1)" },
          { label: "Removed This Week", value: stats?.removedThisWeek ?? "—", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
          { label: "Avg Resolution", value: `${stats?.avgResolutionHours ?? "—"}h`, color: "#2a7bd9", bg: "rgba(42,123,217,0.1)" },
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
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, địa điểm, provider..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      </div>

      <div className="mb-6 flex items-center gap-2 border-b" style={{ borderColor: "#e2e8f3" }}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-semibold transition-all ${tab === t ? "border-b-2 text-[#2a7bd9]" : "text-[#5a6b85] hover:text-[#0f1729]"}`}
            style={{ borderColor: tab === t ? "#2a7bd9" : "transparent" }}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
            {t === "FLAGGED" && (
              <span className="ml-2 rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(239,68,68,0.2)", color: "#dc2626" }}>
                {stats?.flagged ?? 0}
              </span>
            )}
            {t === "SUSPENDED" && (
              <span className="ml-2 rounded-full px-2 py-0.5 text-xs" style={{ background: "rgba(234,179,8,0.2)", color: "#ca8a04" }}>
                {stats?.suspended ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
        {!isLoading && listings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            Không có tin đăng trong tab này.
          </div>
        )}
        {listings.map((listing, i) => {
          const st = statusStyles[listing.status] ?? statusStyles.ACTIVE;
          const flagged = listing.openFlagsCount > 0;
          return (
            <Reveal key={listing.id} delay={i * 40}>
              <div
                className={`rounded-2xl border bg-white p-6 transition-all hover:shadow-lg ${flagged ? "ring-2 ring-red-200" : ""}`}
                style={{ borderColor: flagged ? "#fecaca" : "#e2e8f3" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {listing.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={listing.imageUrl} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ background: "rgba(146,238,232,0.2)" }}>
                        {categoryEmoji[listing.category] || "📦"}
                      </div>
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold" style={{ color: "#0f1729" }}>{listing.title}</h3>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "rgba(42,123,217,0.1)", color: "#2a7bd9" }}>
                          {listing.id}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ color: st.color, background: st.bg }}
                        >
                          {flagged && "🚩"}
                          {listing.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>
                        Provider: <span className="font-semibold" style={{ color: "#0f1729" }}>{listing.provider.name}</span>
                      </p>
                      <p className="text-sm" style={{ color: "#5a6b85" }}>
                        📍 {listing.location} ·{" "}
                        <span className="font-semibold" style={{ color: "#16a34a" }}>
                          {formatVnd(listing.price)}/ngày
                        </span>
                      </p>
                      {listing.openFlagsCount > 0 && listing.latestFlag && (
                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                              {listing.openFlagsCount}
                            </span>
                            <span className="text-sm font-semibold text-red-700">Flag Reason:</span>
                          </div>
                          <p className="text-sm text-red-600">{listing.latestFlag.reason}</p>
                          <p className="mt-1 text-xs text-red-400">Reported: {formatDate(listing.latestFlag.createdAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenFlagsFor(listing.id)}
                      className="rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]"
                      style={{ borderColor: "#e2e8f3", color: "#5a6b85" }}
                    >
                      Xem báo cáo
                    </button>
                    <a
                      href={`/listings/${listing.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]"
                      style={{ borderColor: "#e2e8f3", color: "#5a6b85" }}
                    >
                      Xem tin
                    </a>
                    {actionButtons(listing).map((btn) => (
                      <button
                        key={btn.action}
                        type="button"
                        onClick={() => setTarget({ listing, action: btn.action })}
                        className={btn.className}
                        style={btn.style}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        title={
          target
            ? `${target.action === "REMOVE" ? "Gỡ" : target.action === "HIDE" ? "Ẩn" : target.action === "KEEP" ? "Giữ" : "Khôi phục"} tin "${target.listing.title}"?`
            : ""
        }
        confirmLabel={target ? ACTION_LABEL[target.action].replace(/^./, (c) => c.toUpperCase()) : "Xác nhận"}
        tone={target?.action === "REMOVE" ? "danger" : "default"}
        requireReason={target?.action === "HIDE" || target?.action === "REMOVE"}
        optionalReason={target?.action === "KEEP" || target?.action === "RESTORE"}
        pending={moderate.isPending}
        onConfirm={onConfirm}
      />

      <Dialog open={openFlagsFor !== null} onOpenChange={(o) => !o && setOpenFlagsFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Báo cáo vi phạm</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {flagsLoading && <Skeleton className="h-20 w-full" />}
            {!flagsLoading && (flags?.length ?? 0) === 0 && (
              <p className="text-sm text-slate-500">Không có báo cáo.</p>
            )}
            {(flags ?? []).map((f) => (
              <div key={f.id} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{f.reason}</span>
                  {f.source === "SYSTEM" && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">AI</span>
                  )}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{f.status}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {f.reporter?.name ?? "Hệ thống"} · {formatDateTime(f.createdAt)}
                </p>
                {f.resolvedBy && (
                  <p className="mt-1 text-xs text-slate-500">
                    Xử lý bởi {f.resolvedBy.name}
                    {f.resolutionNote ? `: ${f.resolutionNote}` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {toast.node}
    </div>
  );
}
