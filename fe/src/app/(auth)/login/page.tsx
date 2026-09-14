'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validators/auth.schema';
import { useLogin } from '@/hooks/useAuthMutations';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const { mutate, isPending, error } = useLogin();
  const searchParams = useSearchParams();
  const wasReset = searchParams.get('reset') === '1';
  const wasVerified = searchParams.get('verified') === '1';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  return (
    <>
      <div className="mb-7">
        <div
          className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: '#2a7bd9' }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#92eee8]" />
          AUTH-02
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#0f1729' }}>Đăng nhập</h1>
        <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>
          Chưa có tài khoản?{' '}
          <Link href="/register" className="font-semibold" style={{ color: '#2a7bd9' }}>
            Đăng ký miễn phí
          </Link>
        </p>
      </div>

      {wasVerified && (
        <div
          className="mb-5 rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: 'rgba(146,238,232,0.5)', background: 'rgba(146,238,232,0.15)', color: '#1e5aa8' }}
        >
          ✓ Email đã xác thực thành công. Đăng nhập để tiếp tục.
        </div>
      )}

      {wasReset && (
        <div
          className="mb-5 rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: 'rgba(146,238,232,0.5)', background: 'rgba(146,238,232,0.15)', color: '#1e5aa8' }}
        >
          Mật khẩu đã được đặt lại thành công. Đăng nhập với mật khẩu mới.
        </div>
      )}

      {error && (
        <div
          className="mb-5 rounded-lg border px-4 py-3 text-sm"
          style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}
        >
          {error.message}
        </div>
      )}

      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
        <AuthField label="Email" error={errors.email?.message}>
          <AuthInput
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </AuthField>

        <AuthField label="Mật khẩu" error={errors.password?.message}>
          <AuthInput
            {...register('password')}
            type="password"
            placeholder="Mật khẩu của bạn"
            autoComplete="current-password"
          />
        </AuthField>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium"
            style={{ color: '#2a7bd9' }}
          >
            Quên mật khẩu?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: '#2a7bd9', boxShadow: '0 8px 20px -8px rgba(42,123,217,0.5)' }}
        >
          {isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

// ─── Shared ──────────────────────────────────────────────────────────────────

function AuthField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" style={{ color: '#0f1729' }}>{label}</label>
      {children}
      {error && <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{error}</p>}
    </div>
  );
}

const AuthInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full rounded-lg border bg-white px-4 py-2.5 text-sm outline-none transition-all placeholder:text-[#8694ad] focus:ring-2 focus:ring-[#2a7bd9]/30 ${className ?? ''}`}
      style={{ borderColor: '#e2e8f3', color: '#0f1729' }}
      {...props}
    />
  ),
);
AuthInput.displayName = 'AuthInput';
