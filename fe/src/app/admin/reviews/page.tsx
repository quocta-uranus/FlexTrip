"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Sparkles } from "lucide-react";
import { useAdminToast } from "@/components/admin/use-admin-toast";
import {
  useAdminReviewSummary,
  useAdminReviews,
  useBulkModerateReviews,
  useDismissReviewReports,
  useModerateReview,
  useReanalyzeReview,
} from "@/hooks/admin/use-admin-reviews";
import { REPORT_REASON_LABEL } from "@/types/review";
import type {
  AdminReview,
  ReviewAnalysisErrorCode,
  ReviewQueueStatus,
  ReviewStatus,
} from "@/types/admin";

const STATUS_LABEL: Record<ReviewStatus, string> = {
  PENDING: "Đang chờ kiểm duyệt",
  PUBLISHED: "Đã công khai",
  FLAGGED: "Đáng ngờ",
  REJECTED: "Đã từ chối",
};
const ANALYSIS_ERROR_LABEL: Record<ReviewAnalysisErrorCode, string> = {
  INVALID_AI_OUTPUT: "AI trả kết quả không hợp lệ",
  RATE_LIMITED: "Groq đang giới hạn lượt gọi",
  TIMEOUT: "AI phản hồi quá thời gian",
  GROQ_UNAVAILABLE: "Không thể kết nối Groq",
};
const STATUS_STYLE: Record<ReviewStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  FLAGGED: "bg-red-50 text-red-700",
  REJECTED: "bg-slate-100 text-slate-600",
};
const SENTIMENT_LABEL = {
  POSITIVE: "Tích cực",
  NEUTRAL: "Trung lập",
  NEGATIVE: "Tiêu cực",
  UNKNOWN: "Chưa phân tích",
};
const ANALYSIS_SOURCE_LABEL = {
  RULE: "Rule hệ thống",
  AI: "AI Groq",
  RULE_AND_AI: "Rule + AI",
  MODEL: "Model PhoBERT",
  RULE_AND_MODEL: "Rule + PhoBERT",
  ADMIN: "Admin",
};
const QUEUE_STATUS: Record<
  ReviewQueueStatus,
  { label: string; style: string }
> = {
  WAITING: { label: "Đang xếp hàng", style: "bg-blue-50 text-blue-700" },
  PROCESSING: {
    label: "AI đang phân tích",
    style: "bg-violet-50 text-violet-700",
  },
  RETRYING: { label: "Đang thử lại", style: "bg-orange-50 text-orange-700" },
  FAILED: { label: "Phân tích thất bại", style: "bg-red-50 text-red-700" },
  NOT_QUEUED: {
    label: "Chưa vào hàng đợi",
    style: "bg-slate-100 text-slate-600",
  },
};

const isSuspiciousPublic = (review: AdminReview) => review.suspiciousPublic;

type Quick = "" | "flagged" | "overdue" | "appealed" | "reported" | "suspicious";
type Sort = "newest" | "oldest";

const HOUR_MS = 3_600_000;
const selectable = (review: AdminReview) => review.status !== "REJECTED";

const waitingLabel = (review: AdminReview) => {
  if (!review.slaDueAt) return null;
  const hours = Math.ceil(
    (new Date(review.slaDueAt).getTime() - Date.now()) / HOUR_MS,
  );
  return hours > 0 ? `Hạn xử lý còn ${hours} giờ` : null;
};

export default function AdminReviewsPage() {
  const [status, setStatus] = useState<ReviewStatus | "">("");
  const [rating, setRating] = useState<number | undefined>();
  const [quick, setQuick] = useState<Quick>("");
  const [sort, setSort] = useState<Sort>("newest");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<AdminReview | null>(null);
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [note, setNote] = useState("");
  const filters = useMemo(
    () => ({
      status: quick === "flagged" ? ("FLAGGED" as const) : status || undefined,
      rating,
      appealed: quick === "appealed" ? true : undefined,
      reported: quick === "reported" ? true : undefined,
      suspicious: quick === "suspicious" ? true : undefined,
      overdue: quick === "overdue" ? true : undefined,
      sort,
      search,
      page,
    }),
    [status, rating, quick, sort, search, page],
  );
  const filtersKey = JSON.stringify(filters);
  // The selection belongs to one filtered page; changing filters or page drops it.
  const [selection, setSelection] = useState<{ key: string; ids: string[] }>({
    key: "",
    ids: [],
  });
  const selectedIds = selection.key === filtersKey ? selection.ids : [];
  const { data, isLoading } = useAdminReviews(filters);
  const { data: summary } = useAdminReviewSummary();
  const bulk = useBulkModerateReviews();
  const moderate = useModerateReview();
  const reanalyze = useReanalyzeReview();
  const dismissReports = useDismissReviewReports();
  const toast = useAdminToast();

  const approve = (review: AdminReview) =>
    moderate.mutate(
      {
        id: review.id,
        decision: "APPROVE",
        note: "Admin xác nhận review hợp lệ.",
      },
      {
        onSuccess: () => toast.success("Đã công khai đánh giá"),
        onError: toast.error,
      },
    );
  const pickQuick = (next: Quick) => {
    setQuick(next);
    // The reviews that have waited longest come first when working through the backlog.
    setSort(next === "flagged" || next === "overdue" ? "oldest" : "newest");
    setPage(1);
  };
  const toggleSelected = (id: string) =>
    setSelection({
      key: filtersKey,
      ids: selectedIds.includes(id)
        ? selectedIds.filter((value) => value !== id)
        : [...selectedIds, id],
    });
  const selectableIds = (data?.items ?? []).filter(selectable).map((r) => r.id);
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.includes(id));
  const runBulk = (decision: "APPROVE" | "REJECT", reason?: string) =>
    bulk.mutate(
      {
        ids: selectedIds,
        decision,
        note: decision === "APPROVE" ? "Admin xác nhận review hợp lệ." : reason,
      },
      {
        onSuccess: (result) => {
          setSelection({ key: filtersKey, ids: [] });
          setBulkRejecting(false);
          setNote("");
          if (result.failed.length)
            toast.error(
              new Error(
                `Đã xử lý ${result.succeeded.length}, ${result.failed.length} review không xử lý được: ${result.failed[0].message}`,
              ),
            );
          else toast.success(`Đã xử lý ${result.succeeded.length} đánh giá`);
        },
        onError: toast.error,
      },
    );
  const reject = () => {
    if (!note.trim()) return;
    if (bulkRejecting) return runBulk("REJECT", note.trim());
    if (!rejecting) return;
    moderate.mutate(
      { id: rejecting.id, decision: "REJECT", note: note.trim() },
      {
        onSuccess: () => {
          toast.success("Đã từ chối đánh giá");
          setRejecting(null);
          setNote("");
        },
        onError: toast.error,
      },
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            AI Moderation
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-slate-900">
            Kiểm duyệt đánh giá
          </h1>
          <Link
            href="/admin/reviews/terms"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Từ điển kiểm duyệt
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Xem tín hiệu AI, duyệt nội dung hợp lệ hoặc loại review vi phạm.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Nhóm cần xử lý">
        {(
          [
            ["", "Tất cả", undefined],
            ["flagged", "Chờ xử lý", summary?.flagged],
            ["overdue", "Quá hạn", summary?.overdue],
            ["appealed", "Có khiếu nại", summary?.appealed],
            ["reported", "Bị báo cáo", summary?.reported],
            ["suspicious", "Đã đăng, cần xem lại", summary?.suspicious],
          ] as const
        ).map(([value, label, count]) => {
          const active = quick === value;
          const urgent = value === "overdue" && (count ?? 0) > 0;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => pickQuick(value)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "border-violet-600 bg-violet-600 text-white"
                  : urgent
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {label}
              {count !== undefined && (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    active ? "bg-white/25" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-[1fr_200px_150px_150px]">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm nội dung, Traveler, Provider hoặc listing..."
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ReviewStatus | "");
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={rating ?? ""}
          onChange={(e) => {
            setRating(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        >
          <option value="">Tất cả số sao</option>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} sao
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as Sort);
            setPage(1);
          }}
          aria-label="Sắp xếp"
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        >
          <option value="newest">Mới nhất</option>
          <option value="oldest">Chờ lâu nhất</option>
        </select>
      </div>

      {selectableIds.length > 0 && (
        <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() =>
              setSelection({
                key: filtersKey,
                ids: allSelected ? [] : selectableIds,
              })
            }
            className="h-4 w-4 accent-violet-600"
          />
          Chọn tất cả trên trang này ({selectableIds.length})
        </label>
      )}

      <div className="space-y-4">
        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Đang tải đánh giá...
          </div>
        )}
        {!isLoading && !data?.items.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            Không có đánh giá phù hợp bộ lọc.
          </div>
        )}
        {data?.items.map((review) => (
          <article
            key={review.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {selectable(review) && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(review.id)}
                      onChange={() => toggleSelected(review.id)}
                      aria-label="Chọn đánh giá này"
                      className="h-4 w-4 accent-violet-600"
                    />
                  )}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[review.status]}`}
                  >
                    {STATUS_LABEL[review.status]}
                  </span>
                  {review.status === "PENDING" && review.queueStatus && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${QUEUE_STATUS[review.queueStatus].style}`}
                    >
                      {QUEUE_STATUS[review.queueStatus].label}
                    </span>
                  )}
                  {review.status === "PENDING" && review.analysisErrorCode && (
                    <span className="text-xs font-medium text-red-600">
                      {ANALYSIS_ERROR_LABEL[review.analysisErrorCode]}
                    </span>
                  )}
                  {review.analysisSource && (
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                      {ANALYSIS_SOURCE_LABEL[review.analysisSource]}
                    </span>
                  )}
                  {review.overdue ? (
                    <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
                      Quá hạn xử lý
                    </span>
                  ) : (
                    waitingLabel(review) && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {waitingLabel(review)}
                      </span>
                    )
                  )}
                  {review.appealedAt && (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      Có khiếu nại
                    </span>
                  )}
                  {isSuspiciousPublic(review) && (
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                      Đã đăng, cần xem lại
                    </span>
                  )}
                  {review.openReports.length > 0 && (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                      Bị báo cáo ({review.openReports.length})
                    </span>
                  )}
                  {review.editedAt && (
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      Đã chỉnh sửa
                    </span>
                  )}
                  <span className="text-amber-500">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(review.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {review.comment}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                  <span>
                    Traveler:{" "}
                    <b className="text-slate-700">{review.author.name}</b>
                  </span>
                  <span>
                    Provider:{" "}
                    <b className="text-slate-700">{review.target.name}</b>
                  </span>
                  <span>
                    Listing:{" "}
                    <b className="text-slate-700">
                      {review.listing?.title ?? "Đã xóa"}
                    </b>
                  </span>
                </div>
              </div>
              <div className="grid min-w-[280px] grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                {[
                  ["Spam", review.spamScore],
                  ["Độc hại", review.toxicityScore],
                  ["Đáng ngờ", review.suspicionScore],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <div className="text-lg font-bold text-slate-800">
                      {value ?? "—"}
                      <span className="text-xs font-normal">/100</span>
                    </div>
                    <div className="text-[11px] text-slate-500">{label}</div>
                  </div>
                ))}
                <div className="col-span-3 mt-1 border-t border-slate-200 pt-2 text-xs text-slate-500">
                  Cảm xúc: <b>{SENTIMENT_LABEL[review.sentiment]}</b>
                </div>
              </div>
            </div>
            {review.openReports.length > 0 && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <p className="font-semibold">Provider báo cáo đánh giá này</p>
                <ul className="mt-1 space-y-1">
                  {review.openReports.map((report) => (
                    <li key={report.id} className="leading-5">
                      <b>{report.reporter.name}</b> ·{" "}
                      {REPORT_REASON_LABEL[report.reason]} ·{" "}
                      {new Date(report.createdAt).toLocaleString("vi-VN")}
                      {report.details && (
                        <span className="block whitespace-pre-wrap text-red-700">
                          {report.details}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-red-600">
                  Chọn &quot;Từ chối&quot; để gỡ đánh giá (chấp nhận báo cáo) hoặc &quot;Bỏ qua báo cáo&quot; để giữ nguyên.
                </p>
              </div>
            )}
            {review.appealedAt && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <p className="font-semibold">
                  Traveler khiếu nại quyết định từ chối ·{" "}
                  {new Date(review.appealedAt).toLocaleString("vi-VN")}
                </p>
                <p className="mt-1 whitespace-pre-wrap leading-5">
                  {review.appealNote}
                </p>
                {review.moderationNote && review.status !== "PUBLISHED" && (
                  <p className="mt-2 text-amber-700">
                    Lý do từ chối trước đó: {review.moderationNote}
                  </p>
                )}
              </div>
            )}
            {!!review.displayReasons.length && (
              <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-3 text-xs text-violet-700">
                {review.displayReasons.join(" · ")}
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              {((review.status !== "PUBLISHED" &&
                review.status !== "REJECTED") ||
                isSuspiciousPublic(review)) && (
                <button
                  onClick={() => approve(review)}
                  disabled={moderate.isPending}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {review.status === "PUBLISHED" ? "Giữ nguyên" : "Duyệt"}
                </button>
              )}
              {review.openReports.length > 0 && (
                <button
                  onClick={() =>
                    dismissReports.mutate(
                      { id: review.id },
                      {
                        onSuccess: () => toast.success("Đã bỏ qua báo cáo"),
                        onError: toast.error,
                      },
                    )
                  }
                  disabled={dismissReports.isPending}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  Bỏ qua báo cáo
                </button>
              )}
              {review.status !== "REJECTED" && (
                <button
                  onClick={() => setRejecting(review)}
                  disabled={moderate.isPending}
                  className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
                >
                  Từ chối
                </button>
              )}
              <button
                onClick={() =>
                  reanalyze.mutate(review.id, {
                    onSuccess: (result) =>
                      toast.success(
                        result.queued
                          ? "Đã đưa vào hàng đợi phân tích"
                          : "Review đang chờ nhưng chưa thể thêm vào hàng đợi",
                      ),
                    onError: toast.error,
                  })
                }
                disabled={reanalyze.isPending}
                title="Yêu cầu AI Groq phân tích lại đánh giá"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reanalyze.isPending ? (
                  <LoaderCircle
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                {reanalyze.isPending
                  ? "AI đang phân tích…"
                  : "AI phân tích lại"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {(data?.totalPages ?? 0) > 1 && (
        <div className="mt-6 flex justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((v) => v - 1)}
            className="rounded-lg border px-4 py-2 disabled:opacity-40"
          >
            Trước
          </button>
          <span className="px-3 py-2 text-sm">
            {page}/{data?.totalPages}
          </span>
          <button
            disabled={page >= (data?.totalPages ?? 1)}
            onClick={() => setPage((v) => v + 1)}
            className="rounded-lg border px-4 py-2 disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="sticky bottom-4 z-40 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-white p-4 shadow-lg">
          <p className="text-sm font-semibold text-slate-800">
            Đã chọn {selectedIds.length} đánh giá
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelection({ key: filtersKey, ids: [] })}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Bỏ chọn
            </button>
            <button
              onClick={() => runBulk("APPROVE")}
              disabled={bulk.isPending}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Duyệt / giữ nguyên
            </button>
            <button
              onClick={() => setBulkRejecting(true)}
              disabled={bulk.isPending}
              className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
            >
              Từ chối
            </button>
          </div>
        </div>
      )}

      {(rejecting || bulkRejecting) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              {bulkRejecting
                ? `Lý do từ chối ${selectedIds.length} đánh giá`
                : "Lý do từ chối đánh giá"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {bulkRejecting
                ? "Mọi Traveler được chọn sẽ nhận cùng nội dung này."
                : "Traveler sẽ nhận được nội dung này."}
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={5}
              className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
              placeholder="Nhập lý do..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejecting(null);
                  setBulkRejecting(false);
                  setNote("");
                }}
                className="rounded-full border px-4 py-2 text-sm"
              >
                Hủy
              </button>
              <button
                onClick={reject}
                disabled={!note.trim() || moderate.isPending || bulk.isPending}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
