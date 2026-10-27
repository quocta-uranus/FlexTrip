'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Pencil, UserRound } from 'lucide-react';
import { providerApplicationApi } from '@/lib/api/client';
import { providerApplicationSchema, type ProviderApplicationInput } from '@/lib/validators/provider-application.schema';
import { LISTING_CATEGORIES } from '@/constants/categories';
import { useAuthStore } from '@/store/auth.store';
import { useProviderEntry } from '@/hooks/useProviderApplication';

const CITIES = [
  'TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Đà Lạt', 'Nha Trang', 'Hội An', 'Huế',
  'Hải Phòng', 'Cần Thơ', 'Quy Nhơn', 'Phan Thiết', 'Vũng Tàu', 'Khác',
];

const STEPS = [
  { title: 'Thông tin liên hệ', fields: ['name', 'phone'] as const },
  { title: 'Thiết bị cho thuê', fields: ['city', 'categories', 'description'] as const },
  { title: 'Xem lại và gửi', fields: [] as const },
];

const FIELD =
  'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20';
const LABEL = 'mb-1.5 block text-sm font-semibold text-ink';
const ERROR = 'mt-1.5 text-xs text-danger';

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {STEPS.map(({ title }, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={title} className="flex flex-1 items-center gap-2 sm:gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done ? 'bg-emerald-500 text-white' : active ? 'bg-brand text-white ring-4 ring-brand/20' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`hidden text-sm font-semibold sm:block ${active ? 'text-ink' : 'text-slate-500'}`}>{title}</span>
            {i < STEPS.length - 1 && <span className={`h-px flex-1 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function ApplyProviderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { entry, application, isLoading } = useProviderEntry();
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<ProviderApplicationInput>({
    resolver: zodResolver(providerApplicationSchema),
    defaultValues: { name: '', phone: '', city: '', categories: [], description: '' },
  });
  const values = useWatch({ control }) as ProviderApplicationInput;

  // The account is already known, so contact details start filled in.
  useEffect(() => {
    if (user) reset((current) => ({ ...current, name: user.name, phone: user.phone ?? '' }));
  }, [user, reset]);

  // Resubmitting is only for a first application or one that came back for changes.
  useEffect(() => {
    if (!isLoading && (entry.state === 'PENDING' || entry.state === 'APPROVED')) {
      router.replace(entry.state === 'PENDING' ? '/become-provider/status' : '/dashboard');
    }
  }, [isLoading, entry.state, router]);

  async function goNext() {
    if (await trigger([...STEPS[step].fields])) setStep((s) => s + 1);
  }

  async function onSubmit(data: ProviderApplicationInput) {
    if (!user) return;
    setSubmitError(null);
    try {
      await providerApplicationApi.submit({
        name: data.name,
        phone: data.phone,
        email: user.email,
        city: data.city,
        categories: data.categories,
        description: data.description || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['provider-application', 'mine'] });
      router.push('/become-provider/status');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không gửi được đăng ký. Vui lòng thử lại.');
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F1FAFF] px-4 pt-24">
        <div className="rounded-3xl border border-sky-100 bg-white p-8 text-center shadow-soft">
          <p className="text-sm text-slate-600">Bạn cần đăng nhập để đăng ký trở thành Provider.</p>
          <Link href="/login" className="mt-4 inline-flex h-10 items-center rounded-full bg-brand px-6 text-sm font-semibold text-white">
            Đăng nhập
          </Link>
        </div>
      </main>
    );
  }

  const categoryLabels = values.categories.map((v) => LISTING_CATEGORIES.find((c) => c.value === v)?.label ?? v);
  const primaryBtn =
    'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-7 text-sm font-semibold text-white shadow-md shadow-brand/30 transition-colors hover:bg-brand-blue disabled:opacity-60';
  const ghostBtn =
    'inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-ink transition-colors hover:bg-slate-50';

  return (
    <main className="min-h-screen bg-[#F1FAFF] pb-16 pt-24 text-slate-900 sm:pt-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Link href="/become-provider" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline">
          <ArrowLeft className="h-4 w-4" /> Quay lại giới thiệu
        </Link>

        <div className="mt-4">
          <h1 className="!text-2xl font-extrabold tracking-tight text-ink sm:!text-3xl">
            {entry.state === 'NEEDS_UPDATE' ? 'Bổ sung hồ sơ Provider' : 'Đăng ký trở thành Provider'}
          </h1>
          {entry.state === 'NEEDS_UPDATE' && application?.adminNote && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              <b>Ghi chú từ quản trị viên:</b> {application.adminNote}
            </p>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="rounded-3xl border border-sky-100 bg-white p-5 shadow-card sm:p-8">
            <Stepper current={step} />

            <div className="mt-8">
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-ink">Thông tin liên hệ</h2>
                    <p className="mt-1 text-sm text-slate-600">FlexTrip dùng thông tin này để liên hệ về hồ sơ của bạn.</p>
                  </div>
                  <div>
                    <label htmlFor="name" className={LABEL}>Họ và tên</label>
                    <input id="name" autoComplete="name" className={FIELD} {...register('name')} />
                    {errors.name && <p className={ERROR}>{errors.name.message}</p>}
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="phone" className={LABEL}>Số điện thoại</label>
                      <input id="phone" inputMode="tel" autoComplete="tel" className={FIELD} {...register('phone')} />
                      {errors.phone && <p className={ERROR}>{errors.phone.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="email" className={LABEL}>Email tài khoản</label>
                      <input id="email" value={user.email} readOnly className={`${FIELD} cursor-not-allowed bg-slate-50 text-slate-500`} />
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-ink">Thiết bị cho thuê</h2>
                    <p className="mt-1 text-sm text-slate-600">Cho FlexTrip biết bạn cho thuê ở đâu và loại thiết bị nào.</p>
                  </div>

                  <div>
                    <span className={LABEL}>Khu vực cho thuê</span>
                    <Controller
                      control={control}
                      name="city"
                      render={({ field }) => (
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Khu vực cho thuê">
                          {CITIES.map((city) => (
                            <button
                              key={city}
                              type="button"
                              role="radio"
                              aria-checked={field.value === city}
                              onClick={() => field.onChange(city)}
                              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                                field.value === city
                                  ? 'border-brand bg-brand/10 text-brand-blue'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-brand/50'
                              }`}
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      )}
                    />
                    {errors.city && <p className={ERROR}>{errors.city.message}</p>}
                  </div>

                  <div>
                    <span className={LABEL}>Loại thiết bị muốn cho thuê</span>
                    <Controller
                      control={control}
                      name="categories"
                      render={({ field }) => (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {LISTING_CATEGORIES.map(({ value, label, description, Icon }) => {
                            const selected = field.value.includes(value);
                            return (
                              <button
                                key={value}
                                type="button"
                                aria-pressed={selected}
                                onClick={() =>
                                  field.onChange(selected ? field.value.filter((v) => v !== value) : [...field.value, value])
                                }
                                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                                  selected ? 'border-brand bg-brand/5' : 'border-slate-200 bg-white hover:border-brand/50'
                                }`}
                              >
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-brand text-white' : 'bg-sky-50 text-brand-blue'}`}>
                                  {selected ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-sm font-bold text-ink">{label}</span>
                                  <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-slate-500">{description}</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    />
                    {errors.categories && <p className={ERROR}>{errors.categories.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="description" className={LABEL}>Giới thiệu ngắn (không bắt buộc)</label>
                    <textarea
                      id="description"
                      rows={4}
                      placeholder="Bạn đang có những thiết bị nào và muốn cho thuê ra sao?"
                      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
                      {...register('description')}
                    />
                    {errors.description && <p className={ERROR}>{errors.description.message}</p>}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-ink">Xem lại và gửi</h2>
                    <p className="mt-1 text-sm text-slate-600">Kiểm tra thông tin trước khi gửi cho FlexTrip.</p>
                  </div>
                  <dl className="divide-y divide-sky-100 rounded-2xl border border-sky-100">
                    {[
                      { label: 'Họ và tên', value: values.name },
                      { label: 'Số điện thoại', value: values.phone },
                      { label: 'Email', value: user.email },
                      { label: 'Khu vực', value: values.city },
                      { label: 'Loại thiết bị', value: categoryLabels.join(', ') },
                      { label: 'Giới thiệu', value: values.description || '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="grid gap-1 p-4 sm:grid-cols-[140px_1fr]">
                        <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
                        <dd className="break-words text-sm font-semibold text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="rounded-xl bg-sky-50 p-3 text-sm text-slate-600">
                    Sau khi gửi, bạn theo dõi tình trạng hồ sơ ngay trên FlexTrip. Quản trị viên có thể yêu cầu bổ sung thông tin nếu cần.
                  </p>
                  {submitError && <p className="rounded-xl bg-red-50 p-3 text-sm text-danger">{submitError}</p>}
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-sky-100 pt-6 sm:flex-row sm:justify-between">
              {step > 0 ? (
                <button type="button" onClick={() => setStep((s) => s - 1)} className={ghostBtn}>
                  <ArrowLeft className="h-4 w-4" /> Quay lại
                </button>
              ) : (
                <span />
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={goNext} className={primaryBtn}>
                  Tiếp tục <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={isSubmitting} className={primaryBtn}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Gửi đăng ký
                </button>
              )}
            </div>
          </form>

          <aside className="h-fit rounded-3xl border border-sky-100 bg-white p-5 shadow-soft lg:sticky lg:top-28">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Hồ sơ của bạn</h2>
            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex gap-3">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{values.name || user.name}</span>
                  <span className="block truncate text-slate-500">{user.email}</span>
                </span>
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
                <span className="font-semibold text-ink">{values.city || <span className="font-normal text-slate-400">Chưa chọn khu vực</span>}</span>
              </li>
              <li className="flex gap-3">
                <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
                <span className="font-semibold text-ink">
                  {categoryLabels.length ? categoryLabels.join(', ') : <span className="font-normal text-slate-400">Chưa chọn loại thiết bị</span>}
                </span>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </main>
  );
}
