import Link from "next/link";
import {
  Reveal,
  AnimatedGradientText,
  BlobBackground,
  Marquee,
  TiltCard,
  PulseDot,
} from "@/components/profile/wow";

/**
 * Trang hub /profile — chọn loại profile muốn mở.
 * PROF-01: Personal Profile (Traveler + Provider)
 * PROF-02: Travel Preferences
 * Admin profile được giữ lại.
 */

const ROLES = [
  {
    code: "TRAVELER",
    title: "Travel Profile",
    subtitle: "Hồ sơ người đi — cập nhật thông tin cá nhân, ảnh đại diện, ngôn ngữ hiển thị.",
    href: "/profile/travel",
    icon: "🧳",
    points: [
      "Thông tin cá nhân",
      "Ảnh đại diện",
      "Ngôn ngữ hiển thị",
    ],
    accent: false,
  },
  {
    code: "PROVIDER",
    title: "Shop Profile",
    subtitle: "Hồ sơ chủ shop — cập nhật thông tin cửa hàng và phương thức liên lạc.",
    href: "/profile/shop",
    icon: "🏕️",
    points: [
      "Thông tin cửa hàng",
      "Ảnh đại diện",
      "Phương thức liên lạc",
    ],
    accent: true,
  },
  {
    code: "ADMIN",
    title: "Admin Profile",
    subtitle: "Hồ sơ quản trị — phạm vi quyền, ticket, audit log.",
    href: "/profile/admin",
    icon: "🛡️",
    points: [
      "Phạm vi quyền & scope",
      "KPI: tickets / users / flags",
      "Recent admin actions",
    ],
    accent: false,
  },
] as const;

const TRUST_ITEMS = [
  "✓ KYC Verified",
  "🔒 SSL Secured",
  "🛡 Trust & Safety 24/7",
  "💯 100% Refund Policy",
  "🤖 AI-powered matching",
  "🌐 Đa ngôn ngữ",
  "⭐ 4.9/5 từ 12k+ reviews",
];

export default function ProfileHubPage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-brand-gradient-soft">
        <BlobBackground variant="soft" />
        <div className="relative mx-auto max-w-6xl px-6 py-14 sm:py-20">
          <Reveal>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur"
              style={{ borderColor: "rgba(146,238,232,0.4)", color: "#2a7bd9" }}
            >
              <PulseDot color="#92eee8" size={6} />
              PROF Module · v3.1
            </span>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Chọn{" "}
              <AnimatedGradientText>hồ sơ</AnimatedGradientText>
              <br />
              của bạn.
            </h1>
          </Reveal>
          <Reveal delay={240}>
            <p className="mt-5 max-w-xl text-base sm:text-lg" style={{ color: "#5a6b85" }}>
              FlexTrip có 3 hồ sơ: Traveler, Provider (chủ shop) và Admin —
              mỗi hồ sơ có trang riêng, thiết kế riêng, dữ liệu riêng.
            </p>
          </Reveal>
          <Reveal delay={360}>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/profile/travel"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg"
                style={{ background: "#2a7bd9", boxShadow: "0 12px 28px -10px rgba(42,123,217,0.55)" }}
              >
                Bắt đầu nhanh
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="/profile/shop"
                className="inline-flex items-center gap-2 rounded-full border bg-white/80 px-6 py-3 text-sm font-semibold backdrop-blur"
                style={{ borderColor: "rgba(146,238,232,0.5)", color: "#2a7bd9" }}
              >
                Trở thành Provider
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-6xl px-6">
        <Reveal delay={80}>
          <Marquee items={TRUST_ITEMS} duration={32} />
        </Reveal>
      </section>

      <section className="mx-auto mt-12 grid max-w-6xl gap-6 px-6 lg:grid-cols-3">
        {ROLES.map((r, i) => (
          <Reveal key={r.code} delay={i * 120}>
            <TiltCard max={8}>
              <Link
                href={r.href}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white p-6 shadow-sm"
                style={{
                  borderColor: r.accent ? "rgba(42,123,217,0.3)" : "#e2e8f3",
                  boxShadow: r.accent ? "0 14px 36px -10px rgba(42,123,217,0.18)" : undefined,
                }}
              >
                {r.accent && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
                )}

                <div className="mb-4 flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: "rgba(42,123,217,0.1)", color: "#2a7bd9" }}
                  >
                    <PulseDot color="#92eee8" size={5} />
                    {r.code}
                  </span>
                  <span className="text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    {r.icon}
                  </span>
                </div>

                <h2 className="mb-2 text-2xl font-bold tracking-tight">
                  {r.accent ? <AnimatedGradientText>{r.title}</AnimatedGradientText> : r.title}
                </h2>
                <p className="mb-5 text-sm" style={{ color: "#5a6b85" }}>
                  {r.subtitle}
                </p>

                <ul className="space-y-2.5">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm">
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        style={{ color: "#2a7bd9" }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span style={{ color: "#0f1729" }}>{p}</span>
                    </li>
                  ))}
                </ul>

                <div
                  className="mt-auto flex items-center justify-between border-t pt-4 text-sm font-semibold"
                  style={{ borderColor: "#e2e8f3", color: "#2a7bd9" }}
                >
                  <span>Mở hồ sơ</span>
                  <svg
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>
            </TiltCard>
          </Reveal>
        ))}
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-6 pb-16">
        <Reveal>
          <div className="rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: "#e2e8f3" }}>
            <div className="mb-5">
              <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#2a7bd9" }}>
                <PulseDot color="#92eee8" size={6} />
                PROF-02 · Travel Preferences
              </div>
              <h3 className="text-lg font-semibold">Sở thích du lịch</h3>
              <p className="text-sm" style={{ color: "#5a6b85" }}>
                Khai báo sở thích, loại hình và ngân sách để AI cá nhân hoá gợi ý.
              </p>
            </div>
            <Link
              href="/profile/preferences"
              className="group flex items-center justify-between rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:bg-white"
              style={{ borderColor: "#e2e8f3", background: "#f1f5fa" }}
            >
              <div>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(42,123,217,0.1)", color: "#2a7bd9" }}>PROF-02</span>
                <div className="mt-2 text-sm font-semibold">Tùy chọn du lịch</div>
              </div>
              <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" style={{ color: "#8694ad" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
