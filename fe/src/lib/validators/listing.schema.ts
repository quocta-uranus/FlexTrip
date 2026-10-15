import { z } from 'zod';
import { CATEGORY_VALUES } from '@/constants/categories';

export const penaltyRuleSchema = z.object({
  item: z.string().min(1, 'Bắt buộc'),
  description: z.string().min(1, 'Bắt buộc'),
  minAmount: z.coerce.number().min(0),
  maxAmount: z.coerce.number().min(0),
});

export const listingSchema = z.object({
  title: z.string().min(5, 'Tiêu đề ít nhất 5 ký tự').max(120),
  description: z.string().min(20, 'Mô tả ít nhất 20 ký tự'),
  price: z.coerce.number().positive('Giá phải lớn hơn 0'),
  currency: z.string().default('VND'),
  location: z.string().min(3, 'Nhập địa điểm'),
  category: z.enum(CATEGORY_VALUES),
  amenities: z.array(z.string()).default([]),
  imageUrls: z.array(z.string().url('URL ảnh không hợp lệ')).min(1, 'Cần ít nhất 1 ảnh'),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  penaltyRules: z.array(penaltyRuleSchema).optional(),
  conditionNote: z.string().optional(),
  marketValue: z.coerce.number().optional(),
});

export type ListingInput = z.infer<typeof listingSchema>;
