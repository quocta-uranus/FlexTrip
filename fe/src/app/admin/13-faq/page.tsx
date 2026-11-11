"use client";

import { useState } from "react";
import { BookOpen, Plus, Sparkles } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminToast } from "@/components/admin/use-admin-toast";
import { EmptyState } from "@/components/empty-state";
import { LiveDot } from "@/components/profile/wow";
import { TicketCategoryBadge } from "@/components/support/ticket-parts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminFaqs, useDeleteFaq, useFaqSuggestions, useSaveFaq } from "@/hooks/admin/use-admin-support";
import type { AdminFaq } from "@/types/admin";
import { FaqFormDialog, type FaqDraft } from "./_components/faq-form-dialog";

export default function FaqManagementPage() {
  const toast = useAdminToast();
  const { data: faqs, isLoading } = useAdminFaqs();
  const [suggestOn, setSuggestOn] = useState(false);
  const suggestions = useFaqSuggestions(suggestOn);
  const save = useSaveFaq();
  const remove = useDeleteFaq();
  const [draft, setDraft] = useState<FaqDraft | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AdminFaq | null>(null);

  const openDialog = (d: FaqDraft | null) => { setDraft(d); setDialogOpen(true); };

  return (
    <div className="p-8">
      {toast.node}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1"><LiveDot label="KNOWLEDGE BASE" tone="blue" /></div>
          <h1 className="text-3xl font-bold text-[#0f1729]">Knowledge Base / FAQ</h1>
          <p className="mt-1 text-sm text-[#5a6b85]">Quản lý câu hỏi thường gặp hiển thị trong Trung tâm hỗ trợ</p>
        </div>
        <Button onClick={() => openDialog(null)} className="h-10 gap-2 rounded-xl bg-[#2a7bd9] px-4 font-semibold text-white hover:bg-[#1e5aa8]">
          <Plus className="size-4" /> Thêm FAQ
        </Button>
      </div>

      <section className="mb-8 rounded-2xl border border-[#bfdbfe] bg-[#f5faff] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-[#0f1729]"><Sparkles className="size-4 text-[#2a7bd9]" /> AI đề xuất cập nhật FAQ</h2>
            <p className="mt-0.5 text-sm text-[#5a6b85]">Gom các ticket lặp lại trong 60 ngày qua mà FAQ hiện tại chưa trả lời.</p>
          </div>
          <Button variant="outline" disabled={suggestions.isFetching} onClick={() => (suggestOn ? suggestions.refetch() : setSuggestOn(true))}>
            {suggestions.isFetching ? "Đang phân tích…" : suggestOn ? "Phân tích lại" : "Tìm đề xuất"}
          </Button>
        </div>
        {suggestOn && !suggestions.isFetching && (suggestions.data?.length ?? 0) === 0 && (
          <p className="mt-4 text-sm text-[#5a6b85]">Không có chủ đề lặp lại nào chưa được FAQ bao phủ.</p>
        )}
        <ul className="mt-4 space-y-3">
          {suggestions.data?.map((s) => (
            <li key={s.question} className="rounded-xl border border-[#e2e8f3] bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <TicketCategoryBadge category={s.category} />
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{s.ticketCount} ticket lặp lại</span>
                <span className="text-xs text-[#8694ad]">{s.source === "AI" ? "AI soạn" : "Soạn theo mẫu"}</span>
              </div>
              <p className="mt-2 font-semibold text-[#0f1729]">{s.question}</p>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-[#5a6b85]">{s.answer || "Chưa có câu trả lời mẫu — hãy bổ sung trước khi xuất bản."}</p>
              <Button size="sm" className="mt-3 bg-[#2a7bd9] text-white hover:bg-[#1e5aa8]"
                onClick={() => openDialog({ question: s.question, answer: s.answer, category: s.category, isPublished: !!s.answer })}>
                Dùng đề xuất này
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (faqs?.length ?? 0) === 0 ? (
        <EmptyState icon={BookOpen} title="Chưa có FAQ" description="Thêm câu hỏi đầu tiên hoặc dùng đề xuất của AI." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f3] bg-white">
          <ul className="divide-y divide-[#e2e8f3]">
            {faqs?.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#0f1729]">{f.question}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-[#5a6b85]">{f.answer}</p>
                  <div className="mt-2"><TicketCategoryBadge category={f.category} /></div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#5a6b85]">
                    <input type="checkbox" className="size-4 accent-[#2a7bd9]" checked={f.isPublished} disabled={save.isPending}
                      onChange={(e) => save.mutate({ id: f.id, question: f.question, answer: f.answer, category: f.category, isPublished: e.target.checked }, { onError: toast.error })} />
                    Xuất bản
                  </label>
                  <Button variant="outline" size="sm" onClick={() => openDialog(f)}>Sửa</Button>
                  <Button variant="destructive" size="sm" onClick={() => setToDelete(f)}>Xoá</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FaqFormDialog open={dialogOpen} onOpenChange={setDialogOpen} draft={draft} onSuccess={toast.success} onError={toast.error} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Xoá mục FAQ này?"
        description={toDelete?.question}
        confirmLabel="Xoá"
        tone="danger"
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, {
          onSuccess: () => { toast.success("Đã xoá FAQ"); setToDelete(null); },
          onError: toast.error,
        })}
      />
    </div>
  );
}
