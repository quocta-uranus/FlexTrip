"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { useAdminToast } from "@/components/admin/use-admin-toast";
import { EmptyState } from "@/components/empty-state";
import { LiveDot } from "@/components/profile/wow";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { usePromoBudgets, useSavePromoBudget } from "@/hooks/admin/use-admin-vouchers";
import { budgetSchema } from "@/lib/validators/voucher.schema";
import type { PromoBudget } from "@/types/voucher";

const vnd = (n: number) => `${n.toLocaleString("vi-VN")} ₫`;

function BudgetDialog({ budget, open, onOpenChange, onDone, onError }: {
  budget: PromoBudget | null; open: boolean; onOpenChange: (o: boolean) => void;
  onDone: (msg: string) => void; onError: (e: unknown) => void;
}) {
  const save = useSavePromoBudget();
  const [name, setName] = useState(budget?.name ?? "");
  const [total, setTotal] = useState(budget ? String(budget.totalAmount) : "");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = budgetSchema.safeParse({ name, totalAmount: total });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setError(null);
    save.mutate({ id: budget?.id, ...parsed.data }, {
      onSuccess: () => { onDone(budget ? "Đã cập nhật ngân sách" : "Đã tạo ngân sách"); onOpenChange(false); },
      onError,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[200] bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{budget ? "Sửa ngân sách" : "Tạo ngân sách khuyến mãi"}</DialogTitle>
          <DialogDescription>Ngân sách này tách biệt với doanh thu: giảm giá do nền tảng chịu, không đổi tỉ lệ chia 90/10.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="budget-name">Tên</Label>
            <Input id="budget-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="budget-total">Tổng ngân sách (₫)</Label>
            <Input id="budget-total" type="number" min={1} value={total} onChange={(e) => setTotal(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>Huỷ</Button>
            <Button type="submit" disabled={save.isPending} className="bg-[#2a7bd9] text-white hover:bg-[#1e5aa8]">
              {save.isPending ? "Đang lưu…" : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PromoBudgetsPage() {
  const toast = useAdminToast();
  const { data: budgets, isLoading } = usePromoBudgets();
  const save = useSavePromoBudget();
  const [editing, setEditing] = useState<PromoBudget | null>(null);
  const [open, setOpen] = useState(false);

  const openDialog = (b: PromoBudget | null) => { setEditing(b); setOpen(true); };

  return (
    <div className="p-8">
      {toast.node}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1"><LiveDot label="KHUYẾN MÃI" tone="blue" /></div>
          <h1 className="text-3xl font-bold text-[#0f1729]">Ngân sách khuyến mãi</h1>
          <p className="mt-1 text-sm text-[#5a6b85]">Mỗi voucher trừ vào một ngân sách; hết ngân sách thì voucher ngừng áp dụng.</p>
        </div>
        <Button onClick={() => openDialog(null)} className="h-10 gap-2 rounded-xl bg-[#2a7bd9] px-4 font-semibold text-white hover:bg-[#1e5aa8]">
          <Plus className="size-4" /> Tạo ngân sách
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : (budgets?.length ?? 0) === 0 ? (
        <EmptyState icon={Wallet} title="Chưa có ngân sách" description="Tạo ngân sách trước khi tạo voucher." />
      ) : (
        <ul className="space-y-3">
          {budgets?.map((b) => {
            const used = b.totalAmount > 0 ? Math.min(((b.spentAmount + b.reservedAmount) / b.totalAmount) * 100, 100) : 0;
            return (
              <li key={b.id} className="rounded-2xl border border-[#e2e8f3] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#0f1729]">{b.name} {!b.isActive && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">Đã tắt</span>}</p>
                    <p className="text-xs text-[#8694ad]">{b.voucherCount} voucher</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={save.isPending}
                      onClick={() => save.mutate({ id: b.id, isActive: !b.isActive }, { onSuccess: () => toast.success(b.isActive ? "Đã tắt ngân sách" : "Đã bật ngân sách"), onError: toast.error })}>
                      {b.isActive ? "Tắt" : "Bật"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDialog(b)}>Sửa</Button>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(used)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-[#2a7bd9]" style={{ width: `${used}%` }} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  {[["Tổng", b.totalAmount], ["Đã chi", b.spentAmount], ["Đang giữ chỗ", b.reservedAmount], ["Còn lại", b.remainingAmount]].map(([label, value]) => (
                    <div key={label as string}><dt className="text-xs text-[#8694ad]">{label}</dt><dd className="font-semibold text-[#0f1729]">{vnd(value as number)}</dd></div>
                  ))}
                </dl>
              </li>
            );
          })}
        </ul>
      )}

      <BudgetDialog key={`${editing?.id ?? "new"}-${open}`} budget={editing} open={open} onOpenChange={setOpen} onDone={toast.success} onError={toast.error} />
    </div>
  );
}
