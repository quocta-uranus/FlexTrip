"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSaveReward } from "@/hooks/admin/use-admin-loyalty";
import { rewardSchema, type RewardFormValues, type RewardInput } from "@/lib/validators/loyalty.schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (msg: string) => void;
  onError: (err: unknown) => void;
}

export function RewardFormDialog({ open, onOpenChange, onSuccess, onError }: Props) {
  const save = useSaveReward();
  const form = useForm<RewardFormValues, unknown, RewardInput>({
    resolver: zodResolver(rewardSchema),
    defaultValues: { voucherType: "FIXED", validDays: 30 },
  });
  const { errors } = form.formState;
  const type = useWatch({ control: form.control, name: "voucherType" });

  const onSubmit = form.handleSubmit((values) => {
    save.mutate(values, {
      onSuccess: () => { onSuccess("Đã thêm mốc đổi thưởng"); form.reset(); onOpenChange(false); },
      onError,
    });
  });

  const field = (name: keyof RewardFormValues, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`r-${name}`}>{label}</Label>
      <Input id={`r-${name}`} aria-invalid={!!errors[name]} {...props} {...form.register(name)} />
      {errors[name] && <p className="text-xs font-medium text-red-600">{String(errors[name]?.message)}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[200] bg-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm mốc đổi thưởng</DialogTitle>
          <DialogDescription>Traveler dùng điểm để đổi lấy voucher cá nhân dùng một lần.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("name", "Tên phần thưởng", { placeholder: "Voucher 20.000 ₫" })}</div>
            {field("pointsCost", "Số điểm cần", { type: "number", min: 1 })}
            {field("validDays", "Hạn dùng (ngày)", { type: "number", min: 1, max: 365 })}
            <div className="space-y-1.5">
              <Label htmlFor="r-voucherType">Loại giảm</Label>
              <select id="r-voucherType" className="h-10 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-3 text-sm outline-none focus:border-[#2a7bd9]" {...form.register("voucherType")}>
                <option value="FIXED">Số tiền cố định (₫)</option>
                <option value="PERCENT">Phần trăm (%)</option>
              </select>
            </div>
            {field("voucherValue", type === "PERCENT" ? "Giá trị (%)" : "Giá trị (₫)", { type: "number", min: 1 })}
            {type === "PERCENT" && field("maxDiscount", "Giảm tối đa (₫)", { type: "number", min: 1 })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>Huỷ</Button>
            <Button type="submit" disabled={save.isPending} className="bg-[#2a7bd9] text-white hover:bg-[#1e5aa8]">{save.isPending ? "Đang lưu…" : "Thêm"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
