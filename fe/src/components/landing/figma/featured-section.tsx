import Link from "next/link";
import { MapPin, Star, ArrowRight, Heart } from "lucide-react";

const listings = [
  {
    title: "Bộ lều Naturehike 2 người",
    location: "Đà Lạt, Lâm Đồng",
    price: "180.000đ",
    rating: "4.9",
    reviews: "36",
    image: "/assets/camping.jpg",
    tag: "Được yêu thích",
  },
  {
    title: "Combo Fujifilm & ống kính",
    location: "Quận 1, TP. Hồ Chí Minh",
    price: "320.000đ",
    rating: "4.8",
    reviews: "24",
    image: "/assets/camera.jpg",
    tag: "Phản hồi nhanh",
  },
  {
    title: "Balo trekking Deuter 50L",
    location: "Sa Pa, Lào Cai",
    price: "120.000đ",
    rating: "5.0",
    reviews: "18",
    image: "/assets/backpack.jpg",
    tag: "Provider xác minh",
  },
];

export function FeaturedSection() {
  return (
    <section className="bg-[#ebf7fd] py-20 px-6 sm:px-12 transition-colors duration-300" id="featured">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#00b4ea] mb-3">
            <span className="h-[1px] w-6 bg-current" />
            Được cộng đồng lựa chọn
          </p>
          <h2 className="text-3xl sm:text-5xl lg:text-[46px] font-extrabold text-slate-900 leading-tight tracking-tight">
            Thiết bị cho chuyến đi<br />
            <em className="not-italic text-[#097dae]">gần hơn bạn nghĩ.</em>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600">
            Khám phá một vài thiết bị nổi bật từ các Provider trên FlexTrip.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {listings.map((item) => (
            <article
              key={item.title}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-sky-100 transition-all duration-300 hover:-translate-y-1.5 flex flex-col"
            >
              <div className="relative h-64 sm:h-72 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-3.5 left-3.5 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold text-slate-800 shadow-sm">
                  {item.tag}
                </span>
                <button
                  aria-label={`Lưu ${item.title}`}
                  className="absolute top-3.5 right-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-sm transition-colors hover:text-red-500"
                  type="button"
                >
                  <Heart className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#097dae]">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{item.location}</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 mb-4 leading-snug group-hover:text-[#00b4ea] transition-colors tracking-tight">
                  {item.title}
                </h3>

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-base text-slate-900 font-bold">{item.price}</strong>
                    <span className="text-slate-500"> / ngày</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-900 font-bold">
                    <Star className="h-3.5 w-3.5 text-[#00b4ea] fill-[#00b4ea]" />
                    <span>{item.rating}</span>
                    <span className="text-slate-400 font-normal">({item.reviews})</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 font-bold text-sm text-slate-900 hover:text-[#00b4ea] border-b-2 border-slate-900 pb-1 transition-colors"
          >
            <span>Xem tất cả thiết bị</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
