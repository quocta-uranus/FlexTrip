"use client";

import { useState } from"react";
import { ChevronRight } from"lucide-react";

const travelerSteps = [
  ["01","Tìm thiết bị","Chọn địa điểm, danh mục và khoảng ngày phù hợp với hành trình."],
  ["02","Gửi yêu cầu thuê","So sánh hình ảnh, mức giá và đánh giá trước khi gửi yêu cầu."],
  ["03","Nhận đồ & lên đường","Thống nhất bàn giao, trải nghiệm chuyến đi và để lại đánh giá."],
];

const providerSteps = [
  ["01","Đăng thiết bị","Thêm hình ảnh thật, mô tả, mức giá và lịch sẵn sàng của bạn."],
  ["02","Duyệt yêu cầu","Trao đổi với Traveler và chủ động quản lý từng yêu cầu thuê."],
  ["03","Tạo thêm thu nhập","Biến thiết bị đang nhàn rỗi thành giá trị cho cộng đồng."],
];

export function HowSection() {
  const [audience, setAudience] = useState<"traveler" |"provider">("traveler");

  const activeSteps = audience ==="traveler" ? travelerSteps : providerSteps;

  return (
    <section
      className="bg-[#097dae] dark:bg-[#0e1626] text-white py-24 px-6 sm:px-12 border-t border-sky-400/20 dark:border-white/10 transition-colors duration-300"
      id="how-it-works"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-20 items-start">
        <div>
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#c8edff] dark:text-[#38bdf8] mb-3">
            <span className="h-[1px] w-6 bg-current" />
            Một marketplace, hai hành trình
          </p>
          <h2 className="text-3xl sm:text-5xl lg:text-[46px] font-extrabold leading-tight tracking-tight">
            Từ thiết bị đang chờ<br />
            đến chuyến đi <em className="not-italic text-[#92eee8] dark:text-[#38bdf8]">đang gọi.</em>
          </h2>

          <div className="mt-10 inline-flex p-1.5 rounded-full bg-white/10 dark:bg-slate-900/60 backdrop-blur-md border border-white/15 dark:border-white/10">
            <button
              className={`px-6 py-3 rounded-full text-xs font-bold transition-all ${
                audience ==="traveler"
                  ?"text-white shadow-md"
                  :"text-white/60 dark:text-slate-400 hover:text-white"
              }`}
              style={{
                background: audience ==="traveler" ?"linear-gradient(135deg, #2a7bd9 0%, #00b4ea 55%, #92eee8 100%)" :"transparent",
              }}
              onClick={() => setAudience("traveler")}
              type="button"
            >
              Tôi là Traveler
            </button>
            <button
              className={`px-6 py-3 rounded-full text-xs font-bold transition-all ${
                audience ==="provider"
                  ?"text-white shadow-md"
                  :"text-white/60 dark:text-slate-400 hover:text-white"
              }`}
              style={{
                background: audience ==="provider" ?"linear-gradient(135deg, #2a7bd9 0%, #00b4ea 55%, #92eee8 100%)" :"transparent",
              }}
              onClick={() => setAudience("provider")}
              type="button"
            >
              Tôi là Provider
            </button>
          </div>
        </div>

        <div className="border-t border-white/20 dark:border-white/10 divide-y divide-white/20 dark:divide-white/10">
          {activeSteps.map(([number, title, copy]) => (
            <article key={`${audience}-${number}`} className="py-8 flex items-center justify-between gap-6">
              <span className="text-xl sm:text-2xl text-[#92eee8] dark:text-[#38bdf8] shrink-0 font-extrabold tracking-tight">
                {number}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">{title}</h3>
                <p className="text-xs sm:text-sm text-white/70 dark:text-slate-400 leading-relaxed max-w-md">{copy}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/40 dark:text-white/25 shrink-0 hidden sm:block" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
