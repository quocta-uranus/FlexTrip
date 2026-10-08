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
