import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand (hidden on mobile) */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between p-12 shrink-0"
        style={{ background: 'linear-gradient(160deg, #1e5aa8 0%, #2a7bd9 55%, #3a9ae0 100%)' }}
      >
        {/* Logo */}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">FlexTrip</span>
          </div>

          {/* Tagline */}
          <div className="mt-16">
            <div
              className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
              style={{ background: 'rgba(146,238,232,0.2)', color: '#92eee8' }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#92eee8]" />
              Nền tảng du lịch linh hoạt
            </div>
            <h2 className="text-4xl font-bold leading-tight text-white">
              Khám phá mọi<br />
              <span style={{ color: '#92eee8' }}>góc khuất</span> Việt Nam.
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Thuê thiết bị camping, trekking, phương tiện và trải nghiệm từ hàng nghìn provider uy tín.
            </p>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="space-y-3">
          {[
            { icon: '🔒', text: 'Bảo mật JWT + 2FA TOTP' },
            { icon: '✓', text: 'KYC xác minh danh tính' },
            { icon: '⭐', text: '4.9/5 từ 12k+ reviews' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <span className="text-base">{item.icon}</span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12" style={{ background: '#f1f5fa' }}>
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: '#2a7bd9' }}
          >
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          </div>
          <span className="text-lg font-bold" style={{ color: '#0f1729' }}>FlexTrip</span>
        </div>

        <div className="w-full max-w-md">
          <div className="rounded-2xl border bg-white p-8 shadow-sm" style={{ borderColor: '#e2e8f3' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
