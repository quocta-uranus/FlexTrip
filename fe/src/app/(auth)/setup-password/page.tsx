'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { setupPasswordSchema, type SetupPasswordInput } from '@/lib/validators/auth.schema';
import { useSetupPassword } from '@/hooks/useAuthMutations';
import type { ApiError } from '@/lib/api/client';

function SetupPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const router = useRouter();
  const { mutate, isPending } = useSetupPassword();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupPasswordInput>({
    resolver: zodResolver(setupPasswordSchema),
    defaultValues: { token },
  });

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-sm text-[#5a6b85]">Link không hợp lệ.</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-[#2a7bd9]">
          Về trang đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-7">
        <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#2a7bd9]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#92eee8]" />
          TÀI KHOẢN MỚI
        </div>
        <h1 className="text-2xl font-bold text-[#0f1729]">Tạo mật khẩu</h1>
        <p className="mt-1 text-sm text-[#5a6b85]">Đặt mật khẩu để kích hoạt tài khoản FlexTrip của bạn.</p>
      </div>

      {formError && (
        <div className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600">
          {formError}
        </div>
      )}

      <form
        onSubmit={handleSubmit((d) => {
          setFormError(null);
          mutate(
            { token: d.token, password: d.password },
            {
              onSuccess: () => router.replace('/login?setup=1'),
              onError: (err) => {
                const apiErr = err as ApiError;
                if (apiErr.code === 'INVALID_SETUP_TOKEN') {
                  setFormError('Link đã hết hạn hoặc đã được dùng. Liên hệ quản trị viên để được gửi lại.');
                } else {
                  setFormError(apiErr.message || 'Đã có lỗi xảy ra');
                }
              },
            },
          );
        })}
        className="space-y-4"
      >
        <input type="hidden" {...register('token')} />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#0f1729]">Mật khẩu</label>
          <input
            {...register('password')}
            type="password"
            placeholder="Ít nhất 8 ký tự"
            autoComplete="new-password"
            className="w-full rounded-lg border border-[#e2e8f3] bg-white px-4 py-2.5 text-sm text-[#0f1729] outline-none transition-all placeholder:text-[#8694ad] focus:ring-2 focus:ring-[#2a7bd9]/30"
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#0f1729]">Xác nhận mật khẩu</label>
          <input
            {...register('confirmPassword')}
            type="password"
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
            className="w-full rounded-lg border border-[#e2e8f3] bg-white px-4 py-2.5 text-sm text-[#0f1729] outline-none transition-all placeholder:text-[#8694ad] focus:ring-2 focus:ring-[#2a7bd9]/30"
          />
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-[#2a7bd9] py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(42,123,217,0.5)] transition-opacity disabled:opacity-60"
        >
          {isPending ? 'Đang lưu…' : 'Tạo mật khẩu'}
        </button>
      </form>
    </>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense>
      <SetupPasswordForm />
    </Suspense>
  );
}
