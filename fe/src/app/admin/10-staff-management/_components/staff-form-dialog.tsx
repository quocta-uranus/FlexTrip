'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateStaff, useUpdateStaff } from '@/hooks/admin/use-admin-staff';
import { parseRegions, staffSchema, type StaffInput } from '@/lib/validators/admin.schema';
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
    resolver: zodResolver(staffSchema),
    defaultValues: { name: '', email: '', phone: '', employeeCode: '', regionsText: '' },
  });

  useEffect(() => {
    if (!open) return;
    if (staff) {
      form.reset({
        name: staff.name,
        email: staff.email,
        phone: staff.phone ?? '',
        employeeCode: staff.employeeCode,
        regionsText: staff.regions.join(', '),
      });
    } else {
      form.reset({ name: '', email: '', phone: '', employeeCode: '', regionsText: '' });
    }
  }, [open, staff, form]);

  const onSubmit = form.handleSubmit((values) => {
    const regions = parseRegions(values.regionsText);
    if (editing && staff) {
      update.mutate(
        {
          id: staff.id,
          name: values.name,
          phone: values.phone || undefined,
          employeeCode: values.employeeCode,
          regions,
        },
        {
          onSuccess: () => {
            onSuccess('Đã cập nhật nhân viên');
            onOpenChange(false);
          },
          onError: (err) => {
            const apiErr = err as ApiError;
            if (apiErr.code === 'EMPLOYEE_CODE_TAKEN') {
              form.setError('employeeCode', { message: apiErr.message });
              return;
            }
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
        employeeCode: values.employeeCode,
        regions,
      },
      {
        onSuccess: (r) => {
          onSuccess(
            r.emailSent
              ? 'Đã tạo và gửi email mời'
              : 'Đã tạo nhưng chưa gửi được email — dùng "Gửi lại lời mời"',
          );
          onOpenChange(false);
        },
        onError: (err) => {
          const apiErr = err as ApiError;
          if (apiErr.code === 'EMAIL_TAKEN') {
            form.setError('email', { message: apiErr.message });
            return;
          }
          if (apiErr.code === 'EMPLOYEE_CODE_TAKEN') {
            form.setError('employeeCode', { message: apiErr.message });
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
          <div className="space-y-2">
            <Label htmlFor="staff-code">Mã nhân viên</Label>
            <Input
              id="staff-code"
              {...form.register('employeeCode', {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
            />
            {form.formState.errors.employeeCode && (
              <p className="text-xs text-red-600">{form.formState.errors.employeeCode.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-regions">Khu vực</Label>
            <Input id="staff-regions" {...form.register('regionsText')} />
            <p className="text-xs text-slate-500">Phân cách bằng dấu phẩy, ví dụ: Hồ Chí Minh, Bình Dương</p>
            {form.formState.errors.regionsText && (
              <p className="text-xs text-red-600">{form.formState.errors.regionsText.message}</p>
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
