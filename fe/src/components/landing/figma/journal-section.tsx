import Link from "next/link";
import { ArrowRight } from "lucide-react";

const articles = [
  { image: "travel-kit.jpg", tag: "Checklist", title: "Checklist 12 món cho chuyến cắm trại đầu tiên", time: "7 phút đọc" },
  { image: "backpack.jpg", tag: "Trekking", title: "Chọn balo trekking theo độ dài hành trình", time: "5 phút đọc" },
  { image: "camera.jpg", tag: "Kinh nghiệm thuê", title: "5 điều cần kiểm tra khi nhận camera", time: "6 phút đọc" },
];

export function JournalSection() {
  return (
    <section className="w-full bg-white py-24 px-6 sm:px-12 transition-colors duration-300" id="journal">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
        <div>
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#00b4ea] mb-3">
            <span className="h-[1px] w-6 bg-current" />
            Field notes
          </p>
          <h2 className="text-3xl sm:text-5xl lg:text-[46px] font-extrabold text-slate-900 leading-tight tracking-tight">
            Chuẩn bị tốt.<br />
            <em className="not-italic text-[#00b4ea]">Đi xa hơn.</em>
          </h2>
        </div>
        <p className="max-w-md text-sm sm:text-base text-slate-600">
          Gợi ý thiết thực để chọn, nhận và sử dụng thiết bị đúng cách.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {articles.map((art) => (
          <article key={art.title} className="group flex flex-col">
            <Link href="/search" className="overflow-hidden rounded-xl mb-4 aspect-[1.25] block border border-transparent">
              <img
                src={`/assets/${art.image}`}
                alt={art.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </Link>

            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#00b4ea]">
              <span>{art.tag}</span>
              <small className="text-slate-400 font-normal">{art.time}</small>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mt-3 mb-4 leading-snug group-hover:text-[#00b4ea] transition-colors tracking-tight">
              <Link href="/search">{art.title}</Link>
            </h3>

            <Link
              href="/search"
              className="mt-auto inline-flex items-center gap-2 text-xs font-bold text-slate-900 group-hover:text-[#00b4ea] transition-colors"
            >
              <span>Đọc bài viết</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </div>
      </div>
    </section>
  );
}
