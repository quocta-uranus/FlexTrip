"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/use-admin-toast";
import {
  useAddModerationTerm,
  useModerationTerms,
  useRemoveModerationTerm,
  useTestModerationText,
  useToggleBuiltInTerm,
} from "@/hooks/admin/use-admin-moderation-terms";
import type { ModerationTermCategory } from "@/types/admin";

const CATEGORY_LABEL: Record<ModerationTermCategory, string> = {
  PROFANITY: "Tục tĩu",
  INSULT: "Xúc phạm",
  THREAT: "Đe dọa",
};
const CATEGORY_STYLE: Record<ModerationTermCategory, string> = {
  PROFANITY: "bg-red-50 text-red-700",
  INSULT: "bg-amber-50 text-amber-700",
  THREAT: "bg-violet-50 text-violet-700",
};
const CATEGORIES = Object.keys(CATEGORY_LABEL) as ModerationTermCategory[];

export default function ModerationTermsPage() {
  const { data, isLoading } = useModerationTerms();
  const add = useAddModerationTerm();
  const remove = useRemoveModerationTerm();
  const toggle = useToggleBuiltInTerm();
  const test = useTestModerationText();
  const toast = useAdminToast();

  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<ModerationTermCategory>("INSULT");
  const [filter, setFilter] = useState("");
  const [sample, setSample] = useState("");

  const builtIn = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return (data?.builtIn ?? []).filter(
      (item) => !needle || item.term.toLowerCase().includes(needle),
    );
  }, [data, filter]);

  const submit = () => {
    if (!term.trim()) return;
    add.mutate(
      { term: term.trim(), category },
      {
        onSuccess: () => {
          setTerm("");
          toast.success("Đã thêm từ, có hiệu lực ngay");
        },
        onError: toast.error,
      },
    );
  };

  return (
    <div className="p-8">
      <Link href="/admin/reviews" className="text-sm font-semibold text-violet-700">
        ← Kiểm duyệt đánh giá
      </Link>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Từ điển kiểm duyệt</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">
        Từ khớp theo nguyên từ, có hiệu lực ngay cho cả đánh giá và phản hồi của Provider. Chỉ thêm
        cụm từ rõ nghĩa: hệ thống từ chối từ ngắn, từ đã có và từ sẽ chặn nhầm câu bình thường về
        thuê đồ.
      </p>

      <section className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_180px_auto]">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          maxLength={60}
          placeholder="Từ hoặc cụm từ cần chặn, ví dụ: đồ ngu dốt"
          aria-label="Từ cần thêm"
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ModerationTermCategory)}
          aria-label="Nhóm"
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        >
          {CATEGORIES.map((key) => (
            <option key={key} value={key}>
              {CATEGORY_LABEL[key]}
            </option>
          ))}
        </select>
        <button
          onClick={submit}
          disabled={!term.trim() || add.isPending}
          className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Thêm từ
        </button>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-bold text-slate-900">Thử một câu</h2>
        <p className="mt-1 text-xs text-slate-500">Chạy thử với từ điển hiện tại, không lưu gì.</p>
        <div className="mt-3 flex flex-col gap-3 md:flex-row">
          <input
            value={sample}
            onChange={(e) => setSample(e.target.value)}
            maxLength={2000}
            placeholder="Nhập câu cần thử"
            aria-label="Câu cần thử"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <button
            onClick={() => sample.trim() && test.mutate(sample, { onError: toast.error })}
            disabled={!sample.trim() || test.isPending}
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Thử
          </button>
        </div>
        {test.data && (
          <p
            className={`mt-3 rounded-xl px-3 py-2 text-sm ${
              test.data.flagged ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {test.data.flagged
              ? `Sẽ bị giữ lại: ${test.data.reasons.map((r) => r.replace(/^\[RULE\]\s*/, "")).join(" ")}`
              : "Câu này được đăng bình thường."}
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-base font-bold text-slate-900">
          Từ do admin thêm {data ? `(${data.custom.length})` : ""}
        </h2>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white">
          {isLoading && <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />}
          {data && data.custom.length === 0 && (
            <p className="p-4 text-sm text-slate-500">Chưa có từ nào được thêm.</p>
          )}
          <ul className="divide-y divide-slate-100">
            {data?.custom.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800">{item.term}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_STYLE[item.category]}`}>
                    {CATEGORY_LABEL[item.category]}
                  </span>
                </div>
                <button
                  onClick={() =>
                    remove.mutate(item.id, {
                      onSuccess: () => toast.success("Đã xóa từ"),
                      onError: toast.error,
                    })
                  }
                  disabled={remove.isPending}
                  className="text-sm font-semibold text-red-600 disabled:opacity-50"
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">
            Từ có sẵn {data ? `(${data.builtIn.length})` : ""}
          </h2>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Lọc danh sách"
            aria-label="Lọc từ có sẵn"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Tắt một từ khi nó chặn nhầm. Từ bị tắt không còn tác dụng và có thể bật lại bất cứ lúc nào.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {builtIn.map((item) => (
            <li
              key={`${item.category}:${item.term}`}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                item.disabled ? "border-slate-200 bg-slate-50 text-slate-400" : "border-slate-200 bg-white"
              }`}
            >
              <div className="min-w-0">
                <p className={`truncate font-medium ${item.disabled ? "line-through" : "text-slate-800"}`}>
                  {item.term}
                </p>
                <p className="text-[11px] text-slate-500">{CATEGORY_LABEL[item.category]}</p>
              </div>
              <button
                onClick={() =>
                  toggle.mutate(
                    { term: item.term, category: item.category, disabled: !item.disabled },
                    {
                      onSuccess: () =>
                        toast.success(item.disabled ? "Đã bật lại từ" : "Đã tắt từ"),
                      onError: toast.error,
                    },
                  )
                }
                disabled={toggle.isPending}
                className="shrink-0 text-xs font-semibold text-violet-700 disabled:opacity-50"
              >
                {item.disabled ? "Bật lại" : "Tắt"}
              </button>
            </li>
          ))}
        </ul>
      </section>
      {toast.node}
    </div>
  );
}
