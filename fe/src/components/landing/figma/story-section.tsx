import { Check, ArrowRight } from "lucide-react";

export function StorySection() {
  return (
    <section className="w-full bg-white dark:bg-[#070B12] py-24 px-6 sm:px-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-12 lg:gap-20 items-center">
        <div className="relative min-h-[420px] sm:min-h-[560px] rounded-2xl overflow-hidden shadow-lg border border-transparent dark:border-white/10 order-2 lg:order-1">
          <img
            src="/assets/vietnam-hike.jpg"
            alt="Những người bạn khám phá núi rừng Việt Nam"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute bottom-6 right-6 sm:-right-4 sm:-bottom-4 z-10 p-6 sm:p-8 text-white max-w-xs shadow-xl rounded-xl"
            style={{ background: "linear-gradient(135deg, #2a7bd9 0%, #00b4ea 55%, #92eee8 100%)" }}
          >
            <strong className="text-xl sm:text-2xl font-bold block leading-tight tracking-tight">Đi nhẹ hơn.</strong>
            <span className="text-xs text-white/90 mt-1 block">Trải nghiệm nhiều hơn.</span>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#00b4ea] dark:text-[#38bdf8] mb-3">
            <span className="h-[1px] w-6 bg-current" />
            Không cần sở hữu mọi thứ
          </p>
          <h2 className="text-3xl sm:text-5xl lg:text-[46px] font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
            Thiết bị chỉ là phương tiện.<br />
            <em className="not-italic text-[#00b4ea] dark:text-[#38bdf8]">Hành trình mới là điều ở lại.</em>
          </h2>
          <p className="mt-6 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
            FlexTrip giúp bạn tiếp cận thiết bị phù hợp cho từng chuyến đi mà không phải
            mua mới, cất giữ hay vận chuyển những món đồ cồng kềnh đi quá xa.
          </p>

          <ul className="mt-8 space-y-4 text-sm text-slate-800 dark:text-slate-200 font-medium">
            {[
              "Tìm thiết bị gần nơi chuyến đi bắt đầu",
              "So sánh mức giá và thông tin Provider",
              "Thuê linh hoạt theo lịch trình của bạn",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#c8edff] text-slate-900 dark:bg-sky-950/80 dark:border dark:border-sky-500/30 dark:text-[#38bdf8] shrink-0">
                  <Check className="h-4 w-4" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-sm text-white shadow-md hover:shadow-xl transition-all hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #2a7bd9 0%, #00b4ea 55%, #92eee8 100%)" }}
            >
              <span>Tìm hiểu cách hoạt động</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
