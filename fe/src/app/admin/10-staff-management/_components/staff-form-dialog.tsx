'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Sửa nhân viên' : 'Thêm nhân viên'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-name">Họ tên</Label>
            <Input id="staff-name" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input id="staff-email" type="email" disabled={editing} {...form.register('email')} />
            {form.formState.errors.email && <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-phone">Số điện thoại</Label>
            <Input id="staff-phone" {...form.register('phone')} />
            {form.formState.errors.phone && <p className="text-xs text-red-600">{form.formState.errors.phone.message}</p>}
          </div>
          {!editing && (
            <div className="space-y-2">
              <Label htmlFor="staff-password">Mật khẩu</Label>
              <Input id="staff-password" type="password" autoComplete="new-password" {...form.register('password')} />
              <p className="text-xs text-slate-500">Tối thiểu 8 ký tự. Admin bàn giao mật khẩu trực tiếp cho nhân viên.</p>
              {form.formState.errors.password && (
                <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label>Khu vực</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {STAFF_REGIONS.map((region) => (
                <label key={region} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input type="checkbox" value={region} {...form.register('regions')} />
                  {region}
                </label>
              ))}
            </div>
            {form.formState.errors.regions && (
              <p className="text-xs text-red-600">{form.formState.errors.regions.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Huỷ</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Đang lưu…' : editing ? 'Lưu' : 'Tạo'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
