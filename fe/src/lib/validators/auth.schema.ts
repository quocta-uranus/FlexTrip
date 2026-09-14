import { z } from 'zod';

const passwordField = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .refine(
    (v) => new TextEncoder().encode(v).length <= 72,
    'Mật khẩu không được vượt quá 72 bytes',
  );

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100),
    email: z.string().email('Email không hợp lệ'),
    phone: z
      .string()
      .regex(/^[0-9+\s\-()]{7,20}$/, 'Số điện thoại không hợp lệ')
      .optional()
      .or(z.literal('')),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  deviceName: z.string().max(100).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export const twoFactorCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'Mã xác thực phải đúng 6 ký tự')
    .regex(/^\d{6}$/, 'Mã xác thực chỉ gồm chữ số'),
});

export const twoFactorLoginSchema = z.object({
  challengeToken: z.string().min(1),
  code: z
    .string()
    .length(6, 'Mã xác thực phải đúng 6 ký tự')
    .regex(/^\d{6}$/, 'Mã xác thực chỉ gồm chữ số'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type TwoFactorCodeInput = z.infer<typeof twoFactorCodeSchema>;
export type TwoFactorLoginInput = z.infer<typeof twoFactorLoginSchema>;
