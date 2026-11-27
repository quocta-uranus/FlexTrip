'use client';

import Link from 'next/link';
import { CircleCheck, Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, Ticket, User, type LucideIcon } from 'lucide-react';
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
    setValue,
    watch,
    formState: { errors, touchedFields },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema), mode: 'onTouched' });

  const [showPassword, setShowPassword] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const passwordValue = watch('password') ?? '';
  const confirmValue = watch('confirmPassword') ?? '';
  const confirmMatches = confirmValue.length > 0 && confirmValue === passwordValue;
  // The schema only reports a mismatch once every other field is valid, so it is also checked here.
  const confirmError =
    errors.confirmPassword?.message ??
    (touchedFields.confirmPassword && confirmValue && !confirmMatches ? 'Mật khẩu xác nhận không khớp' : undefined);

  // Đọc ?ref= sau khi mount thay vì useSearchParams để trang không cần Suspense
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) {
      setValue('referralCode', ref.toUpperCase());
      setShowReferral(true);
    }
  }, [setValue]);

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
            Đăng ký
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#0f1729' }}>Tạo tài khoản</h1>
        <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>
          Thuê đồ du lịch dễ dàng chỉ với vài bước.
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
        onSubmit={handleSubmit(({ name, email, phone, password, referralCode }) =>
          register({ name, email, password, phone: phone || undefined, referralCode: referralCode || undefined })
        )}
        className="space-y-4"
      >
        <AuthField label="Họ và tên" error={errors.name?.message}>
          <IconInput icon={User}>
            <AuthInput {...field('name')} placeholder="Nguyễn Văn A" autoComplete="name" className="pl-10" />
          </IconInput>
        </AuthField>

        <AuthField label="Email" error={errors.email?.message}>
          <IconInput icon={Mail}>
            <AuthInput
              {...field('email')}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="pl-10"
            />
          </IconInput>
        </AuthField>

        <AuthField
          label={<>Số điện thoại <span className="font-normal" style={{ color: '#8694ad' }}>(không bắt buộc)</span></>}
          error={errors.phone?.message}
        >
          <IconInput icon={Phone}>
            <AuthInput
              {...field('phone')}
              type="tel"
              placeholder="+84 912 345 678"
              autoComplete="tel"
              className="pl-10"
            />
          </IconInput>
        </AuthField>

        <AuthField label="Mật khẩu" error={errors.password?.message}>
          <IconInput icon={Lock}>
            <AuthInput
              {...field('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Ít nhất 8 ký tự"
              autoComplete="new-password"
              className="pl-10 pr-10"
            />
            <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </IconInput>
        </AuthField>

        <AuthField label="Xác nhận mật khẩu" error={confirmError}>
          <IconInput icon={confirmMatches ? CircleCheck : ShieldCheck} color={confirmMatches ? '#16a34a' : undefined}>
            <AuthInput
              {...field('confirmPassword')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
              className="pl-10 pr-10"
            />
            <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </IconInput>
        </AuthField>

        {showReferral || errors.referralCode ? (
          <AuthField label="Mã giới thiệu" error={errors.referralCode?.message}>
            <IconInput icon={Ticket}>
              <AuthInput
                {...field('referralCode')}
                placeholder="Nhập mã giới thiệu"
                autoComplete="off"
                className="pl-10"
              />
            </IconInput>
          </AuthField>
        ) : (
          <button
            type="button"
            onClick={() => setShowReferral(true)}
            className="flex items-center gap-1.5 text-sm font-medium"
            style={{ color: '#2a7bd9' }}
          >
            <Ticket className="h-4 w-4" aria-hidden="true" />
            Bạn có mã giới thiệu?
          </button>
        )}

        <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed" style={{ color: '#5a6b85' }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-[#2a7bd9]"
          />
          <span>
            Tôi đã đọc và đồng ý với{' '}
            <Link href="/terms" target="_blank" className="font-medium hover:underline" style={{ color: '#2a7bd9' }}>
              Điều khoản dịch vụ
            </Link>
            {' '}và{' '}
            <Link href="/privacy" target="_blank" className="font-medium hover:underline" style={{ color: '#2a7bd9' }}>
              Chính sách bảo mật
            </Link>{' '}
            của FlexTrip.
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending || !agreed}
          className="h-11 w-full rounded-xl text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: '#2a7bd9', boxShadow: agreed ? '0 8px 20px -8px rgba(42,123,217,0.5)' : 'none' }}
        >
          {isPending ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm" style={{ color: '#5a6b85' }}>
        Đã có tài khoản?{' '}
        <Link href="/login" className="font-semibold" style={{ color: '#2a7bd9' }}>
          Đăng nhập
        </Link>
      </p>
    </>
  );
}

// ─── Shared auth field components ────────────────────────────────────────────

import { forwardRef, type InputHTMLAttributes } from 'react';
import type { ReactNode } from 'react';

function IconInput({ icon: Icon, color, children }: { icon: LucideIcon; color?: string; children: ReactNode }) {
  return (
    <div className="relative">
      <Icon
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
        style={{ color: color ?? '#8694ad' }}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors hover:bg-slate-100"
      style={{ color: '#5a6b85' }}
    >
      {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

function AuthField({ label, error, children }: { label: ReactNode; error?: string; children: ReactNode }) {
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
