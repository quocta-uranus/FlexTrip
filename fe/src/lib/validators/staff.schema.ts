import { z } from 'zod';

const imageFile = z.custom<File>(
  (value) => typeof File !== 'undefined' && value instanceof File && value.type.startsWith('image/'),
  'Vui lòng chọn một tệp ảnh',
);

export const staffConditionSchema = z.object({
  conditionNote: z.string().trim().min(2, 'Mô tả tình trạng ít nhất 2 ký tự').max(2000),
  file: imageFile,
});

export const staffMediationSchema = z.object({
  issue: z.string().trim().min(5, 'Mô tả vấn đề ít nhất 5 ký tự').max(4000),
  travelerStatement: z.string().trim().max(4000).optional(),
  providerStatement: z.string().trim().max(4000).optional(),
  files: z.array(imageFile).max(10, 'Tối đa 10 ảnh'),
});

export const staffResolutionSchema = z.object({
  resolution: z.string().trim().min(5, 'Nội dung ít nhất 5 ký tự').max(4000),
});

export const staffEscalationSchema = z.object({
  type: z.enum(['DAMAGE_CLAIM', 'REFUND_REQUEST', 'PAYMENT_DISPUTE', 'CANCELLATION_DISPUTE']),
  priority: z.enum(['MEDIUM', 'HIGH', 'CRITICAL']),
  requestedAmount: z.string().optional(),
  additionalNotes: z.string().trim().max(4000).optional(),
});

export type StaffConditionInput = z.infer<typeof staffConditionSchema>;
export type StaffMediationInput = z.infer<typeof staffMediationSchema>;
export type StaffResolutionInput = z.infer<typeof staffResolutionSchema>;
export type StaffEscalationInput = z.infer<typeof staffEscalationSchema>;
