'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateStaff, useUpdateStaff } from '@/hooks/admin/use-admin-staff';
import { STAFF_REGIONS, staffSchema, type StaffInput } from '@/lib/validators/admin.schema';
import type { ApiError } from '@/lib/api/client';
import type { AdminStaff } from '@/types/admin';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: AdminStaff | null;
  onSuccess: (msg: string) => void;
  onError: (err: unknown) => void;
}

export function StaffFormDialog({ open, onOpenChange, staff, onSuccess, onError }: Props) {
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const editing = !!staff;
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<StaffInput>({
    resolver: zodResolver(staffSchema(editing)),
    defaultValues: { name: '', email: '', phone: '', password: '', regions: [] },
  });

  useEffect(() => {
    if (!open) return;
    if (staff) {
      form.reset({
        name: staff.name,
        email: staff.email,
        phone: staff.phone ?? '',
        password: '',
        regions: staff.regions.filter((region): region is StaffInput['regions'][number] =>
          STAFF_REGIONS.includes(region as StaffInput['regions'][number])),
      });
    } else {
      form.reset({ name: '', email: '', phone: '', password: '', regions: [] });
    }
  }, [open, staff, form]);

  const onSubmit = form.handleSubmit((values) => {
    if (editing && staff) {
      update.mutate(
        {
          id: staff.id,
          name: values.name,
          phone: values.phone || undefined,
          regions: values.regions,
        },
        {
          onSuccess: () => {
            onSuccess('Đã cập nhật nhân viên');
            setShowPassword(false);
            onOpenChange(false);
          },
          onError: (err) => {
            onError(err);
          },
        },
      );
      return;
    }

    create.mutate(
      {
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password,
        regions: values.regions,
      },
      {
        onSuccess: () => {
          onSuccess('Đã tạo tài khoản nhân viên');
          setShowPassword(false);
          onOpenChange(false);
        },
        onError: (err) => {
          const apiErr = err as ApiError;
          if (apiErr.code === 'EMAIL_TAKEN') {
            form.setError('email', { message: apiErr.message });
            return;
          }
          onError(err);
        },
      },
    );
  });

  const pending = create.isPending || update.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setShowPassword(false);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="z-[200] flex h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden rounded-3xl border-0 bg-white p-0 shadow-2xl ring-1 ring-slate-900/10 sm:h-auto sm:max-w-2xl [&>[data-slot=dialog-close]]:right-4 [&>[data-slot=dialog-close]]:top-4 [&>[data-slot=dialog-close]]:text-white [&>[data-slot=dialog-close]]:hover:bg-white/10 [&>[data-slot=dialog-close]]:hover:text-white">
        <DialogHeader className="relative shrink-0 overflow-hidden bg-[#0f1729] px-6 py-6 pr-14 text-white sm:px-8">
          <div className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full bg-[#2a7bd9]/30 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              {editing ? <UserRound className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#92eee8]">
                {editing ? 'Cập nhật hồ sơ' : 'Tài khoản vận hành'}
              </div>
              <DialogTitle className="text-xl font-bold leading-tight text-white">
                {editing ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-lg text-sm leading-6 text-slate-300">
                {editing
                  ? 'Cập nhật thông tin liên hệ và phạm vi khu vực phụ trách.'
                  : 'Tạo tài khoản Staff để nhân viên tiếp nhận booking và xử lý công việc vận hành.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-6 py-6 sm:px-8">
            <section>
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#2a7bd9]">
                  <UserRound className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#0f1729]">Thông tin nhân viên</h3>
                  <p className="text-xs text-[#8694ad]">Thông tin dùng để nhận diện và liên hệ</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="staff-name" className="text-xs font-semibold text-[#5a6b85]">
                    Họ và tên <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8694ad]" />
                    <Input
                      id="staff-name"
                      placeholder="Nguyễn Văn An"
                      aria-invalid={!!form.formState.errors.name}
                      className="h-11 rounded-xl border-slate-200 bg-[#f8fafc] pl-10 focus-visible:border-[#2a7bd9] focus-visible:ring-[#2a7bd9]/15"
                      {...form.register('name')}
                    />
                  </div>
                  {form.formState.errors.name && <p className="text-xs font-medium text-red-600">{form.formState.errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="staff-phone" className="text-xs font-semibold text-[#5a6b85]">Số điện thoại</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8694ad]" />
                    <Input
                      id="staff-phone"
                      inputMode="tel"
                      placeholder="0901 234 567"
                      aria-invalid={!!form.formState.errors.phone}
                      className="h-11 rounded-xl border-slate-200 bg-[#f8fafc] pl-10 focus-visible:border-[#2a7bd9] focus-visible:ring-[#2a7bd9]/15"
                      {...form.register('phone')}
                    />
                  </div>
                  {form.formState.errors.phone && <p className="text-xs font-medium text-red-600">{form.formState.errors.phone.message}</p>}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="staff-email" className="text-xs font-semibold text-[#5a6b85]">
                    Email đăng nhập <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8694ad]" />
                    <Input
                      id="staff-email"
                      type="email"
                      autoComplete="off"
                      placeholder="nhanvien@flextrip.vn"
                      disabled={editing}
                      aria-invalid={!!form.formState.errors.email}
                      className="h-11 rounded-xl border-slate-200 bg-[#f8fafc] pl-10 focus-visible:border-[#2a7bd9] focus-visible:ring-[#2a7bd9]/15 disabled:bg-slate-100"
                      {...form.register('email')}
                    />
                  </div>
                  {editing && <p className="text-xs text-[#8694ad]">Email đăng nhập không thể thay đổi sau khi tạo.</p>}
                  {form.formState.errors.email && <p className="text-xs font-medium text-red-600">{form.formState.errors.email.message}</p>}
                </div>
              </div>
            </section>

            {!editing && (
              <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-[#2a7bd9]" />
                  <Label htmlFor="staff-password" className="text-xs font-bold text-[#0f1729]">
                    Mật khẩu tạm thời <span className="text-red-500">*</span>
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="staff-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Tối thiểu 8 ký tự"
                    aria-invalid={!!form.formState.errors.password}
                    className="h-11 rounded-xl border-blue-100 bg-white pr-11 focus-visible:border-[#2a7bd9] focus-visible:ring-[#2a7bd9]/15"
                    {...form.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#8694ad] transition-colors hover:bg-blue-50 hover:text-[#2a7bd9]"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#5a6b85]">Admin bàn giao mật khẩu này cho nhân viên qua kênh nội bộ an toàn.</p>
                {form.formState.errors.password && <p className="mt-1 text-xs font-medium text-red-600">{form.formState.errors.password.message}</p>}
              </section>
            )}

            <section>
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#0f1729]">Khu vực phụ trách</h3>
                  <p className="text-xs text-[#8694ad]">Chọn ít nhất một khu vực vận hành</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {STAFF_REGIONS.map((region) => (
                  <label key={region} className="group relative cursor-pointer">
                    <input type="checkbox" value={region} {...form.register('regions')} className="peer sr-only" />
                    <span className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-[#5a6b85] transition-all group-hover:border-blue-200 group-hover:bg-blue-50/40 peer-checked:border-[#2a7bd9] peer-checked:bg-blue-50 peer-checked:text-[#0f1729] peer-checked:[&>span]:border-[#2a7bd9] peer-checked:[&>span]:bg-[#2a7bd9] peer-checked:[&>span]:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#2a7bd9]/30">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-transparent transition-colors">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      {region}
                    </span>
                  </label>
                ))}
              </div>
              {form.formState.errors.regions && <p className="mt-2 text-xs font-medium text-red-600">{form.formState.errors.regions.message}</p>}
            </section>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-slate-200 bg-[#f8fafc] px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="hidden text-xs text-[#8694ad] sm:block">
              <span className="text-red-500">*</span> Thông tin bắt buộc
            </p>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPassword(false);
                  onOpenChange(false);
                }}
                disabled={pending}
                className="h-10 rounded-xl border-slate-200 bg-white px-5 text-[#5a6b85] hover:bg-slate-100"
              >
                Huỷ
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="h-10 rounded-xl bg-[#16a34a] px-6 font-semibold text-white shadow-sm hover:bg-[#15803d]"
              >
                {pending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo tài khoản'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
