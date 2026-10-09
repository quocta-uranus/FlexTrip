'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, BadgeCheck, CalendarDays, HeartHandshake, MapPin, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMe, useUpdateMe } from '@/hooks/useSession';
import type { ApiError, UserProfile } from '@/lib/api/client';
import { isStaffProfileComplete } from '@/lib/staff-profile';

type FormState = {
  name: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  address: string;
  emergencyContact: string;
  bio: string;
};

const EMPTY_FORM: FormState = {
  name: '', phone: '', dateOfBirth: '', gender: '', nationality: 'Việt Nam', address: '', emergencyContact: '', bio: '',
};

const FIELD_CLASS = 'h-11 rounded-xl border-slate-200 bg-white px-3 focus-visible:border-blue-500 focus-visible:ring-blue-100';

export default function CompleteStaffProfilePage() {
  const { data: user } = useMe();

  if (!user) {
    return <div className="min-h-screen animate-pulse bg-slate-100" aria-busy="true" />;
  }

  return <StaffProfileForm key={user.id} user={user} />;
}

function StaffProfileForm({ user }: { user: UserProfile }) {
  const router = useRouter();
  const updateMe = useUpdateMe();
  const isEditing = isStaffProfileComplete(user);
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY_FORM,
    name: user.name ?? '',
    phone: user.phone ?? '',
    dateOfBirth: user.dateOfBirth ?? '',
    gender: user.gender ?? '',
    nationality: user.nationality ?? 'Việt Nam',
    address: user.address ?? '',
    emergencyContact: user.emergencyContact ?? '',
    bio: user.bio ?? '',
  }));

  function setField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await updateMe.mutateAsync({
      name: form.name.trim(),
      phone: form.phone.trim(),
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      nationality: form.nationality.trim(),
      address: form.address.trim(),
      emergencyContact: form.emergencyContact.trim(),
      bio: form.bio.trim(),
    });
    router.replace('/staff');
  }

  const errorMessage = updateMe.isError
    ? ((updateMe.error as ApiError)?.message || 'Không thể lưu hồ sơ. Vui lòng thử lại.')
    : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe_0,_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)]">
        <header className="relative overflow-hidden bg-slate-950 px-6 py-8 text-white sm:px-10">
          <div className="absolute -right-20 -top-24 size-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-blue-500 shadow-lg shadow-blue-950/30">
              <BadgeCheck className="size-8" />
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-blue-300">{isEditing ? 'Hồ sơ nhân viên' : 'Thiết lập tài khoản nhân viên'}</p>
              <h1 className="text-2xl font-bold sm:text-3xl">{isEditing ? 'Cập nhật hồ sơ cá nhân' : 'Hoàn thành hồ sơ để bắt đầu làm việc'}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{isEditing ? 'Giữ thông tin liên hệ luôn chính xác để phối hợp công việc thuận tiện.' : 'Thông tin này giúp hệ thống xác minh nhân viên và liên hệ chính xác trong quá trình xử lý giao nhận.'}</p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1fr_280px]">
          <div className="space-y-7 p-6 sm:p-10">
            <section>
              <SectionTitle icon={<UserRound />} title="Thông tin cá nhân" description="Các trường có dấu * là bắt buộc." />
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label="Họ và tên" icon={<UserRound />}>
                  <Input value={form.name} onChange={(e) => setField('name', e.target.value)} className={FIELD_CLASS} minLength={2} maxLength={100} required autoComplete="name" />
                </Field>
                <Field label="Số điện thoại" icon={<Phone />}>
                  <Input value={form.phone} onChange={(e) => setField('phone', e.target.value)} className={FIELD_CLASS} pattern="[0-9+\s-]{8,20}" title="Nhập từ 8 đến 20 ký tự gồm số, dấu +, khoảng trắng hoặc dấu gạch ngang" required autoComplete="tel" />
                </Field>
                <Field label="Ngày sinh" icon={<CalendarDays />}>
                  <Input type="date" value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} className={FIELD_CLASS} max={new Date().toISOString().slice(0, 10)} required />
                </Field>
                <Field label="Giới tính" icon={<UserRound />}>
                  <select value={form.gender} onChange={(e) => setField('gender', e.target.value)} className={`${FIELD_CLASS} w-full border px-3 text-sm outline-none`} required>
                    <option value="" disabled>Chọn giới tính</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </Field>
                <Field label="Quốc tịch" icon={<MapPin />}>
                  <Input value={form.nationality} onChange={(e) => setField('nationality', e.target.value)} className={FIELD_CLASS} maxLength={80} required autoComplete="country-name" />
                </Field>
                <Field label="Liên hệ khẩn cấp" icon={<HeartHandshake />}>
                  <Input value={form.emergencyContact} onChange={(e) => setField('emergencyContact', e.target.value)} className={FIELD_CLASS} maxLength={100} placeholder="Tên và số điện thoại" required />
                </Field>
              </div>
            </section>

            <section>
              <SectionTitle icon={<MapPin />} title="Địa chỉ và giới thiệu" description="Dùng để hỗ trợ phân công và phối hợp công việc." />
              <div className="mt-5 space-y-5">
                <Field label="Địa chỉ hiện tại" icon={<MapPin />}>
                  <Input value={form.address} onChange={(e) => setField('address', e.target.value)} className={FIELD_CLASS} maxLength={250} required autoComplete="street-address" />
                </Field>
                <label className="block space-y-2 text-sm font-semibold text-slate-700">
                  <span>Giới thiệu ngắn <span className="font-normal text-slate-400">(không bắt buộc)</span></span>
                  <textarea value={form.bio} onChange={(e) => setField('bio', e.target.value)} rows={4} maxLength={500} placeholder="Kinh nghiệm hoặc ghi chú hỗ trợ công việc..." className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </label>
              </div>
            </section>

            {errorMessage && <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="mt-0.5 size-5 shrink-0" /><span>{errorMessage}</span></div>}

            <Button type="submit" disabled={updateMe.isPending} className="h-12 w-full rounded-xl bg-blue-600 text-base font-bold text-white hover:bg-blue-700 sm:w-auto sm:px-8">
              {updateMe.isPending ? 'Đang lưu hồ sơ…' : isEditing ? 'Lưu thay đổi' : 'Hoàn tất và vào trang làm việc'}
            </Button>
          </div>

          <aside className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0 lg:p-8">
            <div className="sticky top-8 space-y-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><ShieldCheck className="size-6" /></div>
              <div><h2 className="font-bold text-slate-900">Vì sao cần hoàn tất?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Hồ sơ đầy đủ giúp tránh lỗi khi nhận nhiệm vụ, lập biên bản và liên hệ trong tình huống khẩn cấp.</p></div>
              <ul className="space-y-3 text-sm text-slate-600">
                {['Xác định đúng người phụ trách', 'Hỗ trợ phân công theo khu vực', 'Liên hệ nhanh khi có sự cố'].map((item) => <li key={item} className="flex gap-2"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />{item}</li>)}
              </ul>
              <p className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">Bạn chỉ cần thực hiện bước này một lần. Sau này có thể cập nhật lại từ menu Hồ sơ cá nhân.</p>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="flex gap-3"><span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 [&_svg]:size-5">{icon}</span><div><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-0.5 text-sm text-slate-500">{description}</p></div></div>;
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <label className="block space-y-2 text-sm font-semibold text-slate-700"><span className="flex items-center gap-1.5 [&_svg]:size-3.5 [&_svg]:text-slate-400">{icon}{label} <span className="text-red-500">*</span></span>{children}</label>;
}
