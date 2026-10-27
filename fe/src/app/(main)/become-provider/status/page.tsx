'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Clock, Loader2, RefreshCw, Store, TriangleAlert } from 'lucide-react';
import { userApi } from '@/lib/api/client';
import { LISTING_CATEGORIES } from '@/constants/categories';
import { useAuthStore } from '@/store/auth.store';
import { useProviderEntry } from '@/hooks/useProviderApplication';
import type { ProviderEntryState } from '@/hooks/useProviderApplication';

const dateFmt = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const HEADLINE: Record<Exclude<ProviderEntryState, 'NONE'>, { title: string; body: string }> = {
  PENDING: {
    title: 'Hồ sơ của bạn đang được xem xét',
    body: 'Quản trị viên FlexTrip đang xem xét đăng ký. Trạng thái sẽ được cập nhật ngay tại trang này.',
  },
  NEEDS_UPDATE: {
    title: 'Hồ sơ cần được bổ sung',
    body: 'Hồ sơ chưa được duyệt. Hãy xem ghi chú bên dưới, cập nhật thông tin rồi gửi lại.',
  },
  APPROVED: {
    title: 'Đăng ký của bạn đã được duyệt',
    body: 'Tài khoản của bạn đã có quyền Provider. Bạn có thể vào trang quản lý để đăng thiết bị.',
  },
};

export default function ProviderStatusPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { entry, application, isLoading } = useProviderEntry();

  useEffect(() => {
    if (!isLoading && entry.state === 'NONE') router.replace('/become-provider');
  }, [isLoading, entry.state, router]);

  // Roles in the cached profile are from login time; refresh so the Provider area opens right after approval.
  useEffect(() => {
    if (entry.state !== 'APPROVED' || user?.roles.includes('PROVIDER')) return;
    userApi.me().then(setUser).catch(() => undefined);
  }, [entry.state, user?.roles, setUser]);

  if (isLoading || entry.state === 'NONE') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F1FAFF] pt-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </main>
    );
  }

  const state = entry.state;
  const headline = HEADLINE[state];
  const categoryLabels = (application?.categories ?? []).map(
    (value) => LISTING_CATEGORIES.find((c) => c.value === value)?.label ?? value,
  );

  const steps = [
    { title: 'Đã gửi đăng ký', note: application ? dateFmt.format(new Date(application.createdAt)) : '', done: true },
    {
      title: 'FlexTrip xem xét',
      note: state === 'PENDING' ? 'Đang xử lý' : 'Hoàn thành',
      done: state !== 'PENDING',
      active: state === 'PENDING',
    },
    {
      title: 'Kết quả',
      note: state === 'APPROVED' ? 'Đã duyệt' : state === 'NEEDS_UPDATE' ? 'Cần bổ sung' : 'Chờ kết quả',
      done: state === 'APPROVED',
      warn: state === 'NEEDS_UPDATE',
    },
  ];

  return (
    <main className="min-h-screen bg-[#F1FAFF] pb-16 pt-24 text-slate-900 sm:pt-28">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-card sm:p-8">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              state === 'APPROVED'
                ? 'bg-emerald-50 text-emerald-600'
                : state === 'NEEDS_UPDATE'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-sky-50 text-brand-blue'
            }`}
          >
            {state === 'APPROVED' ? <Check className="h-6 w-6" /> : state === 'NEEDS_UPDATE' ? <TriangleAlert className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
          </span>
          <h1 className="mt-4 !text-2xl font-extrabold tracking-tight text-ink sm:!text-3xl">{headline.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{headline.body}</p>

          {state === 'NEEDS_UPDATE' && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              <b>Ghi chú từ quản trị viên:</b> {application?.adminNote?.trim() || 'Chưa có ghi chú chi tiết.'}
            </p>
          )}

          <ol className="mt-6 space-y-4 border-t border-sky-100 pt-6">
            {steps.map(({ title, note, done, active, warn }, i) => (
              <li key={title} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : warn
                        ? 'bg-amber-500 text-white'
                        : active
                          ? 'bg-brand text-white ring-4 ring-brand/20'
                          : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : warn ? '!' : i + 1}
                </span>
                <span>
                  <span className="block text-sm font-bold text-ink">{title}</span>
                  <span className="block text-sm text-slate-500">{note}</span>
                </span>
              </li>
            ))}
          </ol>

          {application && (
            <dl className="mt-6 grid gap-3 rounded-2xl bg-sky-50/60 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Khu vực</dt>
                <dd className="mt-0.5 font-semibold text-ink">{application.city}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Loại thiết bị</dt>
                <dd className="mt-0.5 font-semibold text-ink">{categoryLabels.join(', ') || '—'}</dd>
              </div>
            </dl>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {state === 'APPROVED' && (
              <Link href="/dashboard" className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-blue">
                <Store className="h-4 w-4" /> Chuyển sang Provider <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {state === 'NEEDS_UPDATE' && (
              <Link href="/become-provider/apply" className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-blue">
                <RefreshCw className="h-4 w-4" /> Bổ sung hồ sơ
              </Link>
            )}
            <Link href="/" className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-ink transition-colors hover:bg-slate-50">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
