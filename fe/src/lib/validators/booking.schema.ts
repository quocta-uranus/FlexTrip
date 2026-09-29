import { z } from 'zod';

export const createBookingSchema = z.object({
  listingId: z.string().min(1),
  startDate: z.string().min(1, 'Chọn ngày bắt đầu'),
  endDate: z.string().min(1, 'Chọn ngày kết thúc'),
  notes: z.string().max(500).optional(),
  paymentMethodId: z.string().optional(),
}).refine(
  (d) => new Date(d.endDate) > new Date(d.startDate),
  { message: 'Ngày kết thúc phải sau ngày bắt đầu', path: ['endDate'] },
);

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
