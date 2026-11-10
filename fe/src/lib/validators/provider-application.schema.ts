import { z } from 'zod';

export const providerApplicationSchema = z.object({
  name: z.string().trim().min(2, 'Vui lòng nhập họ và tên'),
  phone: z.string().trim().regex(/^[0-9+\s.-]{9,15}$/, 'Số điện thoại không hợp lệ'),
  city: z.string().min(1, 'Vui lòng chọn khu vực'),
  categories: z.array(z.string()).min(1, 'Chọn ít nhất một loại thiết bị'),
  description: z.string().trim().max(1000, 'Tối đa 1000 ký tự').optional(),
});
export type ProviderApplicationInput = z.infer<typeof providerApplicationSchema>;
