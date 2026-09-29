"use client";

import { useState, useEffect, type ReactNode } from "react";
import {
  useMouseTilt,
  useMagnetic,
  useCountUp,
  useReveal,
  useScrollY,
  useSparkle,
  useConfetti,
  useReducedMotion,
  useHoverX,
  type Sparkle,
  type ConfettiPiece,
} from "@/hooks/useWowMotion";

export {
  useConfetti,
  useHoverX,
  useReducedMotion,
  useScrollY,
  useCountUp,
  useReveal,
  useSparkle,
} from "@/hooks/useWowMotion";

/* ─────────────────────────────────────────────────────────────────────
 *  Reveal on scroll — fade + translateY, stagger 80–140ms
 * ───────────────────────────────────────────────────────────────────── */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const { ref, visible } = useReveal(delay);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity 600ms cubic-bezier(.2,.8,.2,1) ${delay}ms, transform 600ms cubic-bezier(.2,.8,.2,1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  Animated gradient text — gradient 3 màu chạy 6s
 * ───────────────────────────────────────────────────────────────────── */
export function AnimatedGradientText({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`bg-gradient-to-r from-[#2a7bd9] via-[#92eee8] to-[#5fd6cd] bg-clip-text text-transparent ${className}`}
      style={{
        backgroundSize: "200% 200%",
        animation: "wow-gradient 6s ease-in-out infinite",
        WebkitBackgroundClip: "text",
      }}
    >
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  Blob background — 3 blob trôi 18–28s + parallax
 * ───────────────────────────────────────────────────────────────────── */
export function BlobBackground({
  variant = "soft",
  parallax = false,
}: {
  variant?: "soft" | "rich";
  parallax?: boolean;
}) {
  const y = useScrollY();
  const baseOffset = parallax ? y * 0.25 : 0;

  const blobs =
    variant === "soft"
      ? [
          { c1: "#92eee8", c2: "#5fd6cd", size: 360, top: "-10%", left: "-8%", dur: 22 },
          { c1: "#4a92e8", c2: "#2a7bd9", size: 280, top: "60%", right: "-10%", dur: 28 },
          { c1: "#5fd6cd", c2: "#92eee8", size: 220, bottom: "-8%", left: "40%", dur: 24 },
        ]
      : [
          { c1: "#92eee8", c2: "#2a7bd9", size: 420, top: "-12%", left: "-10%", dur: 20 },
          { c1: "#4a92e8", c2: "#92eee8", size: 320, top: "30%", right: "-8%", dur: 26 },
          { c1: "#5fd6cd", c2: "#4a92e8", size: 260, bottom: "-10%", left: "30%", dur: 30 },
          { c1: "#2a7bd9", c2: "#92eee8", size: 200, top: "55%", left: "8%", dur: 18 },
        ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-brand-dots opacity-50"
        style={{ transform: `translateY(${baseOffset * 0.4}px)` }}
      />
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            top: b.top,
            left: b.left,
            right: b.right,
            bottom: b.bottom,
            width: b.size,
            height: b.size,
            background: `radial-gradient(circle, ${b.c1}, ${b.c2})`,
            opacity: 0.35,
            animation: `wow-blob ${b.dur}s ease-in-out infinite`,
            animationDelay: `${i * -4}s`,
            willChange: "transform",
            transform: `translateY(${baseOffset}px)`,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  ParallaxCover — wrapper cover có parallax layer
 * ───────────────────────────────────────────────────────────────────── */
export function ParallaxCover({
  children,
  height = 208,
}: {
  children?: ReactNode;
  height?: number;
}) {
  return (
    <section className="relative overflow-hidden bg-brand-gradient" style={{ height }}>
      <BlobBackground variant="soft" parallax />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/25 blur-2xl" />
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#92eee8]/50 blur-3xl" />
      <div className="relative z-10 h-full">{children}</div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  MagneticAvatar — bị hút nhẹ theo chuột + tilt
 * ───────────────────────────────────────────────────────────────────── */
export function MagneticAvatar({ children, strength = 0.18 }: { children: ReactNode; strength?: number }) {
  const { ref, style, onMove, onLeave } = useMagnetic(strength);
  return (
    <div ref={ref} style={style} onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  TiltCard — 3D tilt theo chuột, dùng cho hub role card / listing
 * ───────────────────────────────────────────────────────────────────── */
export function TiltCard({
  children,
  max = 8,
  className = "",
  as: As = "div",
}: {
  children: ReactNode;
  max?: number;
  className?: string;
  as?: "div" | "a";
}) {
  const { ref, style, onMove, onLeave } = useMouseTilt(max);
  return (
    <As
      ref={ref as any}
      className={className}
      style={{ ...style, transformStyle: "preserve-3d" as any }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </As>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  Counter — chạy 0 → giá trị easeOutCubic
 * ───────────────────────────────────────────────────────────────────── */
export function Counter({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
  trigger = true,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  trigger?: boolean;
}) {
  const v = useCountUp(value, 1100, trigger);
  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {v.toLocaleString("vi-VN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  ProgressRing — SVG ring gradient quanh completion %
 * ───────────────────────────────────────────────────────────────────── */
export function ProgressRing({
  percent,
  size = 56,
  stroke = 5,
  className = "",
}: {
  percent: number;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (percent / 100);
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="wow-ring-spin" style={{ animationDuration: "12s" }}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2a7bd9" />
            <stop offset="50%" stopColor="#92eee8" />
            <stop offset="100%" stopColor="#5fd6cd" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(146,238,232,0.25)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <span className="absolute text-xs font-bold tabular-nums" style={{ color: "#2a7bd9" }}>
        {percent}%
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  SparkleBadge — sparkle ngẫu nhiên cho badge "đã đạt"
 * ───────────────────────────────────────────────────────────────────── */
export function SparkleBadge({ children, className = "" }: { children: ReactNode; className?: string }) {
  const items = useSparkle(8, 1100);
  return (
    <div className={`relative overflow-visible ${className}`} style={{ animation: "wow-glow-pulse 3s ease-in-out infinite" }}>
      {items.map((s: Sparkle) => (
        <span
          key={s.id}
          className="pointer-events-none absolute block rounded-full"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            background: `hsl(${s.hue}, 90%, 70%)`,
            boxShadow: `0 0 ${s.size * 2}px hsl(${s.hue}, 90%, 70%)`,
            animation: `wow-sparkle 900ms ease-out ${s.delay}ms forwards`,
          }}
        />
      ))}
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  ConfettiBurst — 36 mảnh màu rơi khi save
 * ───────────────────────────────────────────────────────────────────── */
export function ConfettiBurst({ pieces }: { pieces: ConfettiPiece[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute left-1/2 top-1/2 block"
          style={
            p.shape === "rect"
              ? {
                  width: p.size,
                  height: p.size * 0.4,
                  background: `hsl(${p.hue}, 90%, 60%)`,
                  animation: `wow-confetti 1400ms cubic-bezier(.2,.8,.2,1) ${p.delay}ms forwards`,
                  transform: `translate(0,0) rotate(0deg)`,
                  ["--dx" as any]: `${p.dx}px`,
                  ["--dy" as any]: `${p.dy}px`,
                  ["--rot" as any]: `${p.rot}deg`,
                }
              : p.shape === "circle"
              ? {
                  width: p.size * 0.7,
                  height: p.size * 0.7,
                  borderRadius: "50%",
                  background: `hsl(${p.hue}, 90%, 65%)`,
                  animation: `wow-confetti 1400ms cubic-bezier(.2,.8,.2,1) ${p.delay}ms forwards`,
                  transform: `translate(0,0) rotate(0deg)`,
                  ["--dx" as any]: `${p.dx}px`,
                  ["--dy" as any]: `${p.dy}px`,
                  ["--rot" as any]: `${p.rot}deg`,
                }
              : {
                  width: 0,
                  height: 0,
                  borderLeft: `${p.size * 0.5}px solid transparent`,
                  borderRight: `${p.size * 0.5}px solid transparent`,
                  borderBottom: `${p.size}px solid hsl(${p.hue}, 90%, 60%)`,
                  animation: `wow-confetti 1400ms cubic-bezier(.2,.8,.2,1) ${p.delay}ms forwards`,
                  transform: `translate(0,0) rotate(0deg)`,
                  ["--dx" as any]: `${p.dx}px`,
                  ["--dy" as any]: `${p.dy}px`,
                  ["--rot" as any]: `${p.rot}deg`,
                }
          }
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  Marquee — dải chữ chạy ngang (trust strip)
 * ───────────────────────────────────────────────────────────────────── */
export function Marquee({
  items,
  duration = 28,
  className = "",
}: {
  items: string[];
  duration?: number;
  className?: string;
}) {
  const [paused, setPaused] = useState(false);
  const list = [...items, ...items]; // nhân đôi để loop mượt
  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${className}`}
      style={{ borderColor: "rgba(146,238,232,0.4)", background: "rgba(146,238,232,0.08)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex w-max gap-10 py-3"
        style={{
          animation: `wow-marquee ${duration}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {list.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold" style={{ color: "#1e5aa8" }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#92eee8", boxShadow: "0 0 8px #92eee8" }} />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  PulseDot — chấm chấm nhỏ đập, dùng cho eyebrow / live
 * ───────────────────────────────────────────────────────────────────── */
export function PulseDot({
  color = "#92eee8",
  size = 6,
  className = "",
}: {
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`relative inline-flex ${className}`} style={{ width: size, height: size }}>
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: color, opacity: 0.6, animation: "wow-ping 1.8s cubic-bezier(0,0,.2,1) infinite" }}
      />
      <span className="relative inline-block rounded-full" style={{ width: size, height: size, background: color }} />
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  LiveDot — badge đỏ đập "LIVE" / "ON-DUTY"
 * ───────────────────────────────────────────────────────────────────── */
export function LiveDot({
  label = "LIVE",
  className = "",
  tone = "red",
}: {
  label?: string;
  className?: string;
  tone?: "red" | "blue";
}) {
  const bg = tone === "red" ? "#dc2626" : "#2a7bd9";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg ${className}`}
      style={{ background: bg, animation: "wow-live 1.4s ease-in-out infinite" }}
    >
      <span
        className="relative inline-flex"
        style={{ width: 6, height: 6 }}
      >
        <span
          className="absolute inset-0 rounded-full bg-white"
          style={{ opacity: 0.7, animation: "wow-ping 1.4s cubic-bezier(0,0,.2,1) infinite" }}
        />
        <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  HoverShift — wrapper có translateX khi hover (verify/security items)
 * ───────────────────────────────────────────────────────────────────── */
export function HoverShift({ children, px = 2, className = "" }: { children: ReactNode; px?: number; className?: string }) {
  const h = useHoverX(px);
  return (
    <div className={className} style={h.style} onMouseEnter={h.onMouseEnter} onMouseLeave={h.onMouseLeave}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  EditingBanner — banner "Đang chỉnh sửa..." hiện khi editing=true
 * ───────────────────────────────────────────────────────────────────── */
export function EditingBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center sm:top-24">
      <div
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold shadow-xl backdrop-blur"
        style={{
          borderColor: "#2a7bd9",
          background: "rgba(146,238,232,0.95)",
          color: "#1e5aa8",
          boxShadow: "0 14px 32px -10px rgba(42,123,217,0.45)",
          animation: "wow-live 1.6s ease-in-out infinite",
        }}
      >
        <span
          className="relative inline-flex"
          style={{ width: 8, height: 8 }}
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: "#2a7bd9", opacity: 0.6, animation: "wow-ping 1.6s cubic-bezier(0,0,.2,1) infinite" }}
          />
          <span className="relative inline-block rounded-full" style={{ width: 8, height: 8, background: "#2a7bd9" }} />
        </span>
        ✏️ Đang chỉnh sửa — các field đã sáng, có thể nhập liệu
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 *  StickyEditBar — thanh Sticky dưới đáy khi đang chỉnh sửa
 *  (đảm bảo nút Lưu/Hủy luôn trong tầm tay, dù cuộn tới đâu)
 * ───────────────────────────────────────────────────────────────────── */
export function StickyEditBar({
  visible,
  savedAt,
  onSave,
  onCancel,
  brand = "#2a7bd9",
  saving = false,
}: {
  visible: boolean;
  savedAt?: string | null;
  onSave: () => void;
  onCancel: () => void;
  brand?: string;
  saving?: boolean;
}) {
  const [justSaved, setJustSaved] = useState(false);

  // Reset trạng thái "just saved" sau 3 giây
  useEffect(() => {
    if (savedAt) {
      setJustSaved(true);
      const timer = setTimeout(() => setJustSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [savedAt]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur transition-all duration-300"
      style={{
        borderColor: justSaved ? "rgba(16,185,129,0.5)" : "rgba(146,238,232,0.5)",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3">
        <div className="flex items-center gap-2 text-sm" style={{ color: justSaved ? "#059669" : "#1e5aa8" }}>
          {justSaved ? (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Đã lưu hồ sơ!</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="font-medium">Đang chỉnh sửa — nhớ bấm Lưu để giữ thay đổi.</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full border bg-white px-4 py-2 text-sm font-semibold hover:bg-[var(--surface-muted)] disabled:opacity-50"
            style={{ borderColor: "#e2e8f3" }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-60 transition-all"
            style={{
              background: saving || justSaved
                ? "linear-gradient(135deg, #10b981, #059669)"
                : brand,
              boxShadow: saving || justSaved
                ? "0 8px 20px -8px rgba(16,185,129,0.5)"
                : `0 8px 20px -8px ${brand}80`,
            }}
          >
            {saving || justSaved ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {justSaved ? "Đã lưu" : "Đang lưu..."}
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Lưu thay đổi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
