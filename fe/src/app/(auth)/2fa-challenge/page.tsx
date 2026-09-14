'use client';

import { forwardRef, type InputHTMLAttributes, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { twoFactorLoginSchema, type TwoFactorLoginInput } from '@/lib/validators/auth.schema';
import { useVerify2faLogin } from '@/hooks/useAuthMutations';

function TwoFactorChallengeForm() {
  const searchParams = useSearchParams();
  const challengeToken = searchParams.get('token') ?? '';
  const { mutate, isPending, error } = useVerify2faLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TwoFactorLoginInput>({
    resolver: zodResolver(twoFactorLoginSchema),
    defaultValues: { challengeToken },
  });

  return (
    <>
      <div className="mb-7 text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'rgba(42,123,217,0.1)' }}
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="#2a7bd9" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div
          className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: '#2a7bd9' }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#92eee8]" />
          AUTH-04
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#0f1729' }}>Xác thực 2 bước</h1>
        <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>
          Nhập mã 6 chữ số từ ứng dụng Authenticator của bạn.
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
        onSubmit={handleSubmit((d) => mutate({ challengeToken: d.challengeToken, code: d.code }))}
        className="space-y-5"
      >
        <input type="hidden" {...register('challengeToken')} />

        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: '#0f1729' }}>
            Mã xác thực
          </label>
          <TotpInput {...register('code')} />
          {errors.code && (
            <p className="mt-1 text-xs" style={{ color: '#dc2626' }}>{errors.code.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: '#2a7bd9', boxShadow: '0 8px 20px -8px rgba(42,123,217,0.5)' }}
        >
          {isPending ? 'Đang xác thực…' : 'Xác nhận'}
        </button>
      </form>

      <p className="mt-5 text-center text-xs" style={{ color: '#8694ad' }}>
        Mất thiết bị? Dùng{' '}
        <span className="font-medium" style={{ color: '#2a7bd9' }}>mã khôi phục</span>
        {' '}được cấp khi bật 2FA.
      </p>
    </>
  );
}

export default function TwoFactorChallengePage() {
  return (
    <Suspense>
      <TwoFactorChallengeForm />
    </Suspense>
  );
}

const TotpInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ ...props }, ref) => (
    <input
      ref={ref}
      inputMode="numeric"
      maxLength={6}
      placeholder="000000"
      className="w-full rounded-lg border bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] outline-none transition-all focus:ring-2 focus:ring-[#2a7bd9]/30"
      style={{ borderColor: '#e2e8f3', color: '#0f1729', letterSpacing: '0.4em' }}
      {...props}
    />
  ),
);
TotpInput.displayName = 'TotpInput';
