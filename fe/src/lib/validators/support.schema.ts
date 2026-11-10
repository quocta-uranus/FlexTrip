import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().trim().min(5, 'Tiêu đề tối thiểu 5 ký tự').max(150, 'Tiêu đề tối đa 150 ký tự'),
  description: z.string().trim().min(10, 'Vui lòng mô tả chi tiết hơn (tối thiểu 10 ký tự)').max(4000),
  bookingId: z.string().trim().optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const ticketReplySchema = z.object({
  body: z.string().trim().min(1, 'Vui lòng nhập nội dung').max(4000),
});
export type TicketReplyInput = z.infer<typeof ticketReplySchema>;

export const adminReplySchema = ticketReplySchema.extend({
  nextStatus: z.enum(['IN_PROGRESS', 'WAITING_USER', 'RESOLVED']),
});
export type AdminReplyInput = z.infer<typeof adminReplySchema>;

const CATEGORIES = ['BOOKING', 'PAYMENT', 'ACCOUNT', 'LISTING', 'TECHNICAL', 'OTHER'] as const;

export const faqSchema = z.object({
  question: z.string().trim().min(5, 'Câu hỏi tối thiểu 5 ký tự').max(200),
  answer: z.string().trim().min(5, 'Câu trả lời tối thiểu 5 ký tự').max(4000),
  category: z.enum(CATEGORIES),
  isPublished: z.boolean(),
});
export type FaqInput = z.infer<typeof faqSchema>;

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ');
const DAY = 24 * 3600_000;

export const exportReportSchema = z
  .object({ type: z.enum(['REVENUE', 'BOOKINGS', 'COMMISSION']), from: dateOnly, to: dateOnly })
  .refine((d) => d.to >= d.from, { path: ['to'], message: 'Ngày kết thúc phải sau ngày bắt đầu' })
  .refine((d) => (Date.parse(d.to) - Date.parse(d.from)) / DAY < 366, { path: ['to'], message: 'Chỉ xuất tối đa 366 ngày mỗi lần' });
export type ExportReportInput = z.infer<typeof exportReportSchema>;

export const reportScheduleSchema = z.object({
  name: z.string().trim().min(3, 'Tên tối thiểu 3 ký tự').max(100),
  type: z.enum(['REVENUE', 'BOOKINGS', 'COMMISSION']),
  frequency: z.enum(['WEEKLY', 'MONTHLY']),
  recipients: z
    .string()
    .trim()
    .min(1, 'Nhập ít nhất một email')
    .refine((v) => {
      const list = v.split(/[\s,;]+/).filter(Boolean);
      return list.length >= 1 && list.length <= 10 && list.every((e) => z.string().email().safeParse(e).success);
    }, 'Danh sách email không hợp lệ (tối đa 10, ngăn cách bằng dấu phẩy)'),
});
export type ReportScheduleInput = z.infer<typeof reportScheduleSchema>;
