'use client';

import { AlertTriangle, CheckCircle2, PauseCircle, PlayCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AdminStaff } from '@/types/admin';

interface StaffStatusDialogProps {
  staff: AdminStaff | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function StaffStatusDialog({ staff, pending, onOpenChange, onConfirm }: StaffStatusDialogProps) {
  const isSuspending = staff?.isActive ?? true;

  return (
    <Dialog open={staff !== null} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden border-0 bg-white p-0 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.45)] sm:max-w-[470px]"
        showCloseButton={!pending}
      >
        <div className={`h-1.5 w-full ${isSuspending ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        <div className="px-6 pb-2 pt-5 sm:px-7">
          <DialogHeader className="gap-4">
            <div className="flex items-start gap-4 pr-8">
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${isSuspending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {isSuspending ? <PauseCircle className="size-6" /> : <PlayCircle className="size-6" />}
              </div>
              <div className="space-y-1.5">
                <DialogTitle className="text-xl font-bold leading-7 text-slate-950">
                  {isSuspending ? 'Tạm ngừng nhân viên?' : 'Kích hoạt nhân viên?'}
                </DialogTitle>
                <DialogDescription className="leading-5 text-slate-500">
                  {isSuspending
                    ? 'Tài khoản sẽ tạm thời mất quyền truy cập khu vực vận hành.'
                    : 'Tài khoản sẽ được khôi phục quyền truy cập khu vực vận hành.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {staff && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 text-sm font-bold text-white shadow-sm">
                {staff.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-900">{staff.name}</p>
                <p className="truncate text-xs text-slate-500">{staff.email}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isSuspending ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                {isSuspending ? 'Đang hoạt động' : 'Đang tạm ngừng'}
              </span>
            </div>
          )}

          <div className={`mt-4 flex gap-3 rounded-xl border p-3.5 text-sm leading-5 ${isSuspending ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            {isSuspending ? <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" /> : <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />}
            <p>
              {isSuspending
                ? 'Nhân viên sẽ không thể đăng nhập hoặc nhận phân công mới. Dữ liệu và lịch sử công việc vẫn được giữ nguyên.'
                : 'Nhân viên có thể đăng nhập và tiếp tục nhận phân công ngay sau khi kích hoạt.'}
            </p>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 mt-4 rounded-none border-slate-200 bg-slate-50 px-6 py-4 sm:px-7">
          <Button className="h-10 rounded-xl px-5" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Huỷ
          </Button>
          <Button
            className={`h-10 rounded-xl px-5 font-bold text-white ${isSuspending ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? (
              <span className="flex items-center gap-2"><span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Đang xử lý…</span>
            ) : (
              <span className="flex items-center gap-2">{isSuspending ? <PauseCircle /> : <CheckCircle2 />}{isSuspending ? 'Tạm ngừng' : 'Kích hoạt'}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
