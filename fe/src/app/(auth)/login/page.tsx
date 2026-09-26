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
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-100 dark:bg-sky-950/60 text-[#0070F3] dark:text-[#38BDF8] border border-sky-200/50 dark:border-sky-800/40">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
          AUTH-02
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Đăng nhập
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="font-semibold text-[#0070F3] dark:text-[#38BDF8] hover:underline">
            Đăng ký miễn phí
          </Link>
        </p>
      </div>

      {wasVerified && (
        <div className="mb-5 rounded-xl border border-emerald-300 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 font-medium">
          ✓ Email đã xác thực thành công. Đăng nhập để tiếp tục.
        </div>
      )}

      {wasReset && (
        <div className="mb-5 rounded-xl border border-emerald-300 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 font-medium">
          ✓ Mật khẩu đã được đặt lại thành công. Đăng nhập với mật khẩu mới.
        </div>
      )}

      {error && (
        <div
          className="mb-5 rounded-xl border px-4 py-3 text-sm font-medium"
          style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
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
            className="text-xs sm:text-sm font-semibold text-[#0070F3] dark:text-[#38BDF8] hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all bg-gradient-to-r from-[#1877F2] to-[#00A3FF] hover:brightness-110 shadow-lg shadow-[#00A3FF]/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
        >
          {isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>

      {/* Vai trò gợi ý */}
      <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-white/10">
        <div className="mb-3 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Tài khoản tự động điều hướng theo vai trò
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <RoleHint
            emoji="🎒"
            title="Traveler"
            desc="Thuê đồ & trải nghiệm"
          />
          <RoleHint
            emoji="🏕️"
            title="Provider"
            desc="Cho thuê đồ & shop"
          />
        </div>
      </div>
    </>
  );
}

function RoleHint({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#16223B]/70 px-3 py-2.5 text-center transition-all">
      <div className="text-lg leading-none">{emoji}</div>
      <div className="mt-1 text-xs font-bold text-slate-800 dark:text-white">{title}</div>
      <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{desc}</div>
    </div>
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
      <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
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
