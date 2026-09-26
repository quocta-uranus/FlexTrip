'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validators/auth.schema';
import { useForgotPassword } from '@/hooks/useAuthMutations';

export default function ForgotPasswordPage() {
  const { mutate, isPending, isSuccess } = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  if (isSuccess) {
    return (
      <div className="text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'rgba(146,238,232,0.2)' }}
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="#2a7bd9" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Kiểm tra email</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu trong vài phút.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm font-semibold" style={{ color: '#2a7bd9' }}>
          Quay lại đăng nhập
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quên mật khẩu?</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Nhập email và chúng tôi sẽ gửi link đặt lại mật khẩu.
        </p>
      </div>

      <form onSubmit={handleSubmit((d) => mutate(d.email))} className="space-y-4">
        <AuthField label="Email" error={errors.email?.message}>
          <AuthInput
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </AuthField>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: '#2a7bd9', boxShadow: '0 8px 20px -8px rgba(42,123,217,0.5)' }}
        >
          {isPending ? 'Đang gửi…' : 'Gửi link đặt lại'}
        </button>
      </form>

      <div className="mt-5 text-center">
        <Link href="/login" className="text-sm font-medium" style={{ color: '#2a7bd9' }}>
          Quay lại đăng nhập
        </Link>
      </div>
    </>
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
