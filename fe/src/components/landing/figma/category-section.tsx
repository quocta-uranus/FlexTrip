"use client";

import Link from"next/link";
import { ArrowRight } from"lucide-react";
import { useTheme } from"@/context/theme-context";

const categories = [
  {
    name:"Lều & cắm trại",
    image:"/assets/camping.jpg",
    note:"Cho những đêm giữa thiên nhiên",
    cat:"CAMPING_TREKKING",
  },
  {
    name:"Trekking",
    image:"/assets/backpack.jpg",
    note:"Balo, gậy và phụ kiện đường dài",
    cat:"CAMPING_TREKKING",
  },
  {
    name:"Máy ảnh & GoPro",
    image:"/assets/camera.jpg",
    note:"Giữ trọn mọi khoảnh khắc",
    cat:"STAY",
  },
  {
    name:"Kayak & dưới nước",
    image:"/assets/kayak.jpg",
    note:"Thiết bị cho hành trình trên nước",
    cat:"EXPERIENCE",
  },
  {
    name:"Bếp & dã ngoại",
    image:"/assets/gear.jpg",
    note:"Bữa ăn ngon giữa trời rộng",
    cat:"CAMPING_TREKKING",
  },
  {
    name:"Phụ kiện du lịch",
    image:"/assets/travel-kit.jpg",
    note:"Mọi thứ nhỏ nhưng cần thiết",
    cat:"OTHER",
  },
];

export function CategorySection() {
  const { theme } = useTheme();
  const isDark = theme ==="dark";

  return (
    <section
      className="w-full py-20 px-6 sm:px-12 transition-colors duration-300"
      id="categories"
      style={{
        backgroundColor: isDark ?"#070B12" :"#FFFFFF",
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.16em] text-[#00A3FF] dark:text-[#38BDF8] mb-3">
              <span className="h-[1.5px] w-6 bg-current" />
              Chọn theo hành trình
            </p>
            <h2
              className="text-4xl sm:text-5xl lg:text-[54px] font-bold leading-[1.08] tracking-tight"
              style={{
                color: isDark ?"#FFFFFF" :"#0E2233",
              }}
            >
              Bạn cần gì<br />
              cho{""}
              <span className="text-[#00A3FF] dark:text-[#38BDF8]">
                chuyến đi?
              </span>
            </h2>
          </div>
          <p
            className="max-w-md text-xs sm:text-sm leading-relaxed"
            style={{
              color: isDark ?"#94A3B8" :"#5B7A93",
            }}
          >
            Từ một chiếc lều gọn nhẹ đến camera cho thước phim đáng nhớ. Thuê đúng
            thiết bị, dành ngân sách cho trải nghiệm.
          </p>
        </div>

        {/* 6 Category Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <Link
              key={category.name}
              href={`/search?category=${category.cat}`}
              className="group relative rounded-2xl overflow-hidden h-[260px] sm:h-[300px] shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 block"
              style={{
                border: isDark
                  ?"1px solid rgba(255, 255, 255, 0.1)"
                  :"1px solid rgba(220, 239, 251, 0.6)",
              }}
            >
              <img
                src={category.image}
                alt={category.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div
                className="absolute inset-0 z-[1]"
                style={{
                  background:"linear-gradient(0deg, rgba(0, 18, 32, 0.9) 0%, rgba(0, 18, 32, 0.42) 45%, transparent 70%)",
                }}
              />

              {/* Number Badge */}
              <span className="absolute top-4 left-4 z-[2] flex h-7 w-7 items-center justify-center rounded-full border border-white/40 text-[11px] font-semibold text-white bg-black/25 backdrop-blur-sm">
                0{index + 1}
              </span>

              {/* Text Information */}
              <div className="absolute bottom-5 left-5 z-[2] text-white">
                <small className="block text-[11px] text-white/80 font-normal mb-1">
                  {category.note}
                </small>
                <strong className="text-xl sm:text-2xl font-bold block leading-tight">
                  {category.name}
                </strong>
              </div>

              {/* Hover Arrow Icon */}
              <div
                className="absolute bottom-4 right-4 z-[2] flex h-9 w-9 items-center justify-center rounded-full text-white opacity-0 transform -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 shadow-lg"
                style={{
                  background:"linear-gradient(135deg, #1877F2 0%, #00A3FF 55%, #00D8F6 100%)",
                }}
              >
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
