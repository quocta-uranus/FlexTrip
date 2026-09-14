'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/lib/validators/auth.schema';
import { useRegister, useVerifyOtp, useResendOtp } from '@/hooks/useAuthMutations';

export default function RegisterPage() {
  const { mutate: register, isPending, error, data: registerResult } = useRegister();
  const { mutate: verifyOtp, isPending: verifying, error: otpError, isSuccess: otpSuccess } = useVerifyOtp();
  const { mutate: resendOtp, isPending: resending, isSuccess: resent } = useResendOtp();

  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  // OTP input state — 6 individual cells
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer after resend
  useEffect(() => {
    if (!resent) return;
    setCooldown(60);
  }, [resent]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const otpCode = otp.join('');
  const email = registerResult?.email ?? '';

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = [...otp];
    pasted.split('').forEach((ch, i) => { if (i < 6) next[i] = ch; });
    setOtp(next);
    const lastFilled = Math.min(pasted.length, 5);
    inputRefs.current[lastFilled]?.focus();
  }

  // ── OTP verify success state ─────────────────────────────────────
  if (otpSuccess) {
    return (
      <div className="text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'rgba(146,238,232,0.2)' }}
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="#2a7bd9" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold" style={{ color: '#0f1729' }}>Email đã xác thực!</h2>
        <p className="mt-2 text-sm" style={{ color: '#5a6b85' }}>
          Tài khoản của bạn đã được kích hoạt. Đăng nhập để bắt đầu.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
          style={{ background: '#2a7bd9' }}
        >
          Đến trang đăng nhập
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    );
  }

  // ── OTP input state (after register) ────────────────────────────
  if (registerResult) {
    return (
      <>
        <div className="mb-7">
          <div
            className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: '#2a7bd9' }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#92eee8]" />
            AUTH-01
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f1729' }}>Nhập mã xác thực</h1>
          <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>
            Mã OTP 6 chữ số đã được gửi tới{' '}
            <span className="font-semibold" style={{ color: '#0f1729' }}>{email}</span>
          </p>
        </div>

        {otpError && (
          <div
            className="mb-5 rounded-lg border px-4 py-3 text-sm"
            style={{ borderColor: '#fca5a5', background: '#fef2f2', color: '#dc2626' }}
          >
            {otpError.message}
          </div>
        )}

        {/* OTP 6-cell input */}
        <div className="mb-6 flex justify-center gap-3" onPaste={handleOtpPaste}>
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
              className="h-14 w-12 rounded-xl border text-center text-xl font-bold outline-none transition-all focus:ring-2 focus:ring-[#2a7bd9]/30"
              style={{
                borderColor: digit ? '#2a7bd9' : '#e2e8f3',
                color: '#0f1729',
                background: digit ? 'rgba(42,123,217,0.04)' : '#fff',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => verifyOtp({ email, code: otpCode })}
          disabled={otpCode.length < 6 || verifying}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: '#2a7bd9', boxShadow: '0 8px 20px -8px rgba(42,123,217,0.5)' }}
        >
          {verifying ? 'Đang xác thực…' : 'Xác nhận'}
        </button>

        <div className="mt-5 text-center">
          {cooldown > 0 ? (
            <span className="text-sm" style={{ color: '#8694ad' }}>
              Gửi lại sau <strong style={{ color: '#5a6b85' }}>{cooldown}s</strong>
            </span>
          ) : (
            <button
              onClick={() => { resendOtp(email); setCooldown(60); }}
              disabled={resending}
              className="text-sm font-semibold"
              style={{ color: '#2a7bd9' }}
            >
              {resending ? 'Đang gửi…' : 'Gửi lại mã'}
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: '#8694ad' }}>
          Sai email?{' '}
          <Link href="/register" className="font-medium" style={{ color: '#2a7bd9' }}>
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
        <div
          className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: '#2a7bd9' }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#92eee8]" />
          AUTH-01
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#0f1729' }}>Tạo tài khoản</h1>
        <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-semibold" style={{ color: '#2a7bd9' }}>
            Đăng nhập
          </Link>
        </p>
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
          className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: '#2a7bd9', boxShadow: '0 8px 20px -8px rgba(42,123,217,0.5)' }}
        >
          {isPending ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
        </button>
      </form>

      <p className="mt-5 text-center text-xs" style={{ color: '#8694ad' }}>
        Bằng cách đăng ký, bạn đồng ý với{' '}
        <span className="font-medium" style={{ color: '#2a7bd9' }}>Điều khoản dịch vụ</span>
        {' '}và{' '}
        <span className="font-medium" style={{ color: '#2a7bd9' }}>Chính sách bảo mật</span>.
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
      <label className="mb-1.5 block text-sm font-medium" style={{ color: '#0f1729' }}>
        {label}
      </label>
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
