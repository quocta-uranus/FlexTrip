"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";

/**
 * Bộ hook gom cho các hiệu ứng wow-factor ở 3 trang profile.
 * Mọi hook đều respect prefers-reduced-motion (return an toàn khi user tắt motion).
 */

/* ─── prefers-reduced-motion ──────────────────────────────────────────── */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/* ─── scrollY để parallax cover ──────────────────────────────────────── */
export function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return y;
}

/* ─── Mouse tilt (±8°–10°) cho avatar / card 3D ─────────────────────── */
export function useMouseTilt(max = 10) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    transform: "perspective(800px) rotateX(0deg) rotateY(0deg)",
    transition: "transform 220ms cubic-bezier(.2,.8,.2,1)",
  });

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      setStyle({
        transform: `perspective(800px) rotateY(${px * 2 * max}deg) rotateX(${-py * 2 * max}deg)`,
        transition: "transform 80ms linear",
      });
    },
    [max]
  );
  const onLeave = useCallback(() => {
    setStyle({
      transform: "perspective(800px) rotateX(0deg) rotateY(0deg)",
      transition: "transform 320ms cubic-bezier(.2,.8,.2,1)",
    });
  }, []);

  return { ref, style, onMove, onLeave };
}

/* ─── Magnetic — phần tử bị "hút" nhẹ về phía con trỏ ───────────────── */
export function useMagnetic(strength = 0.25) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    transform: "translate(0,0)",
    transition: "transform 220ms cubic-bezier(.2,.8,.2,1)",
  });
  const reduced = useReducedMotion();

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (reduced) return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) * strength;
      const dy = (e.clientY - cy) * strength;
      setStyle({
        transform: `translate(${dx}px, ${dy}px)`,
        transition: "transform 60ms linear",
      });
    },
    [reduced, strength]
  );
  const onLeave = useCallback(() => {
    setStyle({
      transform: "translate(0,0)",
      transition: "transform 320ms cubic-bezier(.2,.8,.2,1)",
    });
  }, []);

  return { ref, style, onMove, onLeave };
}

/* ─── Counter count-up 0 → target với easeOutCubic ───────────────────── */
export function useCountUp(target: number, durationMs = 1100, trigger = true) {
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!trigger) return;
    if (reduced) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, trigger, reduced]);
  return value;
}

/* ─── Reveal on scroll — fade + translateY với stagger ──────────────── */
export function useReveal(delay = 0, threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setTimeout(() => setVisible(true), delay);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay, threshold, reduced]);

  return { ref, visible };
}

/* ─── Hover translate-x ──────────────────────────────────────────────── */
export function useHoverX(px = 2) {
  const [hovered, setHovered] = useState(false);
  const style: React.CSSProperties = {
    transform: hovered ? `translateX(${px}px)` : "translateX(0)",
    transition: "transform 180ms cubic-bezier(.2,.8,.2,1)",
  };
  return {
    style,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };
}

/* ─── Sparkle ngẫu nhiên cho badge "đã đạt" ─────────────────────────── */
export interface Sparkle {
  id: number;
  top: number;
  left: number;
  size: number;
  delay: number;
  hue: number;
}
export function useSparkle(count = 6, intervalMs = 900): Sparkle[] {
  const [items, setItems] = useState<Sparkle[]>([]);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    let id = 0;
    const tick = () => {
      setItems((arr) => {
        const next: Sparkle[] = Array.from({ length: count }, () => ({
          id: ++id,
          top: Math.random() * 100,
          left: Math.random() * 100,
          size: 3 + Math.random() * 5,
          delay: Math.random() * 600,
          hue: 170 + Math.random() * 30,
        }));
        return next;
      });
    };
    tick();
    const t = setInterval(tick, intervalMs);
    return () => clearInterval(t);
  }, [count, intervalMs, reduced]);
  return items;
}

/* ─── Confetti — tạo 36 mảnh với vận tốc ngẫu nhiên ──────────────────── */
export interface ConfettiPiece {
  id: number;
  dx: number;
  dy: number;
  rot: number;
  hue: number;
  delay: number;
  size: number;
  shape: "rect" | "circle" | "tri";
}
export function useConfetti(count = 36): ConfettiPiece[] {
  return useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      dx: (Math.random() - 0.5) * 480,
      dy: 220 + Math.random() * 240,
      rot: (Math.random() - 0.5) * 720,
      hue: [42, 175, 195, 210, 290, 330][i % 6],
      delay: Math.random() * 80,
      size: 6 + Math.random() * 6,
      shape: (["rect", "circle", "tri"] as const)[i % 3],
    }));
  }, [count]);
}
