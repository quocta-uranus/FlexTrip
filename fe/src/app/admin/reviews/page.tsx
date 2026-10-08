"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { useAdminToast } from "@/components/admin/use-admin-toast";
import {
  useAdminReviews,
  useModerateReview,
  useReanalyzeReview,
} from "@/hooks/admin/use-admin-reviews";
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

export default function AdminReviewsPage() {
  const [status, setStatus] = useState<ReviewStatus | "">("");
  const [rating, setRating] = useState<number | undefined>();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<AdminReview | null>(null);
  const [note, setNote] = useState("");
  const filters = useMemo(
    () => ({ status: status || undefined, rating, search, page }),
    [status, rating, search, page],
  );
  const { data, isLoading } = useAdminReviews(filters);
  const moderate = useModerateReview();
  const reanalyze = useReanalyzeReview();
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
  const reject = () => {
    if (!rejecting || !note.trim()) return;
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
        <h1 className="text-3xl font-bold text-slate-900">
          Kiểm duyệt đánh giá
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Xem tín hiệu AI, duyệt nội dung hợp lệ hoặc loại review vi phạm.
        </p>
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_160px]">
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
      </div>

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
            {!!review.displayReasons.length && (
              <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-3 text-xs text-violet-700">
                {review.displayReasons.join(" · ")}
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              {review.status !== "PUBLISHED" &&
                review.status !== "REJECTED" && (
                  <button
                    onClick={() => approve(review)}
                    disabled={moderate.isPending}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Duyệt
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

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              Lý do từ chối đánh giá
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Traveler sẽ nhận được nội dung này.
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
                  setNote("");
                }}
                className="rounded-full border px-4 py-2 text-sm"
              >
                Hủy
              </button>
              <button
                onClick={reject}
                disabled={!note.trim() || moderate.isPending}
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
