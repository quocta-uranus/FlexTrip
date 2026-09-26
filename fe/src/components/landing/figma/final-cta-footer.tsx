import Link from"next/link";
import { ArrowRight } from"lucide-react";

export function FinalCtaFooter() {
  return (
    <>
      {/* Final CTA Banner */}
      <section className="relative min-h-[540px] sm:min-h-[590px] overflow-hidden text-white flex items-center justify-center text-center">
        <img
          src="/assets/adventure.jpg"
          alt="Người du lịch trên con đường giữa núi"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#00395a]/75 dark:bg-[#070b12]/85 transition-colors duration-300 z-[1]" />

        <div className="relative z-[2] max-w-4xl px-6 py-20">
          <p className="flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#92eee8] dark:text-[#38bdf8] mb-4">
            <span className="h-[1px] w-6 bg-current" />
            Bắt đầu theo cách linh hoạt hơn
            <span className="h-[1px] w-6 bg-current" />
          </p>

          <h2 className="text-3xl sm:text-5xl lg:text-[48px] font-extrabold leading-tight tracking-tight">
            Chuyến đi tiếp theo không cần<br />
            bắt đầu bằng một <em className="not-italic text-[#92eee8] dark:text-[#38bdf8]">danh sách mua sắm.</em>
          </h2>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/search"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-sm text-white shadow-xl transition-all hover:-translate-y-0.5"
              style={{ background:"linear-gradient(135deg, #2a7bd9 0%, #00b4ea 55%, #92eee8 100%)" }}
            >
              <span>Tìm thiết bị</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register-provider"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-sm text-white border border-white/60 dark:border-white/30 hover:bg-white/10 transition-colors dark:bg-[#121A2C] dark:text-white"
            >
              Cho thuê thiết bị
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#097dae] dark:bg-[#060A10] text-white pt-20 pb-8 px-6 sm:px-12 border-t border-sky-400/20 dark:border-white/10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-12 pb-16 border-b border-white/15 dark:border-white/10">
            <div>
              <Link href="#top" className="inline-flex items-center gap-2.5 text-2xl font-bold group">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#2A7BD9] via-[#00B4EA] to-[#92EEE8] flex items-center justify-center shadow-md shadow-[#2A7BD9]/25">
                  <span className="text-white font-bold text-sm leading-none">F</span>
                </div>
                <span>FlexTrip</span>
              </Link>
              <p className="text-lg sm:text-xl font-medium text-white/70 dark:text-slate-400 mt-6 leading-relaxed max-w-sm tracking-tight">
                Cần thiết bị? Hãy thuê.<br />
                Có thiết bị? Hãy cho thuê.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
              <div className="flex flex-col gap-3 text-xs">
                <strong className="text-[#92eee8] dark:text-[#38bdf8] font-bold uppercase tracking-wider mb-2">Khám phá</strong>
                <Link href="/search?category=CAMPING_TREKKING" className="text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-[#38bdf8] transition-colors">Cắm trại</Link>
                <Link href="/search?category=CAMPING_TREKKING" className="text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-[#38bdf8] transition-colors">Trekking</Link>
                <Link href="/search?category=STAY" className="text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-[#38bdf8] transition-colors">Camera & GoPro</Link>
                <Link href="/search?category=EXPERIENCE" className="text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-[#38bdf8] transition-colors">Thể thao dưới nước</Link>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                <strong className="text-[#92eee8] dark:text-[#38bdf8] font-bold uppercase tracking-wider mb-2">FlexTrip</strong>
                <a href="#how-it-works" className="text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-[#38bdf8] transition-colors">Cách hoạt động</a>
                <a href="#trust" className="text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-[#38bdf8] transition-colors">Về chúng tôi</a>
                <Link href="/search" className="text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-[#38bdf8] transition-colors">Trung tâm trợ giúp</Link>
                <Link href="/search" className="text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-[#38bdf8] transition-colors">Gợi ý hành trình</Link>
              </div>

              <div className="flex flex-col gap-3 text-xs col-span-2 sm:col-span-1">
                <strong className="text-[#92eee8] dark:text-[#38bdf8] font-bold uppercase tracking-wider mb-2">Provider</strong>
                <Link href="/register-provider" className="text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-[#38bdf8] transition-colors">Trở thành Provider</Link>
                <Link href="/register-provider" className="text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-[#38bdf8] transition-colors">Cách đăng thiết bị</Link>
                <a href="#trust" className="text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-[#38bdf8] transition-colors">Tiêu chuẩn listing</a>
                <Link href="/register-provider" className="text-white/70 dark:text-slate-400 hover:text-white dark:hover:text-[#38bdf8] transition-colors">Hướng dẫn cho thuê</Link>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50 dark:text-slate-500">
            <span>© 2026 FlexTrip. Nền tảng chia sẻ thiết bị outdoor hàng đầu Việt Nam.</span>
            <div className="flex items-center gap-6">
              <Link href="#" className="hover:text-white dark:hover:text-slate-300 transition-colors">Điều khoản</Link>
              <Link href="#" className="hover:text-white dark:hover:text-slate-300 transition-colors">Quyền riêng tư</Link>
              <Link href="#" className="hover:text-white dark:hover:text-slate-300 transition-colors">Chính sách thuê</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
