'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api/client';

function SetupPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Link không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ support@flextrip.vn.');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setLoading(true);
    try {
      await authApi.setupPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('INVALID_SETUP_TOKEN') || msg.includes('invalid')) {
        setError('Link đã hết hạn hoặc đã được sử dụng. Vui lòng liên hệ support@flextrip.vn.');
      } else {
        setError('Đã có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ support@flextrip.vn.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0f1729 0%, #1a3f7a 50%, #2a7bd9 100%)' }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
        {done ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-4xl"
              style={{ background: 'rgba(34,197,94,0.1)' }}
            >
              ✅
            </div>
            <h2 className="text-xl font-bold" style={{ color: '#0f1729' }}>
              Mật khẩu đã được tạo!
            </h2>
            <p className="leading-relaxed" style={{ color: '#5a6b85' }}>
              Tài khoản Provider của bạn đã sẵn sàng.
              Đang chuyển đến trang đăng nhập...
            </p>
            <Link
              href="/login"
              className="mt-2 rounded-2xl px-8 py-3 text-sm font-bold text-white transition-all hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1e5aa8, #2a7bd9)' }}
            >
              Đăng nhập ngay →
            </Link>
          </div>
        ) : (
          <>
            {/* Logo / Brand */}
            <div className="mb-6 text-center">
              <span
                className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
                style={{ background: 'rgba(42,123,217,0.1)', color: '#2a7bd9' }}
              >
                FlexTrip Provider
              </span>
              <h1 className="text-2xl font-bold" style={{ color: '#0f1729' }}>
                Tạo mật khẩu của bạn
              </h1>
              <p className="mt-2 text-sm" style={{ color: '#5a6b85' }}>
                Tài khoản Provider đã được phê duyệt.
                Đặt mật khẩu để bắt đầu đăng tin cho thuê.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{ color: '#0f1729' }}>
                  Mật khẩu mới *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ít nhất 8 ký tự"
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-200"
                  style={{ borderColor: '#e2e8f3' }}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{ color: '#0f1729' }}>
                  Nhập lại mật khẩu *
                </label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-200"
                  style={{ borderColor: '#e2e8f3' }}
                />
              </div>

              {error && (
                <p
                  className="rounded-xl px-4 py-3 text-sm font-medium"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all hover:scale-[1.01] hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: 'linear-gradient(135deg, #1e5aa8, #2a7bd9)' }}
              >
                {loading ? 'Đang tạo mật khẩu...' : 'Xác nhận & Đăng nhập →'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs" style={{ color: '#8694ad' }}>
              Gặp sự cố?{' '}
              <a href="mailto:support@flextrip.vn" className="underline" style={{ color: '#2a7bd9' }}>
                Liên hệ support@flextrip.vn
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense>
      <SetupPasswordForm />
    </Suspense>
  );
}
