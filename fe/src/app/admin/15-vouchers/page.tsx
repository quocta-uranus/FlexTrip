"use client";

import { useState } from "react";
import { Plus, Ticket } from "lucide-react";
import { useAdminToast } from "@/components/admin/use-admin-toast";
import { EmptyState } from "@/components/empty-state";
import { LiveDot } from "@/components/profile/wow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminVouchers, useUpdateVoucher } from "@/hooks/admin/use-admin-vouchers";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { VOUCHER_STATUS_LABELS, type VoucherStatus } from "@/types/voucher";
import { VoucherFormDialog } from "./_voucher-form-dialog";

const STATUS_STYLE: Record<VoucherStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PAUSED: "bg-amber-50 text-amber-700",
  EXPIRED: "bg-red-50 text-red-600",
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");

export default function VouchersPage() {
  const toast = useAdminToast();
  const [status, setStatus] = useState<VoucherStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(search, 300);
  const { data, isLoading } = useAdminVouchers({ status: status || undefined, search: debounced || undefined, page });
  const update = useUpdateVoucher();

  const toggle = (id: string, next: VoucherStatus) =>
    update.mutate({ id, status: next }, { onSuccess: () => toast.success("Đã cập nhật trạng thái"), onError: toast.error });

  return (
    <div className="p-8">
      {toast.node}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1"><LiveDot label="KHUYẾN MÃI" tone="blue" /></div>
          <h1 className="text-3xl font-bold text-[#0f1729]">Voucher</h1>
          <p className="mt-1 text-sm text-[#5a6b85]">Tạo và quản lý mã giảm giá cho Traveler</p>
        </div>
        <Button onClick={() => setOpen(true)} className="h-10 gap-2 rounded-xl bg-[#2a7bd9] px-4 font-semibold text-white hover:bg-[#1e5aa8]">
          <Plus className="size-4" /> Tạo voucher
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm theo mã hoặc tên" aria-label="Tìm voucher" className="max-w-xs" />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as VoucherStatus | ""); setPage(1); }}
          aria-label="Lọc trạng thái"
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2a7bd9]"
        >
          <option value="">Mọi trạng thái</option>
          {Object.entries(VOUCHER_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState icon={Ticket} title="Chưa có voucher" description="Tạo ngân sách khuyến mãi rồi thêm voucher đầu tiên." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#e2e8f3] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#e2e8f3] text-xs uppercase text-[#8694ad]">
              <tr>{["Mã", "Giảm", "Thời hạn", "Đã dùng", "Ngân sách", "Trạng thái", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f3]">
              {data?.items.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3"><p className="font-mono font-bold text-[#0f1729]">{v.code}</p><p className="text-xs text-[#8694ad]">{v.name}</p></td>
                  <td className="px-4 py-3">{v.type === "PERCENT" ? `${Number(v.value)}%` : `${Number(v.value).toLocaleString("vi-VN")} ₫`}</td>
                  <td className="px-4 py-3 text-xs text-[#5a6b85]">{fmt(v.startsAt)} → {fmt(v.endsAt)}</td>
                  <td className="px-4 py-3">{v.usedCount}{v.totalQuota ? ` / ${v.totalQuota}` : ""}</td>
                  <td className="px-4 py-3 text-xs text-[#5a6b85]">{v.budget.name}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[v.status]}`}>{VOUCHER_STATUS_LABELS[v.status]}</span></td>
                  <td className="px-4 py-3 text-right">
                    {v.status === "ACTIVE" && <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => toggle(v.id, "PAUSED")}>Tạm dừng</Button>}
                    {(v.status === "PAUSED" || v.status === "DRAFT") && <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => toggle(v.id, "ACTIVE")}>Kích hoạt</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-3 text-sm">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
          <span className="text-[#5a6b85]">{page} / {data.totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Sau</Button>
        </div>
      )}

      <VoucherFormDialog open={open} onOpenChange={setOpen} onSuccess={toast.success} onError={toast.error} />
    </div>
  );
}
