import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ProviderSection() {
  return (
    <section className="relative min-h-[580px] sm:min-h-[640px] overflow-hidden text-white flex items-center" id="provider">
      <img
        src="/assets/gear.jpg"
        alt="Thiết bị outdoor được chuẩn bị cho chuyến đi"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Light Overlay */}
      <div
        className="absolute inset-0 z-[1] transition-opacity duration-300"
        style={{
          background: "linear-gradient(90deg, rgba(0, 55, 88, 0.95) 0%, rgba(9, 125, 174, 0.82) 48%, rgba(42, 123, 217, 0.2) 100%)",
        }}
      />
      {/* Dark Overlay */}
      <div
        className="absolute inset-0 z-[1] opacity-0 transition-opacity duration-300"
        style={{
          background: "linear-gradient(90deg, rgba(7, 11, 18, 0.98) 0%, rgba(14, 22, 38, 0.92) 50%, rgba(7, 11, 18, 0.7) 100%)",
        }}
      />

      <div className="relative z-[2] px-6 sm:px-16 max-w-2xl my-auto py-16">
        <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#92eee8] mb-3">
          <span className="h-[1px] w-6 bg-current" />
          Dành cho người sở hữu thiết bị
        </p>
        <h2 className="text-3xl sm:text-5xl lg:text-[46px] font-extrabold leading-tight tracking-tight">
          Đừng để thiết bị<br />
          <em className="not-italic text-[#92eee8]">chờ chuyến đi tiếp theo.</em>
        </h2>
        <p className="mt-6 text-sm sm:text-base text-white/75 leading-relaxed">
          Đăng thiết bị nhàn rỗi, chủ động đặt giá và lịch sẵn sàng.
          Bạn tạo thêm thu nhập — cộng đồng có thêm cơ hội khám phá.
        </p>

        <div className="mt-10">
          <Link
            href="/register-provider"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-sm text-white shadow-lg hover:shadow-2xl transition-all hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #2a7bd9 0%, #00b4ea 55%, #92eee8 100%)" }}
          >
            <span>Trở thành Provider</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
