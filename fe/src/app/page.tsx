import Link from "next/link";

export const metadata = {
  title: "FlexTrip — Nền tảng du lịch linh hoạt",
  description: "Thuê thiết bị camping, trekking, phương tiện và trải nghiệm từ hàng nghìn provider uy tín tại Việt Nam.",
};

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #1e5aa8 0%, #2a7bd9 55%, #3a9ae0 100%)' }}>
        <div className="pointer-events-none absolute -left-40 -top-20 h-80 w-80 rounded-full blur-3xl" style={{ background: 'rgba(146,238,232,0.2)' }} />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full blur-3xl" style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="flex flex-col items-center text-center">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider" style={{ background: 'rgba(146,238,232,0.2)', color: '#92eee8' }}>
              <span className="h-2 w-2 rounded-full bg-[#92eee8]" />
              Nền tảng du lịch linh hoạt #1 Việt Nam
            </span>
            <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
              Khám phá mọi<span style={{ color: '#92eee8' }}> góc khuất</span><br />Việt Nam.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Thuê thiết bị camping, trekking, phương tiện và trải nghiệm từ hàng nghìn provider uy tín. Đơn giản, linh hoạt, an toàn.
            </p>
            <Link
              href="/search"
              className="mt-10 flex items-center gap-3 rounded-2xl border px-6 py-4 text-sm backdrop-blur-sm transition-all hover:shadow-xl w-full max-w-lg"
              style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
            >
              <svg className="h-5 w-5 shrink-0" style={{ color: '#92eee8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Tìm lều cắm trại, xe đạp, kayak…</span>
              <span className="ml-auto shrink-0 rounded-xl px-4 py-1.5 text-xs font-semibold" style={{ background: '#92eee8', color: '#0f3460' }}>Tìm kiếm</span>
            </Link>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link href="/search" className="rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-all hover:shadow-xl" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
                🔍 Khám phá ngay
              </Link>
              <Link href="/register" className="rounded-full px-7 py-3.5 text-sm font-semibold transition-all hover:shadow-lg" style={{ background: '#fff', color: '#2a7bd9' }}>
                🏕️ Trở thành Provider
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b py-8" style={{ borderColor: '#DCEFFB', background: '#fff' }}>
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-6 text-center sm:grid-cols-4">
            {[
              { value: '10,000+', label: 'Sản phẩm' },
              { value: '500+', label: 'Provider uy tín' },
              { value: '50+', label: 'Tỉnh thành' },
              { value: '4.9/5', label: '12k+ đánh giá' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold" style={{ color: '#2a7bd9' }}>{s.value}</p>
                <p className="mt-0.5 text-sm" style={{ color: '#8694ad' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#0f1729' }}>Tất cả trong một nơi</h2>
          <p className="mt-3 text-base" style={{ color: '#5a6b85' }}>FlexTrip kết nối Traveler & Provider — đặt thuê, nhắn tin, quản lý tất cả ngay đây.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard code="SRC" icon="🔍" title="Tìm kiếm & Khám phá" desc="Tìm thiết bị, chỗ ở, trải nghiệm phù hợp với chuyến đi." href="/search" accent />
          <FeatureCard code="BOOK" icon="📋" title="Đặt thuê dễ dàng" desc="Chọn ngày, xác nhận, và nhận đồ — chỉ vài bước đơn giản." href="/bookings" />
          <FeatureCard code="MSG" icon="💬" title="Nhắn tin trực tiếp" desc="Trao đổi trực tiếp với Provider để hỏi thêm chi tiết." href="/messages" />
          <FeatureCard code="PROV" icon="🏕️" title="Provider Dashboard" desc="Quản lý sản phẩm, đơn hàng và doanh thu của cửa hàng." href="/dashboard" />
        </div>
      </section>

      {/* Category tiles */}
      <section className="border-t py-16" style={{ borderColor: '#DCEFFB', background: '#fff' }}>
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-10 text-2xl font-bold" style={{ color: '#0f1729' }}>Duyệt theo danh mục</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { cat: 'CAMPING_TREKKING', icon: '⛺', label: 'Cắm trại & Trekking', color: '#f0fdf4' },
              { cat: 'VEHICLE', icon: '🚵', label: 'Phương tiện', color: '#eff6ff' },
              { cat: 'STAY', icon: '🏡', label: 'Chỗ ở', color: '#fef3c7' },
              { cat: 'EXPERIENCE', icon: '🌄', label: 'Trải nghiệm', color: '#fdf4ff' },
              { cat: 'OTHER', icon: '📦', label: 'Khác', color: '#f1f5f9' },
            ].map((cat) => (
              <Link
                key={cat.cat}
                href={`/search?category=${cat.cat}`}
                className="flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition-all hover:shadow-lg hover:-translate-y-1"
                style={{ borderColor: '#DCEFFB', background: cat.color }}
              >
                <span className="text-4xl">{cat.icon}</span>
                <span className="text-sm font-semibold" style={{ color: '#0f1729' }}>{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #1e5aa8, #2a7bd9)' }}>
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">Sẵn sàng khám phá?</h2>
          <p className="mb-8 text-base" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Đăng ký miễn phí, tìm kiếm hàng nghìn sản phẩm và bắt đầu chuyến phiêu lưu của bạn.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/register" className="rounded-full px-8 py-4 text-sm font-semibold transition-all hover:shadow-xl" style={{ background: '#fff', color: '#2a7bd9' }}>
              Đăng ký ngay — miễn phí
            </Link>
            <Link href="/search" className="rounded-full border px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-white/10" style={{ borderColor: 'rgba(255,255,255,0.4)' }}>
              Xem sản phẩm
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  code, icon, title, desc, href, accent = false,
}: {
  code: string; icon: string; title: string; desc: string; href: string; accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
      style={{ borderColor: accent ? 'rgba(42,123,217,0.3)' : '#DCEFFB', boxShadow: accent ? '0 4px 20px -8px rgba(42,123,217,0.2)' : undefined }}
    >
      {accent && <div className="absolute inset-x-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, #2a7bd9, #92eee8)' }} />}
      <span className="mb-4 text-4xl">{icon}</span>
      <span className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#2a7bd9' }}>{code}</span>
      <h3 className="mb-2 text-lg font-bold leading-snug" style={{ color: '#0f1729' }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: '#5a6b85' }}>{desc}</p>
      <div className="mt-4 flex items-center gap-1 text-sm font-semibold" style={{ color: '#2a7bd9' }}>
        <span>Khám phá</span>
        <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </div>
    </Link>
  );
}
