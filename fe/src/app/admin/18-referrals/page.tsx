"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LiveDot } from "@/components/profile/wow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminReferrals } from "@/hooks/admin/use-admin-referrals";
import type { ReferralStatus } from "@/types/referral";

const FILTERS: { value: ReferralStatus | undefined; label: string }[] = [
  { value: undefined, label: "Tất cả" },
  { value: "REGISTERED", label: "Chờ đơn đầu" },
  { value: "REWARDED", label: "Đã thưởng" },
  { value: "REJECTED", label: "Nghi gian lận / vượt hạn mức" },
];
const REASON: Record<string, string> = {
  SAME_PHONE: "Trùng số điện thoại",
  SAME_EMAIL: "Cùng hộp thư",
  SELF: "Tự giới thiệu",
  CAP_REACHED: "Vượt hạn mức tháng",
};

export default function ReferralsAdminPage() {
  const [status, setStatus] = useState<ReferralStatus | undefined>();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminReferrals(page, status);

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="mb-1"><LiveDot label="KHÁCH HÀNG THÂN THIẾT" tone="blue" /></div>
        <h1 className="text-3xl font-bold text-[#0f1729]">Giới thiệu bạn bè</h1>
        <p className="mt-1 text-sm text-[#5a6b85]">Mức thưởng chỉnh ở trang Cấu hình; voucher thưởng trừ vào ngân sách &quot;Thưởng giới thiệu&quot; (nạp ở trang Ngân sách khuyến mãi).</p>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f.label} size="sm" variant={status === f.value ? "default" : "outline"} onClick={() => { setStatus(f.value); setPage(1); }}>{f.label}</Button>
        ))}
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : (data?.items.length ?? 0) === 0 ? (
        <EmptyState icon={Users} title="Chưa có lượt giới thiệu" description="Lượt giới thiệu sẽ xuất hiện khi có người đăng ký bằng mã." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#e2e8f3] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#e2e8f3] text-xs uppercase text-[#8694ad]">
              <tr>{["Người giới thiệu", "Người được giới thiệu", "Mã", "Trạng thái", "Ngày"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f3]">
              {data?.items.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3"><p className="font-semibold text-[#0f1729]">{r.referrer.name}</p><p className="text-xs text-[#8694ad]">{r.referrer.email}</p></td>
                  <td className="px-4 py-3"><p className="font-semibold text-[#0f1729]">{r.referee.name}</p><p className="text-xs text-[#8694ad]">{r.referee.email}</p></td>
                  <td className="px-4 py-3 font-mono">{r.code}</td>
                  <td className="px-4 py-3">
                    {r.status}{r.rejectReason && <span className="block text-xs text-red-600">{REASON[r.rejectReason] ?? r.rejectReason}</span>}
                  </td>
                  <td className="px-4 py-3">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-3 text-sm">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
          <span>{page} / {data.totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Sau</Button>
        </div>
      )}
    </div>
  );
}
