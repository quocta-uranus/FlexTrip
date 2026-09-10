import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-gradient-soft">
        <div className="absolute inset-0 bg-brand-dots opacity-60" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="flex flex-col items-center text-center">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#92eee8]/40 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#2a7bd9] backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#92eee8]" />
              FlexTrip Platform
            </span>
            <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
              Du lịch <span className="text-brand-gradient">linh hoạt</span>,
              trải nghiệm <span className="text-brand-gradient">đáng nhớ</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-text-muted">
              Nền tảng kết nối Traveler & Provider — quản lý hồ sơ, đặt thuê,
              và thanh toán tất cả trong một nơi.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/profile"
                className="group inline-flex items-center gap-2 rounded-full bg-[#2a7bd9] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#2a7bd9]/25 transition-all hover:bg-[#1e5aa8] hover:shadow-xl hover:shadow-[#2a7bd9]/30"
              >
                Quản lý hồ sơ
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/profile/preferences"
                className="inline-flex items-center gap-2 rounded-full border border-[#2a7bd9]/30 bg-white px-7 py-3.5 text-sm font-semibold text-[#2a7bd9] transition-all hover:border-[#2a7bd9] hover:bg-[#2a7bd9]/5"
              >
                Tùy chọn du lịch
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-32 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-[#92eee8]/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-[#2a7bd9]/20 blur-3xl" />
      </section>

      {/* Feature cards - link to User Stories */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Khám phá tính năng</h2>
            <p className="mt-2 text-text-muted">Các module quản lý cho Traveler và Provider</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            code="PROF-01"
            title="Manage Personal Profile"
            roles={["Traveler", "Provider"]}
            href="/profile"
            accent
          />
          <FeatureCard
            code="PROF-02"
            title="Manage Travel Preferences"
            roles={["Traveler"]}
            href="/profile/preferences"
          />
          <FeatureCard
            code="PROF-03"
            title="Payment Methods & Wallet"
            roles={["Traveler", "Provider"]}
            href="/profile/wallet"
          />
          <FeatureCard
            code="PROF-04"
            title="Rental / Listing History"
            roles={["Traveler", "Provider"]}
            href="/profile/history"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  code,
  title,
  roles,
  href,
  accent = false,
}: {
  code: string;
  title: string;
  roles: string[];
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl border p-6 transition-all hover:-translate-y-1 hover:shadow-xl ${
        accent
          ? "border-[#2a7bd9]/30 bg-white shadow-lg shadow-[#2a7bd9]/5"
          : "border-[var(--border)] bg-white hover:border-[#2a7bd9]/40"
      }`}
    >
      {accent && (
        <div className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
      )}
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-md bg-[#2a7bd9]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2a7bd9]">
          {code}
        </span>
        <svg className="h-5 w-5 text-text-subtle transition-all group-hover:translate-x-1 group-hover:text-[#2a7bd9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </div>
      <h3 className="mb-3 text-lg font-semibold leading-snug">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {roles.map((r) => (
          <span
            key={r}
            className="rounded-full bg-[#92eee8]/30 px-2.5 py-0.5 text-[11px] font-medium text-[#1e5aa8]"
          >
            {r}
          </span>
        ))}
      </div>
    </Link>
  );
}
