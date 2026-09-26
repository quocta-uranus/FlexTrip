'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/lib/validators/auth.schema';
import { useRegister, useVerifyOtp, useResendOtp } from '@/hooks/useAuthMutations';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const { mutate: register, data: registerResult, isPending, error } = useRegister();
  const { mutate: verifyOtp, isPending: verifying, error: otpError } = useVerifyOtp();
  const { mutate: resendOtp, isPending: resending } = useResendOtp();

  // Keep track of email for OTP step
  const field = (name: keyof RegisterInput) => {
    const f = registerField(name);
    if (name === 'email') {
      return {
        ...f,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          setEmail(e.target.value);
          return f.onChange(e);
        },
      };
    }
    return f;
  };

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Focus first OTP cell on step change
  useEffect(() => {
    if (registerResult) {
      inputRefs.current[0]?.focus();
      setCooldown(60);
    }
  }, [registerResult]);

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      inputRefs.current[5]?.focus();
    }
  }

  const otpCode = otp.join('');

  // ── OTP input state (after register) ────────────────────────────
  if (registerResult) {
    return (
      <>
        <div className="mb-7">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-100 dark:bg-sky-950/60 text-[#0070F3] dark:text-[#38BDF8] border border-sky-200/50 dark:border-sky-800/40">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
            AUTH-01
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Nhập mã xác thực
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Mã OTP 6 chữ số đã được gửi tới{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{email}</span>
          </p>
        </div>

        {otpError && (
          <div
            className="mb-5 rounded-xl border px-4 py-3 text-sm font-medium"
            style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
          >
            {otpError.message}
          </div>
        )}

        {/* OTP 6-cell input */}
        <div className="mb-6 flex justify-center gap-2.5 sm:gap-3" onPaste={handleOtpPaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              className="h-14 w-12 rounded-xl border text-center text-xl font-bold outline-none transition-all border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16223B] text-slate-900 dark:text-white focus:border-[#0070F3] dark:focus:border-[#38BDF8] focus:bg-white dark:focus:bg-[#1A2946] focus:ring-4 focus:ring-[#0070F3]/15 dark:focus:ring-[#38BDF8]/20"
            />
          ))}
        </div>

        <button
          onClick={() => verifyOtp({ email, code: otpCode })}
          disabled={otpCode.length < 6 || verifying}
          className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all bg-gradient-to-r from-[#1877F2] to-[#00A3FF] hover:brightness-110 shadow-lg shadow-[#00A3FF]/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {verifying ? 'Đang xác thực…' : 'Xác nhận'}
        </button>

        <div className="mt-5 text-center">
          {cooldown > 0 ? (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Gửi lại sau <strong className="text-slate-700 dark:text-slate-200">{cooldown}s</strong>
            </span>
          ) : (
            <button
              onClick={() => { resendOtp(email); setCooldown(60); }}
              disabled={resending}
              className="text-sm font-semibold text-[#0070F3] dark:text-[#38BDF8] hover:underline"
            >
              {resending ? 'Đang gửi…' : 'Gửi lại mã'}
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Sai email?{' '}
          <Link href="/register" className="font-semibold text-[#0070F3] dark:text-[#38BDF8] hover:underline">
            Đăng ký lại
          </Link>
        </p>
      </>
    );
  }

  // ── Register form ────────────────────────────────────────────────
  return (
    <>
      <div className="mb-7">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-100 dark:bg-sky-950/60 text-[#0070F3] dark:text-[#38BDF8] border border-sky-200/50 dark:border-sky-800/40">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
          AUTH-01
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Tạo tài khoản
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-semibold text-[#0070F3] dark:text-[#38BDF8] hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>

      {error && (
        <div
          className="mb-5 rounded-xl border px-4 py-3 text-sm font-medium"
          style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
        >
          {error.message}
        </div>
      )}

      <form
        onSubmit={handleSubmit(({ name, email, phone, password }) =>
          register({ name, email, password, phone: phone || undefined })
        )}
        className="space-y-4"
      >
        <AuthField label="Họ và tên" error={errors.name?.message}>
          <AuthInput {...field('name')} placeholder="Nguyễn Văn A" autoComplete="name" />
        </AuthField>

        <AuthField label="Email" error={errors.email?.message}>
          <AuthInput
            {...field('email')}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </AuthField>

        <AuthField label="Số điện thoại" error={errors.phone?.message}>
          <AuthInput
            {...field('phone')}
            type="tel"
            placeholder="+84 912 345 678 (không bắt buộc)"
            autoComplete="tel"
          />
        </AuthField>

        <AuthField label="Mật khẩu" error={errors.password?.message}>
          <AuthInput
            {...field('password')}
            type="password"
            placeholder="Ít nhất 8 ký tự"
            autoComplete="new-password"
          />
        </AuthField>

        <AuthField label="Xác nhận mật khẩu" error={errors.confirmPassword?.message}>
          <AuthInput
            {...field('confirmPassword')}
            type="password"
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
          />
        </AuthField>

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all bg-gradient-to-r from-[#1877F2] to-[#00A3FF] hover:brightness-110 shadow-lg shadow-[#00A3FF]/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
        >
          {isPending ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
        Bằng cách đăng ký, bạn đồng ý với{' '}
        <span className="font-semibold text-[#0070F3] dark:text-[#38BDF8] cursor-pointer hover:underline">
          Điều khoản dịch vụ
        </span>{' '}
        và{' '}
        <span className="font-semibold text-[#0070F3] dark:text-[#38BDF8] cursor-pointer hover:underline">
          Chính sách bảo mật
        </span>.
      </p>
    </>
  );
}

// ─── Shared auth field components ────────────────────────────────────────────

import { forwardRef, type InputHTMLAttributes } from 'react';
import type { ReactNode } from 'react';

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
