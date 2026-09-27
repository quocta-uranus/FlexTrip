import { z } from 'zod';

export const reasonSchema = z.object({ reason: z.string().trim().min(1, 'Vui lòng nhập lý do').max(500) });
export type ReasonInput = z.infer<typeof reasonSchema>;

export const resolveDisputeSchema = (maxRefund: number | null) =>
  z
    .object({
      outcome: z.enum(['RESOLVED', 'REJECTED']),
      resolution: z.string().trim().min(1, 'Vui lòng nhập kết luận').max(2000),
      refundAmount: z.number().positive('Số tiền phải > 0').optional(),
    })
    .refine((d) => d.refundAmount === undefined || d.outcome === 'RESOLVED', {
      path: ['refundAmount'], message: 'Chỉ hoàn tiền khi chấp nhận tranh chấp',
    })
    .refine((d) => d.refundAmount === undefined || (maxRefund !== null && d.refundAmount <= maxRefund), {
      path: ['refundAmount'], message: maxRefund === null ? 'Booking chưa có thanh toán' : 'Không được vượt quá số đã thanh toán',
    });
export type ResolveDisputeInput = z.infer<ReturnType<typeof resolveDisputeSchema>>;

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ');
export const generatePayoutsSchema = z
  .object({ periodStart: dateOnly, periodEnd: dateOnly })
  .refine((d) => d.periodEnd >= d.periodStart, { path: ['periodEnd'], message: 'Ngày kết thúc phải sau ngày bắt đầu' });
export type GeneratePayoutsInput = z.infer<typeof generatePayoutsSchema>;

export const recordPayoutSchema = z.object({
  actualPaid: z.number().min(0, 'Số tiền không hợp lệ'),
  transferRef: z.string().trim().min(1, 'Vui lòng nhập mã chuyển khoản').max(100),
  note: z.string().max(500).optional(),
});
export type RecordPayoutInput = z.infer<typeof recordPayoutSchema>;

export const staffSchema = z.object({
  name: z.string().trim().min(2, 'Tên tối thiểu 2 ký tự').max(100),
  email: z.string().trim().email('Email không hợp lệ'),
  phone: z.string().regex(/^[0-9+\s-]{8,20}$/, 'Số điện thoại không hợp lệ').optional().or(z.literal('')),
  employeeCode: z.string().regex(/^[A-Z0-9-]{3,30}$/, 'Chỉ chữ in hoa, số và dấu gạch (3–30 ký tự)'),
  regionsText: z.string().trim().min(1, 'Nhập ít nhất 1 khu vực'),
});
export type StaffInput = z.infer<typeof staffSchema>;
export const parseRegions = (s: string) => s.split(',').map((r) => r.trim()).filter(Boolean).slice(0, 10);

export const staffRuleSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên rule').max(100),
  region: z.string().trim().min(1, 'Nhập khu vực').max(50),
  staffId: z.string().min(1, 'Chọn nhân viên'),
  priority: z.number().int().min(0).max(100),
  isActive: z.boolean(),
});
export type StaffRuleInput = z.infer<typeof staffRuleSchema>;
