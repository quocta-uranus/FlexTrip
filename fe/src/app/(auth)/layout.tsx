import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand (hidden on mobile) */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between p-12 shrink-0 relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #102a54 0%, #1a4b8c 45%, #2563eb 100%)',
        }}
      >
        {/* Subtle background ambient orbs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md border border-white/20 shadow-md">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">FlexTrip</span>
          </div>

          {/* Tagline */}
          <div className="mt-16">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider bg-cyan-400/15 text-cyan-200 border border-cyan-300/30">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-300" />
              Nền tảng du lịch linh hoạt
            </div>
            <h2 className="text-4xl font-extrabold leading-tight text-white tracking-tight">
              Khám phá mọi<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-sky-300 to-white">
                góc khuất
              </span>{' '}
              Việt Nam.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/80">
              Thuê thiết bị camping, trekking, phương tiện và trải nghiệm từ hàng nghìn provider uy tín.
            </p>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="space-y-3 relative z-10">
          {[
            { icon: '🔒', text: 'Bảo mật JWT + 2FA TOTP' },
            { icon: '✓', text: 'KYC xác minh danh tính' },
            { icon: '⭐', text: '4.9/5 từ 12k+ đánh giá' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <span className="text-base">{item.icon}</span>
              <span className="text-sm font-medium text-white/85">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-[#f8fafc] dark:bg-[#0B132B] transition-colors duration-300">
        {/* Subtle glow orb in dark mode */}
        <div className="pointer-events-none absolute h-[500px] w-[500px] rounded-full bg-[#00A3FF]/10 dark:bg-[#0070F3]/12 blur-3xl -top-24 -right-24" />
        <div className="pointer-events-none absolute h-[400px] w-[400px] rounded-full bg-indigo-500/5 dark:bg-sky-500/10 blur-3xl -bottom-24 -left-24" />

        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden relative z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#1877F2] via-[#00A3FF] to-[#00D8F6] shadow-md shadow-[#00A3FF]/30">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          </div>
          <span className="text-lg font-extrabold text-slate-900 dark:text-white">FlexTrip</span>
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#111A2E]/90 p-8 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
