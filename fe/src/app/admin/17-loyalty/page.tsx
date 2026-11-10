"use client";

import { useState } from "react";
import { Gift, Plus } from "lucide-react";
import { useAdminToast } from "@/components/admin/use-admin-toast";
import { EmptyState } from "@/components/empty-state";
import { LiveDot } from "@/components/profile/wow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminRewards, useLoyaltyStats, useSaveReward } from "@/hooks/admin/use-admin-loyalty";
import { useRunIncentives, useTopRatedProviders } from "@/hooks/useProviderIncentive";
import { RewardFormDialog } from "./_reward-form-dialog";

export default function LoyaltyAdminPage() {
  const toast = useAdminToast();
  const { data: stats } = useLoyaltyStats();
  const { data: rewards, isLoading } = useAdminRewards();
  const save = useSaveReward();
  const { data: topRated } = useTopRatedProviders();
  const runIncentives = useRunIncentives();
  const [open, setOpen] = useState(false);

  const statCards = [
    ["Điểm đã phát hành", stats?.pointsIssued],
    ["Điểm đã đổi", stats?.pointsRedeemed],
    ["Điểm đang nắm giữ", stats?.pointsOutstanding],
    ["Voucher đã đổi", stats?.vouchersIssued],
  ] as const;

  return (
    <div className="p-8">
      {toast.node}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1"><LiveDot label="KHÁCH HÀNG THÂN THIẾT" tone="blue" /></div>
          <h1 className="text-3xl font-bold text-[#0f1729]">Điểm thưởng</h1>
          <p className="mt-1 text-sm text-[#5a6b85]">
            Điểm mỗi đơn chỉnh ở <a className="font-semibold text-[#2a7bd9] underline" href="/admin/08-ai-config">Cấu hình</a>; voucher đổi điểm trừ vào ngân sách &quot;Đổi điểm thưởng&quot; (nạp ở trang Ngân sách khuyến mãi).
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="h-10 gap-2 rounded-xl bg-[#2a7bd9] px-4 font-semibold text-white hover:bg-[#1e5aa8]">
          <Plus className="size-4" /> Thêm mốc đổi
        </Button>
      </div>

      <dl className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#e2e8f3] bg-white p-4">
            <dt className="text-xs text-[#8694ad]">{label}</dt>
            <dd className="mt-1 text-2xl font-bold text-[#0f1729]">{(value ?? 0).toLocaleString("vi-VN")}</dd>
          </div>
        ))}
      </dl>

      {isLoading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (rewards?.length ?? 0) === 0 ? (
        <EmptyState icon={Gift} title="Chưa có mốc đổi thưởng" description="Ví dụ: 10 điểm đổi voucher 20.000 ₫." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#e2e8f3] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#e2e8f3] text-xs uppercase text-[#8694ad]">
              <tr>{["Tên", "Điểm cần", "Voucher", "Hạn dùng", "Trạng thái", ""].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f3]">
              {rewards?.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-semibold text-[#0f1729]">{r.name}</td>
                  <td className="px-4 py-3">{r.pointsCost}</td>
                  <td className="px-4 py-3">{r.voucherType === "FIXED" ? `${Number(r.voucherValue).toLocaleString("vi-VN")} ₫` : `${Number(r.voucherValue)}% (tối đa ${Number(r.maxDiscount).toLocaleString("vi-VN")} ₫)`}</td>
                  <td className="px-4 py-3">{r.validDays} ngày</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{r.isActive ? "Đang bật" : "Đã tắt"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" disabled={save.isPending}
                      onClick={() => save.mutate({ id: r.id, isActive: !r.isActive }, { onSuccess: () => toast.success(r.isActive ? "Đã tắt mốc" : "Đã bật mốc"), onError: toast.error })}>
                      {r.isActive ? "Tắt" : "Bật"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#0f1729]">Provider top-rated</h2>
            <p className="text-sm text-[#5a6b85]">Tự tính lúc 03:00 mỗi đêm; ngưỡng điểm và mức giảm phí chỉnh ở trang Cấu hình.</p>
          </div>
          <Button variant="outline" disabled={runIncentives.isPending}
            onClick={() => runIncentives.mutate(undefined, { onSuccess: (r) => toast.success(`Đã tính ${r.processed} provider, ${r.topRated} đạt top-rated${r.failed ? `, ${r.failed} lỗi` : ""}`), onError: toast.error })}>
            {runIncentives.isPending ? "Đang tính…" : "Tính lại ngay"}
          </Button>
        </div>
        {(topRated?.length ?? 0) === 0 ? (
          <p className="text-sm text-[#8694ad]">Chưa có provider nào đạt top-rated.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#e2e8f3] bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e2e8f3] text-xs uppercase text-[#8694ad]">
                <tr>{["Provider", "Điểm", "Giảm phí", "Hiệu lực đến"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f3]">
                {topRated?.map((p) => (
                  <tr key={p.providerId}>
                    <td className="px-4 py-3"><p className="font-semibold text-[#0f1729]">{p.name}</p><p className="text-xs text-[#8694ad]">{p.email}</p></td>
                    <td className="px-4 py-3">{p.score}</td>
                    <td className="px-4 py-3">{p.feeDiscountPct}% điểm</td>
                    <td className="px-4 py-3">{new Date(p.validUntil).toLocaleString("vi-VN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <RewardFormDialog open={open} onOpenChange={setOpen} onSuccess={toast.success} onError={toast.error} />
    </div>
  );
}
