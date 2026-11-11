import { z } from 'zod';

const money = z.coerce.number().positive('Phải lớn hơn 0');

export const createVoucherSchema = z
  .object({
    code: z.string().regex(/^[A-Za-z0-9_-]{3,32}$/, 'Mã gồm 3-32 ký tự chữ, số, - hoặc _'),
    name: z.string().min(2, 'Tối thiểu 2 ký tự').max(100),
    description: z.string().max(500).optional(),
    type: z.enum(['PERCENT', 'FIXED']),
    value: money,
    maxDiscount: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().positive().optional()),
    minOrderValue: z.preprocess((v) => (v === '' || v == null ? 0 : v), z.coerce.number().min(0)),
    category: z.string().max(50).optional(),
    audience: z.enum(['ALL', 'NEW_USER', 'PERSONAL']),
    assignedUserId: z.string().optional(),
    status: z.enum(['DRAFT', 'ACTIVE']),
    startsAt: z.string().min(1, 'Chọn ngày bắt đầu'),
    endsAt: z.string().min(1, 'Chọn ngày kết thúc'),
    totalQuota: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
    perUserLimit: z.coerce.number().int().min(1),
    budgetId: z.string().min(1, 'Chọn ngân sách'),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'PERCENT' && v.value > 100) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Tối đa 100%' });
    if (v.type === 'PERCENT' && !v.maxDiscount) ctx.addIssue({ code: 'custom', path: ['maxDiscount'], message: 'Cần đặt mức giảm tối đa' });
    if (v.audience === 'PERSONAL' && !v.assignedUserId) ctx.addIssue({ code: 'custom', path: ['assignedUserId'], message: 'Nhập ID người nhận' });
    if (v.startsAt && v.endsAt && new Date(v.endsAt) <= new Date(v.startsAt)) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Phải sau ngày bắt đầu' });
    }
  });

export type CreateVoucherFormValues = z.input<typeof createVoucherSchema>;
export type CreateVoucherInput = z.output<typeof createVoucherSchema>;

export interface UpdateVoucherInput {
  name?: string;
  description?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';
  startsAt?: string;
  endsAt?: string;
  totalQuota?: number;
  perUserLimit?: number;
}

export const budgetSchema = z.object({
  name: z.string().min(2, 'Tối thiểu 2 ký tự').max(100),
  totalAmount: z.coerce.number().positive('Phải lớn hơn 0'),
});
export type BudgetFormValues = z.input<typeof budgetSchema>;
export type BudgetInput = z.output<typeof budgetSchema>;
