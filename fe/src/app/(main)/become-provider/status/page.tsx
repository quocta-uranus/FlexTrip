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
import { actionButtonClass } from '@/components/staff/action-button';
import { DialogBand, DialogFooterBar, FormSection, type DialogTone } from '@/components/staff/dialog-parts';

const dateFmt = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

type ShownState = Exclude<ProviderEntryState, 'NONE'>;

const VIEW: Record<ShownState, { title: string; body: string; badge: string; badgeClass: string; tone: DialogTone }> = {
  PENDING: {
    title: 'Hồ sơ của bạn đang được xem xét',
    body: 'Quản trị viên FlexTrip đang xem xét đăng ký. Bạn sẽ nhận thông báo khi có kết quả.',
    badge: 'Chờ duyệt',
    badgeClass: 'bg-amber-100 text-amber-800',
    tone: 'blue',
  },
  NEEDS_UPDATE: {
    title: 'Hồ sơ chưa được duyệt',
    body: 'Hãy xem lý do bên dưới, chỉnh lại thông tin rồi gửi lại.',
    badge: 'Chưa duyệt',
    badgeClass: 'bg-red-100 text-red-700',
    tone: 'amber',
  },
  APPROVED: {
    title: 'Đăng ký của bạn đã được duyệt',
    body: 'Tài khoản của bạn đã có quyền Provider. Bạn có thể vào trang quản lý để đăng thiết bị.',
    badge: 'Đã duyệt',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    tone: 'emerald',
  },
};

const ICON: Record<ShownState, React.ReactNode> = {
  PENDING: <Clock className="h-5 w-5" />,
  NEEDS_UPDATE: <TriangleAlert className="h-5 w-5" />,
  APPROVED: <Check className="h-5 w-5" />,
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
  const view = VIEW[state];
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
      note: state === 'APPROVED' ? 'Đã duyệt' : state === 'NEEDS_UPDATE' ? 'Chưa được duyệt' : 'Chờ kết quả',
      done: state === 'APPROVED',
      warn: state === 'NEEDS_UPDATE',
    },
  ];

  const rows: Array<[string, string]> = application
    ? [
        ['Họ và tên', application.name],
        ['Số điện thoại', application.phone],
        ['Email', application.email],
        ['Khu vực', application.city],
        ['Loại thiết bị', categoryLabels.join(', ') || '—'],
      ]
    : [];

  // Returned applications lead with the reason, so the progress list is only shown while the result is still open or good news.
  let step = 0;
  const nextStep = () => ++step;

  return (
    <main className="min-h-screen bg-[#F1FAFF] pb-16 pt-24 text-slate-900 sm:pt-28">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-card">
          <DialogBand
            tone={view.tone}
            icon={ICON[state]}
            title={
              <span className="flex flex-wrap items-center gap-2">
                {view.title}
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${view.badgeClass}`}>{view.badge}</span>
              </span>
            }
            description={view.body}
          />

          <div className="space-y-5 px-6 pb-5 pt-1">
            {state === 'NEEDS_UPDATE' && (
              <FormSection step={nextStep()} title="Lý do từ chối">
                <p className="rounded-[13px] bg-amber-50 p-3.5 text-sm leading-relaxed text-amber-800">
                  <b>Ghi chú từ quản trị viên:</b> {application?.adminNote?.trim() || 'Chưa có ghi chú chi tiết.'}
                </p>
              </FormSection>
            )}

            {state !== 'NEEDS_UPDATE' && (
              <FormSection step={nextStep()} title="Tiến trình">
                <ol className="flex flex-wrap gap-x-6 gap-y-3">
                  {steps.map(({ title, note, done, active, warn }, i) => (
                    <li key={title} className="flex items-center gap-2.5">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          done
                            ? 'bg-emerald-500 text-white'
                            : warn
                              ? 'bg-amber-500 text-white'
                              : active
                                ? 'bg-brand text-white ring-4 ring-brand/20'
                                : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : warn ? '!' : i + 1}
                      </span>
                      <span className="text-sm">
                        <span className="font-semibold text-ink">{title}</span>
                        {note && <span className="text-slate-500"> · {note}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              </FormSection>
            )}

            {application && (
              <FormSection step={nextStep()} title="Thông tin đã gửi">
                <dl className="overflow-hidden rounded-[13px] border border-slate-200 text-sm">
                  {rows.map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] border-b border-slate-100 last:border-b-0">
                      <dt className="bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">{label}</dt>
                      <dd className="break-words px-3.5 py-2.5 font-medium text-slate-900">{value}</dd>
                    </div>
                  ))}
                  {application.description?.trim() && (
                    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] border-t border-slate-100">
                      <dt className="bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">Giới thiệu</dt>
                      <dd className="whitespace-pre-line break-words px-3.5 py-2.5 font-medium text-slate-900">{application.description}</dd>
                    </div>
                  )}
                </dl>
              </FormSection>
            )}
          </div>

          <DialogFooterBar hint={state === 'NEEDS_UPDATE' ? 'Form gửi lại sẽ điền sẵn thông tin này' : undefined}>
            <Link href="/" className={actionButtonClass('neutral')}>Về trang chủ</Link>
            <Link href="/become-provider" className={actionButtonClass('neutral')}>Xem lại thông tin về Provider</Link>
            {state === 'APPROVED' && (
              <Link href="/dashboard" className={actionButtonClass('primary-emerald')}>
                <Store className="h-[18px] w-[18px]" /> Chuyển sang Provider <ArrowRight className="h-[18px] w-[18px]" />
              </Link>
            )}
            {state === 'NEEDS_UPDATE' && (
              <Link href="/become-provider/apply" className={actionButtonClass('primary-blue')}>
                <RefreshCw className="h-[18px] w-[18px]" /> Gửi lại hồ sơ
              </Link>
            )}
          </DialogFooterBar>
        </div>
      </div>
    </main>
  );
}
