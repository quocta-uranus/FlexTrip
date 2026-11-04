"use client";

import { useState } from "react";
import { CalendarClock, Download, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminToast } from "@/components/admin/use-admin-toast";
import { EmptyState } from "@/components/empty-state";
import { LiveDot } from "@/components/profile/wow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteSchedule, useExportReport, useReportSchedules, useRunSchedule, useToggleSchedule,
} from "@/hooks/admin/use-admin-reports";
import { formatDateTime } from "@/lib/format";
import { exportReportSchema, type ExportReportInput } from "@/lib/validators/support.schema";
import type { ReportSchedule } from "@/types/admin";
import { ScheduleFormDialog } from "./_components/schedule-form-dialog";
import { FREQUENCY_LABELS, REPORT_TYPE_LABELS } from "./report-labels";

const vnDay = (offset: number) => new Date(Date.now() + 7 * 3600_000 - offset * 24 * 3600_000).toISOString().slice(0, 10);
const SELECT_CLASS = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2a7bd9]";

export default function ReportsPage() {
  const toast = useAdminToast();
  const exportReport = useExportReport();
  const { data: schedules, isLoading } = useReportSchedules();
  const toggle = useToggleSchedule();
  const run = useRunSchedule();
  const remove = useDeleteSchedule();
  const [editing, setEditing] = useState<ReportSchedule | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ReportSchedule | null>(null);

  const form = useForm<ExportReportInput>({
    resolver: zodResolver(exportReportSchema),
    defaultValues: { type: "REVENUE", from: vnDay(29), to: vnDay(0) },
  });
  const { errors } = form.formState;

  const onExport = form.handleSubmit((values) =>
    exportReport.mutate(values, { onSuccess: () => toast.success("Đã xuất báo cáo"), onError: toast.error }),
  );

  return (
    <div className="p-8">
      {toast.node}
      <div className="mb-8">
        <div className="mb-1"><LiveDot label="REPORTS" tone="blue" /></div>
        <h1 className="text-3xl font-bold text-[#0f1729]">Báo cáo kinh doanh</h1>
        <p className="mt-1 text-sm text-[#5a6b85]">Xuất báo cáo doanh thu, booking, hoa hồng và lên lịch gửi tự động qua email</p>
      </div>

      <section className="mb-10 rounded-2xl border border-[#e2e8f3] bg-white p-6">
        <h2 className="mb-4 font-bold text-[#0f1729]">Xuất báo cáo theo khoảng thời gian</h2>
        <form onSubmit={onExport} className="grid gap-4 sm:grid-cols-4 sm:items-start">
          <div className="space-y-1.5">
            <Label htmlFor="rp-type">Loại báo cáo</Label>
            <select id="rp-type" className={SELECT_CLASS} {...form.register("type")}>
              {Object.entries(REPORT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-from">Từ ngày</Label>
            <Input id="rp-from" type="date" aria-invalid={!!errors.from} {...form.register("from")} />
            {errors.from && <p className="text-xs font-medium text-red-600">{errors.from.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-to">Đến ngày</Label>
            <Input id="rp-to" type="date" aria-invalid={!!errors.to} {...form.register("to")} />
            {errors.to && <p className="text-xs font-medium text-red-600">{errors.to.message}</p>}
          </div>
          <Button type="submit" disabled={exportReport.isPending} className="h-10 gap-2 self-end rounded-xl bg-[#2a7bd9] font-semibold text-white hover:bg-[#1e5aa8]">
            <Download className="size-4" /> {exportReport.isPending ? "Đang xuất…" : "Xuất CSV"}
          </Button>
        </form>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-[#0f1729]">Lịch gửi báo cáo định kỳ</h2>
            <p className="text-sm text-[#5a6b85]">Hàng tuần gửi 7 ngày gần nhất; hàng tháng gửi tháng trước. Gửi lúc 08:00 giờ Việt Nam.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="size-4" /> Tạo lịch
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : (schedules?.length ?? 0) === 0 ? (
          <EmptyState icon={CalendarClock} title="Chưa có lịch gửi nào" description="Tạo lịch để nhận báo cáo đều đặn qua email." />
        ) : (
          <ul className="divide-y divide-[#e2e8f3] overflow-hidden rounded-2xl border border-[#e2e8f3] bg-white">
            {schedules?.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[#0f1729]">{s.name}</p>
                    <span className="rounded-full bg-[#f1f5fa] px-2.5 py-1 text-xs font-semibold text-[#5a6b85]">
                      {REPORT_TYPE_LABELS[s.type]} · {FREQUENCY_LABELS[s.frequency].short}
                    </span>
                    {!s.isActive && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">Đang tạm dừng</span>}
                  </div>
                  <p className="mt-1 truncate text-sm text-[#5a6b85]">{s.recipients.join(", ")}</p>
                  <p className="mt-0.5 text-xs text-[#8694ad]">
                    Lần gửi tới: {s.isActive ? formatDateTime(s.nextRunAt) : "—"}
                    {s.lastRunAt && ` · Gần nhất: ${formatDateTime(s.lastRunAt)}`}
                  </p>
                  {s.lastError && <p className="mt-0.5 text-xs font-medium text-red-600">Lần gửi gần nhất lỗi: {s.lastError}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" disabled={run.isPending}
                    onClick={() => run.mutate(s.id, {
                      onSuccess: (r) => (r.sent ? toast.success("Đã gửi báo cáo thử") : toast.error(new Error("Gửi email thất bại"))),
                      onError: toast.error,
                    })}>
                    Gửi ngay
                  </Button>
                  <Button variant="outline" size="sm" disabled={toggle.isPending}
                    onClick={() => toggle.mutate({ id: s.id, isActive: !s.isActive }, { onError: toast.error })}>
                    {s.isActive ? "Tạm dừng" : "Tiếp tục"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setEditing(s); setDialogOpen(true); }}>Sửa</Button>
                  <Button variant="destructive" size="sm" onClick={() => setToDelete(s)}>Xoá</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ScheduleFormDialog open={dialogOpen} onOpenChange={setDialogOpen} schedule={editing} onSuccess={toast.success} onError={toast.error} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Xoá lịch gửi này?"
        description={toDelete?.name}
        confirmLabel="Xoá"
        tone="danger"
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, {
          onSuccess: () => { toast.success("Đã xoá lịch gửi"); setToDelete(null); },
          onError: toast.error,
        })}
      />
    </div>
  );
}
