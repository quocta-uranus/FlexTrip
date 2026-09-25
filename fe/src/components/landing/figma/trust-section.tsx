import { ShieldCheck, Star, CalendarDays } from "lucide-react";

export function TrustSection() {
  return (
    <section className="w-full bg-[#F4FAFD] dark:bg-[#070B12] py-20 sm:py-28 px-6 sm:px-12 transition-colors duration-300" id="trust">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-center">
        {/* Left Column: Copy & Value Props */}
        <div>
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#00A3FF] dark:text-[#38BDF8] mb-3">
            <span className="h-[1px] w-6 bg-current" />
            Niềm tin cho mỗi lần bàn giao
          </p>
          <h2 className="text-3xl sm:text-5xl lg:text-[46px] font-extrabold text-slate-900 dark:text-white leading-[1.12] tracking-tight">
            Biết rõ bạn thuê gì.<br />
            <span className="text-[#00A3FF] dark:text-[#38BDF8]">Và thuê từ ai.</span>
          </h2>
          <p className="mt-5 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
            Mỗi quyết định thuê bắt đầu từ thông tin rõ ràng. FlexTrip tạo không gian
            để Traveler và Provider hiểu nhau trước khi cùng xác nhận.
          </p>

          <div className="mt-9 space-y-5">
            <div className="flex items-start gap-4 border-t border-[#DCEFFB] dark:border-white/10 pt-5">
              <ShieldCheck className="h-6 w-6 text-[#00A3FF] dark:text-[#38BDF8] shrink-0 mt-0.5" />
              <div>
                <strong className="text-base sm:text-lg font-bold text-slate-900 dark:text-white block tracking-tight">
                  Hồ sơ Provider
                </strong>
                <small className="text-slate-500 dark:text-slate-400 text-xs mt-1 block">
                  Thông tin và trạng thái xác minh hiển thị rõ ràng
                </small>
              </div>
            </div>

            <div className="flex items-start gap-4 border-t border-[#DCEFFB] dark:border-white/10 pt-5">
              <Star className="h-6 w-6 text-[#00A3FF] dark:text-[#38BDF8] shrink-0 mt-0.5" />
              <div>
                <strong className="text-base sm:text-lg font-bold text-slate-900 dark:text-white block tracking-tight">
                  Đánh giá cộng đồng
                </strong>
                <small className="text-slate-500 dark:text-slate-400 text-xs mt-1 block">
                  Tham khảo trải nghiệm từ những lượt thuê trước
                </small>
              </div>
            </div>

            <div className="flex items-start gap-4 border-t border-[#DCEFFB] dark:border-white/10 pt-5">
              <CalendarDays className="h-6 w-6 text-[#00A3FF] dark:text-[#38BDF8] shrink-0 mt-0.5" />
              <div>
                <strong className="text-base sm:text-lg font-bold text-slate-900 dark:text-white block tracking-tight">
                  Theo dõi yêu cầu
                </strong>
                <small className="text-slate-500 dark:text-slate-400 text-xs mt-1 block">
                  Quản lý trạng thái thuê trong cùng một nền tảng
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Image with Floating Review Card */}
        <div className="relative pb-10 sm:pb-12 pl-4 sm:pl-10">
          {/* Main Landscape Photo Container */}
          <div className="relative aspect-[4/3] sm:aspect-[1.18/1] w-full rounded-[28px] overflow-hidden shadow-2xl border border-sky-100/60 dark:border-white/10">
            <img
              src="/assets/valley-camp.jpg"
              alt="Khu cắm trại trong thung lũng xanh"
              className="h-full w-full object-cover"
            />
          </div>

          {/* Floating Testimonial Card */}
          <div className="absolute bottom-0 left-0 z-10 bg-white dark:bg-[#121A2C] p-6 sm:p-7 rounded-2xl shadow-[0_20px_50px_rgba(2,50,90,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] max-w-[310px] sm:max-w-[360px] border border-slate-100 dark:border-white/15 transition-all">
            <div className="text-[#00A3FF] dark:text-[#38BDF8] text-xs font-bold tracking-wider mb-2.5">
              ★★★★★
            </div>
            <p className="text-sm sm:text-[15px] font-semibold text-slate-900 dark:text-white leading-snug tracking-tight">
              “Bộ lều đúng như ảnh, Provider hướng dẫn rất kỹ và điểm nhận chỉ cách homestay vài phút.”
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C8EDFF] text-[#075D82] dark:bg-sky-950 dark:text-sky-300 font-bold text-xs">
                AN
              </div>
              <div>
                <strong className="text-xs font-bold text-slate-900 dark:text-white block">An Nhiên</strong>
                <small className="text-[11px] text-slate-500 dark:text-slate-400 block">Traveler · Đà Lạt</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
