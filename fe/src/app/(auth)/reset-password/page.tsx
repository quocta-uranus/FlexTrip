'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode, Suspense } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validators/auth.schema';
import { useResetPassword } from '@/hooks/useAuthMutations';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { mutate, isPending, error } = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300">Link không hợp lệ.</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm font-semibold" style={{ color: '#2a7bd9' }}>
          Yêu cầu link mới
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-7">
        <div
          className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: '#2a7bd9' }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#92eee8]" />
          AUTH-03
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Đặt lại mật khẩu</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Mật khẩu mới phải có ít nhất 8 ký tự.</p>
      </div>

      {error && (
        <div
          className="mb-5 rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}
        >
          {error.message}
        </div>
      )}

      <form
        onSubmit={handleSubmit((d) => mutate({ token: d.token, newPassword: d.newPassword }))}
        className="space-y-4"
      >
        <input type="hidden" {...register('token')} />

        <AuthField label="Mật khẩu mới" error={errors.newPassword?.message}>
          <AuthInput
            {...register('newPassword')}
            type="password"
            placeholder="Ít nhất 8 ký tự"
            autoComplete="new-password"
          />
        </AuthField>

        <AuthField label="Xác nhận mật khẩu" error={errors.confirmPassword?.message}>
          <AuthInput
            {...register('confirmPassword')}
            type="password"
            placeholder="Nhập lại mật khẩu mới"
            autoComplete="new-password"
          />
        </AuthField>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: '#2a7bd9', boxShadow: '0 8px 20px -8px rgba(42,123,217,0.5)' }}
        >
          {isPending ? 'Đang lưu…' : 'Lưu mật khẩu mới'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function AuthField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-slate-100">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{error}</p>}
    </div>
  );
}

const AuthInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full rounded-xl border bg-slate-50/80 dark:bg-[#16223B] px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 outline-none transition-all border-slate-200 dark:border-white/10 focus:border-[#0070F3] dark:focus:border-[#38BDF8] focus:bg-white dark:focus:bg-[#1A2946] focus:ring-4 focus:ring-[#0070F3]/15 dark:focus:ring-[#38BDF8]/20 ${className ?? ''}`}
      {...props}
    />
  ),
);
AuthInput.displayName = 'AuthInput';
