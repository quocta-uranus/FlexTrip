"use client";

import { FormEvent, PointerEvent as ReactPointerEvent, useRef, useState } from"react";
import { useRouter } from"next/navigation";
import { MapPin, Search, Calendar } from"lucide-react";
import { useTheme } from"@/context/theme-context";

export function HeroSection() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme ==="dark";
  const [location, setLocation] = useState("Đà Lạt");
  const [category, setCategory] = useState("CAMPING_TREKKING");
  const [dateRange, setDateRange] = useState("12/10 — 15/10");
  const heroRef = useRef<HTMLElement>(null);

  const handleHeroMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType ==="touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const hero = heroRef.current;

    if (!hero) return;
    hero.style.setProperty("--image-x", `${(0.5 - x) * 20}px`);
    hero.style.setProperty("--image-y", `${(0.5 - y) * 12}px`);
    hero.style.setProperty("--content-x", `${(x - 0.5) * 12}px`);
    hero.style.setProperty("--content-y", `${(y - 0.5) * 8}px`);
    hero.style.setProperty("--hero-rx", `${(0.5 - y) * 2}deg`);
    hero.style.setProperty("--hero-ry", `${(x - 0.5) * 2.8}deg`);
    hero.style.setProperty("--panel-x", `${(0.5 - x) * 5}px`);
    hero.style.setProperty("--panel-y", `${(0.5 - y) * 4}px`);
    hero.style.setProperty("--panel-rx", `${(y - 0.5) * 0.9}deg`);
    hero.style.setProperty("--panel-ry", `${(0.5 - x) * 1.2}deg`);
    hero.style.setProperty("--glow-x", `${x * 100}%`);
    hero.style.setProperty("--glow-y", `${y * 100}%`);
  };

  const resetHero = () => {
    const hero = heroRef.current;
    if (!hero) return;
    ["--image-x","--image-y","--content-x","--content-y","--hero-rx","--hero-ry","--panel-x","--panel-y","--panel-rx","--panel-ry",
    ].forEach((property) => hero.style.removeProperty(property));
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (category) params.set("category", category);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <section
      className="hero relative min-h-[760px] sm:min-h-[820px] overflow-hidden text-white bg-slate-900 perspective-[1200px]"
      id="top"
      onPointerLeave={resetHero}
      onPointerMove={handleHeroMove}
      ref={heroRef}
      style={{
        ["--content-x" as any]:"0px",
        ["--content-y" as any]:"0px",
        ["--glow-x" as any]:"50%",
        ["--glow-y" as any]:"40%",
        ["--hero-rx" as any]:"0deg",
        ["--hero-ry" as any]:"0deg",
        ["--image-x" as any]:"0px",
        ["--image-y" as any]:"0px",
        ["--panel-rx" as any]:"0deg",
        ["--panel-ry" as any]:"0deg",
        ["--panel-x" as any]:"0px",
        ["--panel-y" as any]:"0px",
      }}
    >
      {/* Background Image & Overlay */}
      <img
        className="absolute inset-0 h-full w-full object-cover object-[center_55%] transition-transform duration-300 ease-out will-change-transform scale-[1.075]"
        src="/assets/hero.jpg"
        alt="Lều cắm trại giữa núi rừng Việt Nam"
        style={{
          transform:"translate3d(var(--image-x, 0px), var(--image-y, 0px), 0) scale(1.075)",
        }}
      />

      {/* Light Overlay */}
      <div
        className="absolute inset-0 z-[1] transition-opacity duration-300 dark:opacity-0"
        style={{
          background:"linear-gradient(90deg, rgba(0, 32, 55, 0.6) 0%, rgba(9, 125, 174, 0.2) 55%, rgba(42, 123, 217, 0.05) 100%), linear-gradient(0deg, rgba(0, 32, 55, 0.45) 0%, transparent 45%)",
        }}
      />

      {/* Dark Overlay: subtle cool twilight tint so the scenic mountains and pine forest are clearly visible */}
      <div
        className="absolute inset-0 z-[1] opacity-0 dark:opacity-100 transition-opacity duration-300"
        style={{
          background:"linear-gradient(180deg, rgba(7, 11, 18, 0.2) 0%, rgba(7, 11, 18, 0.28) 45%, rgba(7, 11, 18, 0.8) 100%), linear-gradient(90deg, rgba(7, 11, 18, 0.4) 0%, transparent 35%, transparent 65%, rgba(7, 11, 18, 0.4) 100%)",
        }}
      />

      {/* Ambient Glow */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] transition-[background-position] duration-200"
        style={{
          background:"radial-gradient(circle 430px at var(--glow-x, 50%) var(--glow-y, 40%), rgba(56, 189, 248, 0.16), transparent 72%)",
        }}
      />

      {/* Orbit Ornaments */}
      <div className="hero-atmosphere pointer-events-none absolute inset-0 z-[2] overflow-hidden" aria-hidden="true">
        <span className="absolute right-[8%] top-[17%] h-[280px] w-[280px] rounded-full border border-sky-200/20 dark:border-sky-400/10" />
        <span className="absolute -right-[11%] top-[5%] h-[510px] w-[510px] rounded-full border border-[#92eee8]/20 dark:border-sky-400/10" />
        <span className="absolute right-[31%] top-[27%] h-[7px] w-[7px] rounded-full bg-[#00b4ea]/30 dark:bg-[#38bdf8]/40 blur-[3px]" />
      </div>

      {/* Content Box */}
      <div
        className="hero-content absolute top-[16%] sm:top-[20%] z-[2] max-w-[800px] transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform:"translate3d(calc(-50% + var(--content-x, 0px)), var(--content-y, 0px), 70px) rotateX(var(--hero-rx, 0deg)) rotateY(var(--hero-ry, 0deg))",
        }}
      >
        <p className="eyebrow light mb-5 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[#c8edff] dark:text-[#38bdf8]">
          <span className="h-[1px] w-8 bg-current" />
          Thiết bị sẵn sàng. Hành trình rộng mở.
        </p>
        <h1 className="text-5xl sm:text-7xl lg:text-[80px] font-extrabold leading-[1.04] tracking-tight text-white">
          Cần đồ cho chuyến đi?<br />
          <em className="font-extrabold not-italic bg-gradient-to-r from-[#92EEE8] via-[#00B4EA] to-[#38BDF8] bg-clip-text text-transparent">
            Thuê thôi.
          </em>
        </h1>
        <p className="hero-copy mt-6 max-w-[620px] mx-auto text-base sm:text-lg text-white/80 dark:text-slate-300 leading-relaxed font-normal">
          Tìm và thuê thiết bị outdoor từ cộng đồng địa phương — đúng nơi, đúng lúc,
          không cần mua mọi thứ cho vài ngày khám phá.
        </p>
      </div>

      {/* Floating Search Bar */}
      <form
        className="search-panel absolute bottom-14 sm:bottom-20 lg:bottom-24 z-[3] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.1fr_1.1fr_1.1fr_auto] rounded-full transition-all duration-300 ease-out border p-1.5 pl-6 sm:pl-8 items-center"
        onSubmit={handleSearch}
        style={{
          backgroundColor: isDark ?"#121A2C" :"#FFFFFF",
          borderColor: isDark ?"rgba(255, 255, 255, 0.12)" :"#E0F2FE",
          boxShadow: isDark
            ?"0 20px 60px rgba(0, 0, 0, 0.55)"
            :"0 16px 45px rgba(2, 50, 90, 0.15), 0 4px 12px rgba(0, 0, 0, 0.04)",
          transform:"translate3d(calc(-50% + var(--panel-x, 0px)), var(--panel-y, 0px), 45px) rotateX(var(--panel-rx, 0deg)) rotateY(var(--panel-ry, 0deg))",
        }}
      >
        <label className={`flex items-center gap-3.5 border-b sm:border-b-0 sm:border-r py-3 sm:py-2 pr-5 cursor-text ${isDark ?"border-white/10" :"border-[#E2F1F8]"}`}>
          <MapPin className="h-5 w-5 shrink-0 text-[#00A3FF]" />
          <span className="w-full min-w-0">
            <small className={`block text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isDark ?"text-[#38BDF8]" :"text-[#8A9BA8]"}`}>
              Địa điểm
            </small>
            <input
              aria-label="Địa điểm"
              className={`w-full border-0 bg-transparent text-sm font-semibold outline-none p-0 ${isDark ?"text-white placeholder:text-slate-500" :"text-[#0E2233] placeholder:text-slate-400"}`}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="VD: Đà Lạt"
            />
          </span>
        </label>

        <label className={`flex items-center gap-3.5 border-b sm:border-b-0 sm:border-r py-3 sm:py-2 px-3 sm:px-5 cursor-text ${isDark ?"border-white/10" :"border-[#E2F1F8]"}`}>
          <Search className="h-5 w-5 shrink-0 text-[#00A3FF]" />
          <span className="w-full min-w-0">
            <small className={`block text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isDark ?"text-[#38BDF8]" :"text-[#8A9BA8]"}`}>
              Loại thiết bị
            </small>
            <select
              aria-label="Loại thiết bị"
              className={`w-full border-0 bg-transparent text-sm font-semibold outline-none p-0 cursor-pointer ${
                isDark
                  ?"text-white [&>option]:bg-[#121A2C] [&>option]:text-white"
                  :"text-[#0E2233] [&>option]:bg-white [&>option]:text-[#0E2233]"
              }`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option className="bg-white dark:bg-[#1A263E] text-slate-900 dark:text-white" value="CAMPING_TREKKING">Cắm trại</option>
              <option className="bg-white dark:bg-[#1A263E] text-slate-900 dark:text-white" value="TREKKING">Trekking & Leo núi</option>
              <option className="bg-white dark:bg-[#1A263E] text-slate-900 dark:text-white" value="STAY">Máy ảnh & GoPro</option>
              <option className="bg-white dark:bg-[#1A263E] text-slate-900 dark:text-white" value="EXPERIENCE">Thể thao dưới nước</option>
              <option className="bg-white dark:bg-[#1A263E] text-slate-900 dark:text-white" value="VEHICLE">Bếp dã ngoại</option>
            </select>
          </span>
        </label>

        <label className="flex items-center gap-3.5 py-3 sm:py-2 px-3 sm:px-5 cursor-text">
          <Calendar className="h-5 w-5 shrink-0 text-[#00A3FF]" />
          <span className="w-full min-w-0">
            <small className={`block text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isDark ?"text-[#38BDF8]" :"text-[#8A9BA8]"}`}>
              Ngày thuê
            </small>
            <input
              aria-label="Ngày thuê"
              className={`w-full border-0 bg-transparent text-sm font-semibold outline-none p-0 ${isDark ?"text-white placeholder:text-slate-500" :"text-[#0E2233] placeholder:text-slate-400"}`}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            />
          </span>
        </label>

        <button
          className="flex items-center justify-center gap-2 px-8 py-3.5 font-bold text-sm text-white rounded-full transition-all duration-200 shadow-md hover:opacity-95 hover:shadow-lg my-1 mr-1"
          style={{ background:"linear-gradient(135deg, #1877F2 0%, #00A3FF 55%, #00D8F6 100%)" }}
          type="submit"
        >
          <Search className="h-4 w-4 stroke-[2.5]" />
          <span>Tìm thiết bị</span>
        </button>
      </form>
    </section>
  );
}
