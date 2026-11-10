'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  FileSignature,
  IdCard,
  ImageIcon,
  MapPin,
  PackagePlus,
  PlayCircle,
  SearchCheck,
  ShieldCheck,
  Store,
  Tent,
  UserRound,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useProviderEntry } from '@/hooks/useProviderApplication';

const HIGHLIGHTS = [
  { icon: UserRound, label: 'Dùng chung tài khoản FlexTrip' },
  { icon: ShieldCheck, label: 'Theo dõi trạng thái trực tuyến' },
  { icon: FileSignature, label: 'Hợp đồng điện tử cho mỗi đơn' },
];

const BENEFITS = [
  { icon: PackagePlus, tone: 'bg-amber-50 text-amber-600', title: 'Đăng thiết bị của bạn', body: 'Đưa lều, thiết bị quay chụp, đồ trekking hay thiết bị dã ngoại bạn sở hữu lên FlexTrip.' },
  { icon: CalendarCheck, tone: 'bg-sky-50 text-brand-blue', title: 'Tự quản lý tin đăng và lịch', body: 'Chủ động cập nhật thông tin, giá thuê và lịch cho thuê của từng thiết bị.' },
  { icon: ClipboardList, tone: 'bg-violet-50 text-violet-600', title: 'Theo dõi đơn thuê và đánh giá', body: 'Xem các đơn thuê và phản hồi đánh giá của Traveler tại trang quản lý Provider.' },
  { icon: FileSignature, tone: 'bg-emerald-50 text-emerald-600', title: 'Hợp đồng điện tử cho mỗi đơn', body: 'Mỗi đơn thuê đi kèm hợp đồng điện tử và biên bản bàn giao để hai bên cùng đối chiếu.' },
];

const STEPS = [
  { icon: ClipboardList, title: 'Điền thông tin đăng ký', body: 'Gửi thông tin liên hệ, khu vực và loại thiết bị bạn muốn cho thuê.' },
  { icon: SearchCheck, title: 'FlexTrip xem xét hồ sơ', body: 'Quản trị viên xem xét hồ sơ và có thể yêu cầu bổ sung thông tin nếu cần.' },
  { icon: Store, title: 'Bắt đầu cho thuê', body: 'Khi hồ sơ được duyệt, bạn vào trang quản lý Provider để đăng thiết bị đầu tiên.' },
];

const PREPARE = [
  { icon: IdCard, title: 'Thông tin liên hệ', body: 'Họ tên, số điện thoại và email của tài khoản FlexTrip.' },
  { icon: MapPin, title: 'Khu vực cho thuê', body: 'Tỉnh/thành phố nơi bạn giao nhận thiết bị.' },
  { icon: Tent, title: 'Loại thiết bị', body: 'Nhóm thiết bị bạn dự định cho thuê.' },
  { icon: ImageIcon, title: 'Giới thiệu ngắn', body: 'Mô tả thiết bị bạn có (không bắt buộc).' },
];

export default function BecomeProviderPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { entry, canApply } = useProviderEntry();

  const cta =
    entry.state === 'NONE'
      ? { label: 'Bắt đầu đăng ký', href: '/become-provider/apply' }
      : { label: entry.label, href: entry.href };
  const showCta = !isAuthenticated || canApply || entry.state === 'APPROVED';
  const ctaHref = isAuthenticated ? cta.href : '/login';
  const ctaLabel = isAuthenticated ? cta.label : 'Đăng nhập để đăng ký';

  const primary =
    'inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-sm font-semibold text-white shadow-md shadow-brand/30 transition-colors hover:bg-brand-blue';

  return (
    <main className="min-h-screen bg-[#F1FAFF] text-slate-900">
      <section className="relative overflow-hidden bg-sky-100 pb-16 pt-28 sm:pt-32 lg:pb-24">
        <Image src="/assets/hero.jpg" alt="" fill priority sizes="100vw" className="object-cover object-[center_60%]" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-white/10 max-md:from-white/90 max-md:via-white/80 max-md:to-white/60" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-700">
              <Store className="h-3.5 w-3.5" /> Dành cho Provider
            </span>
            <h1 className="mt-4 !text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:!text-5xl">
              Cho thuê thiết bị của bạn trên <span className="text-brand">FlexTrip</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-700">
              Provider là chủ thiết bị đăng thiết bị của mình lên FlexTrip để Traveler thuê cho những chuyến đi dã ngoại.
              Bạn dùng chung một tài khoản cho cả hai vai trò.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {showCta && (
                <Link href={ctaHref} className={primary}>
                  {ctaLabel} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <a
                href="#loi-ich"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink shadow-soft transition-colors hover:bg-sky-50"
              >
                <PlayCircle className="h-5 w-5 text-brand" /> Tìm hiểu thêm
              </a>
            </div>
            {entry.state === 'PENDING' && (
              <p className="mt-3 text-sm text-slate-600">Bạn đã gửi đăng ký, hồ sơ đang được xem xét.</p>
            )}

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-700">
              {HIGHLIGHTS.map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-brand-blue shadow-xs">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <aside className="hidden justify-self-end rounded-2xl bg-white/95 p-5 shadow-card backdrop-blur lg:block lg:max-w-xs">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand-blue">
              <Tent className="h-5 w-5" />
            </span>
            <p className="mt-3 text-base font-bold leading-snug text-ink">Thiết bị của bạn, chuyến đi của Traveler</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Đăng thiết bị lên FlexTrip để Traveler tìm thấy và thuê cho hành trình của họ.
            </p>
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <section id="loi-ich" className="scroll-mt-28 pt-14 sm:pt-16">
          <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Bạn nhận được gì khi là Provider?</h2>
          <p className="mt-1 text-sm text-slate-600">Những công cụ bạn dùng sau khi hồ sơ được duyệt.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, tone, title, body }) => (
              <article key={title} className="rounded-2xl border border-sky-100 bg-white p-5 shadow-soft">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold leading-snug text-ink">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pt-16 lg:pt-20">
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-stretch">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">3 bước trở thành Provider</h2>
              <p className="mt-1 text-sm text-slate-600">Quy trình ngắn gọn để bắt đầu cho thuê thiết bị của bạn.</p>
              <ol className="mt-6 grid gap-4 sm:grid-cols-3">
                {STEPS.map(({ icon: Icon, title, body }, i) => (
                  <li key={title} className="relative rounded-2xl border border-sky-100 bg-white p-5 shadow-soft">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <Icon className="absolute right-5 top-5 h-5 w-5 text-brand-blue/60" />
                    <h3 className="mt-4 text-base font-bold leading-snug text-ink">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
                  </li>
                ))}
              </ol>
            </div>

            <figure className="relative min-h-[260px] overflow-hidden rounded-3xl bg-[#0A1826]">
              <Image src="/assets/vietnam-hike.jpg" alt="" fill sizes="(min-width: 1024px) 400px, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1826]/85 via-[#0A1826]/20 to-transparent" />
              <figcaption className="absolute inset-x-0 bottom-0 p-6 text-white">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-mint">Cộng đồng FlexTrip</p>
                <p className="mt-1 text-lg font-bold leading-snug">Từ thiết bị bạn đang có đến chuyến đi của Traveler</p>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="pt-16 lg:pt-20">
          <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Bạn cần chuẩn bị gì?</h2>
          <p className="mt-1 text-sm text-slate-600">
            Một vài thông tin cơ bản để hoàn tất đăng ký. Quản trị viên có thể yêu cầu bổ sung nếu hồ sơ chưa đủ.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PREPARE.map(({ icon: Icon, title, body }) => (
              <article key={title} className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-white p-4 shadow-soft">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-brand-blue">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-ink">{title}</h3>
                  <p className="mt-1 text-sm leading-snug text-slate-600">{body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="relative mb-16 mt-16 overflow-hidden rounded-3xl bg-[#0A1826] px-6 py-10 text-white sm:px-10 sm:py-12 lg:mt-20">
          <Image src="/assets/adventure.jpg" alt="" fill sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A1826]/90 via-[#0A1826]/60 to-transparent" />
          <div className="relative max-w-xl">
            <h2 className="!text-2xl font-extrabold leading-tight tracking-tight text-white sm:!text-3xl">
              Sẵn sàng cho thuê thiết bị của bạn?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85 sm:text-base">
              Gửi đăng ký để FlexTrip xem xét hồ sơ và mở quyền Provider cho tài khoản của bạn.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {showCta && (
                <Link href={ctaHref} className={primary}>
                  {ctaLabel} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                href="/search"
                className="inline-flex h-12 items-center rounded-full border border-white/40 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Xem thiết bị trên FlexTrip
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
