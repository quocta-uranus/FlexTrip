"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateVoucher, usePromoBudgets } from "@/hooks/admin/use-admin-vouchers";
import { createVoucherSchema, type CreateVoucherFormValues, type CreateVoucherInput } from "@/lib/validators/voucher.schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (msg: string) => void;
  onError: (err: unknown) => void;
}

const selectClass = "h-10 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 text-sm outline-none focus:border-[#2a7bd9]";

export function VoucherFormDialog({ open, onOpenChange, onSuccess, onError }: Props) {
  const create = useCreateVoucher();
  const { data: budgets } = usePromoBudgets();
  const form = useForm<CreateVoucherFormValues, unknown, CreateVoucherInput>({
    resolver: zodResolver(createVoucherSchema),
    defaultValues: { type: "FIXED", audience: "ALL", status: "ACTIVE", perUserLimit: 1, minOrderValue: 0 },
  });
  const { errors } = form.formState;
  const type = useWatch({ control: form.control, name: "type" });
  const audience = useWatch({ control: form.control, name: "audience" });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(values, {
      onSuccess: () => { onSuccess("Đã tạo voucher"); form.reset(); onOpenChange(false); },
      onError,
    });
  });

  const field = (name: keyof CreateVoucherFormValues, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`v-${name}`}>{label}</Label>
      <Input id={`v-${name}`} aria-invalid={!!errors[name]} {...props} {...form.register(name)} />
      {errors[name] && <p className="text-xs font-medium text-red-600">{String(errors[name]?.message)}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[200] max-h-[90vh] overflow-y-auto bg-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tạo voucher</DialogTitle>
          <DialogDescription>Giảm giá trừ vào tiền thuê trả sau, không trừ tiền cọc và không đổi phần Provider nhận.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("code", "Mã", { placeholder: "FLEX20K", className: "uppercase" })}
            {field("name", "Tên chương trình")}
            <div className="space-y-1.5">
              <Label htmlFor="v-type">Loại giảm</Label>
              <select id="v-type" className={selectClass} {...form.register("type")}>
                <option value="FIXED">Số tiền cố định (₫)</option>
                <option value="PERCENT">Phần trăm (%)</option>
              </select>
            </div>
            {field("value", type === "PERCENT" ? "Giá trị (%)" : "Giá trị (₫)", { type: "number", min: 1 })}
            {type === "PERCENT" && field("maxDiscount", "Giảm tối đa (₫)", { type: "number", min: 1 })}
            {field("minOrderValue", "Đơn tối thiểu (₫)", { type: "number", min: 0 })}
            {field("startsAt", "Bắt đầu", { type: "datetime-local" })}
            {field("endsAt", "Kết thúc", { type: "datetime-local" })}
            {field("totalQuota", "Tổng lượt dùng (bỏ trống = không giới hạn)", { type: "number", min: 1 })}
            {field("perUserLimit", "Lượt dùng mỗi người", { type: "number", min: 1 })}
            <div className="space-y-1.5">
              <Label htmlFor="v-audience">Đối tượng</Label>
              <select id="v-audience" className={selectClass} {...form.register("audience")}>
                <option value="ALL">Tất cả</option>
                <option value="NEW_USER">Người dùng mới (chưa có đơn)</option>
                <option value="PERSONAL">Một người cụ thể</option>
              </select>
            </div>
            {audience === "PERSONAL" && field("assignedUserId", "ID người nhận")}
            <div className="space-y-1.5">
              <Label htmlFor="v-budgetId">Ngân sách</Label>
              <select id="v-budgetId" className={selectClass} aria-invalid={!!errors.budgetId} {...form.register("budgetId")}>
                <option value="">— Chọn —</option>
                {budgets?.filter((b) => b.isActive).map((b) => <option key={b.id} value={b.id}>{b.name} (còn {b.remainingAmount.toLocaleString("vi-VN")} ₫)</option>)}
              </select>
              {errors.budgetId && <p className="text-xs font-medium text-red-600">{errors.budgetId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-status">Trạng thái</Label>
              <select id="v-status" className={selectClass} {...form.register("status")}>
                <option value="ACTIVE">Kích hoạt ngay</option>
                <option value="DRAFT">Lưu nháp</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>Huỷ</Button>
            <Button type="submit" disabled={create.isPending} className="bg-[#2a7bd9] text-white hover:bg-[#1e5aa8]">
              {create.isPending ? "Đang tạo…" : "Tạo voucher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
