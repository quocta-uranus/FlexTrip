export default function ProfilePreferencesPage() {
  return (
    <div className="pb-24">
      <section className="bg-brand-gradient-soft">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:py-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur"
            style={{ borderColor: "rgba(146,238,232,0.4)", color: "#2a7bd9" }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#92eee8" }} />
            PROF-02 · Tùy chọn
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-brand-gradient">Tùy chọn du lịch</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm" style={{ color: "#5a6b85" }}>
            Phong cách, ngân sách, hoạt động yêu thích — dùng để AI gợi ý listing phù hợp.
          </p>
        </div>
      </section>
      <section className="mx-auto mt-12 max-w-4xl px-6">
        <div className="rounded-2xl border bg-white p-12 text-center" style={{ borderColor: "#e2e8f3" }}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient-soft text-3xl">
            🎯
          </div>
          <div className="text-base font-semibold">Sắp ra mắt</div>
          <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>
            Chi tiết hơn cho AI matching — trekking level, sleep style, dietary…
          </p>
        </div>
      </section>
    </div>
  );
}
