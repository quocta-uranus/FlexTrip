'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useAppMode } from '@/hooks/useAppMode';

const LINK_CLASS =
  'inline-block text-sm text-[#A8B9C7] transition-all duration-200 hover:translate-x-1 hover:text-[#F5F9FC]';
const HEADING_CLASS = 'mb-1 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#F5F9FC] sm:text-[13px]';

const EXPLORE_LINKS = [
  { href: '/search?category=CAMPING', label: 'Camping' },
  { href: '/search?category=TREKKING', label: 'Trekking' },
  { href: '/search?category=BEACH', label: 'Du lịch biển' },
  { href: '/search', label: 'Tất cả thiết bị' },
];

const OWNER_LINKS = [{ href: '/become-provider', label: 'Đăng ký trở thành Provider' }];

const SUPPORT_LINKS = [
  { href: '/bookings', label: 'Đơn thuê của tôi' },
  { href: '/ai-chat', label: 'Trợ lý AI' },
  { href: '/messages', label: 'Tin nhắn' },
  { href: '/profile/payments', label: 'Thanh toán & Ví' },
];

// Same palette and type scale as the guest footer (final-cta-footer.tsx), without the CTA banner and wordmark.
export function TravelerFooter() {
  const hasProvider = useAuthStore((s) => s.user?.roles.includes('PROVIDER') ?? false);

  return (
    <footer className="relative w-full overflow-hidden border-t border-white/[0.08] bg-[#0B1F2E] pt-10 text-[#A8B9C7] sm:pt-12">
      <div className="pointer-events-none absolute right-1/4 top-0 h-[500px] w-[500px] rounded-full bg-[#13C8EF]/5 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-[1300px] px-6 sm:px-10 lg:px-14">
        <div className="grid grid-cols-2 gap-10 pb-10 lg:grid-cols-12 lg:gap-12">
          <div className="col-span-2 flex flex-col gap-4 lg:col-span-4">
            <Link href="/" className="group inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#13C8EF] text-[#0A1C2A] transition-transform duration-200 group-hover:scale-105">
                <Compass className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-[#F5F9FC]">
                Flex<span className="text-[#13C8EF]">Trip</span>
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-[#A8B9C7]">
              Nền tảng chia sẻ thiết bị dã ngoại tại Việt Nam. Thuê đồ minh bạch với hợp đồng điện tử.
            </p>
          </div>

          <nav aria-label="Khám phá" className="flex flex-col gap-3 lg:col-span-2">
            <p className={HEADING_CLASS}>Khám phá</p>
            {EXPLORE_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={LINK_CLASS}>
                {label}
              </Link>
            ))}
          </nav>

          {!hasProvider && (
          <nav aria-label="Dành cho chủ đồ" className="flex flex-col gap-3 lg:col-span-3">
            <p className={HEADING_CLASS}>Dành cho chủ đồ</p>
            {OWNER_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={LINK_CLASS}>
                {label}
              </Link>
            ))}
          </nav>
          )}

          <nav aria-label="Hỗ trợ" className={`flex flex-col gap-3 ${hasProvider ? 'lg:col-span-6' : 'lg:col-span-3'}`}>
            <p className={HEADING_CLASS}>Hỗ trợ</p>
            {SUPPORT_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={LINK_CLASS}>
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="h-px w-full bg-white/[0.12]" />

        <div className="py-6 text-xs text-[#8295A5]">
          <p>© {new Date().getFullYear()} FlexTrip. Mọi quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
}

// Traveler-facing pages only. Flow pages (checkout, contract, check-in) and full-height tools (chat) stay footer-free.
const TRAVELER_PATHS = [
  /^\/search$/,
  /^\/listings\/[^/]+$/,
  /^\/bookings$/,
  /^\/bookings\/(?!new$)[^/]+$/,
  /^\/wishlist$/,
  /^\/cart$/,
  /^\/notifications$/,
  /^\/profile(\/.*)?$/,
  /^\/become-provider(\/.*)?$/,
];

export function TravelerFooterGate() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const { mode } = useAppMode();

  const roles = user?.roles ?? [];
  // Accounts with both roles get this footer in Traveler mode only; provider-only accounts never do.
  const isTraveler =
    isAuthenticated &&
    roles.includes('TRAVELER') &&
    !roles.includes('ADMIN') &&
    !roles.includes('STAFF') &&
    (!roles.includes('PROVIDER') || mode === 'traveler');

  if (!isTraveler || !TRAVELER_PATHS.some((pattern) => pattern.test(pathname))) return null;
  return <TravelerFooter />;
}
