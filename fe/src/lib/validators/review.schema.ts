import { z } from 'zod';

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Vui lòng chọn số sao').max(5),
  comment: z
    .string()
    .trim()
    .min(10, 'Nhận xét phải có ít nhất 10 ký tự')
    .max(2000, 'Nhận xét không được vượt quá 2000 ký tự'),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;

export const appealSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Lý do khiếu nại phải có ít nhất 10 ký tự')
    .max(1000, 'Lý do khiếu nại không được vượt quá 1000 ký tự'),
});

export type AppealFormValues = z.infer<typeof appealSchema>;
