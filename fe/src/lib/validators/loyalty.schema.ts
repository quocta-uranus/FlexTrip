import { z } from 'zod';

export const rewardSchema = z
  .object({
    name: z.string().min(2, 'Tối thiểu 2 ký tự').max(100),
    pointsCost: z.coerce.number().int().min(1, 'Tối thiểu 1 điểm'),
    voucherType: z.enum(['FIXED', 'PERCENT']),
    voucherValue: z.coerce.number().positive('Phải lớn hơn 0'),
    maxDiscount: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().positive().optional()),
    validDays: z.coerce.number().int().min(1).max(365),
  })
  .superRefine((v, ctx) => {
    if (v.voucherType === 'PERCENT' && v.voucherValue > 100) ctx.addIssue({ code: 'custom', path: ['voucherValue'], message: 'Tối đa 100%' });
    if (v.voucherType === 'PERCENT' && !v.maxDiscount) ctx.addIssue({ code: 'custom', path: ['maxDiscount'], message: 'Cần đặt mức giảm tối đa' });
  });

export type RewardFormValues = z.input<typeof rewardSchema>;
export type RewardInput = z.output<typeof rewardSchema>;
