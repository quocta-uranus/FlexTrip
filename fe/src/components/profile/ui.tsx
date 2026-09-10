import type { ReactNode } from "react";

/**
 * Sub-components tái sử dụng cho 3 trang profile (Traveler / Provider / Admin).
 * Palette:
 *   primary: #2a7bd9  | dark: #1e5aa8  | light: #4a92e8
 *   accent : #92eee8  | dark: #5fd6cd  | light: #c0f5f0
 *   surface: #ffffff  | muted: #f1f5fa | border: #e2e8f3
 */

export const BRAND = {
  primary: "#2a7bd9",
  primaryDark: "#1e5aa8",
  accent: "#92eee8",
  accentDark: "#5fd6cd",
  border: "#e2e8f3",
  surfaceMuted: "#f1f5fa",
  textMuted: "#5a6b85",
  textSubtle: "#8694ad",
} as const;

export function Card({
  title,
  subtitle,
  children,
  className = "",
  accent = false,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${className}`}
      style={{ borderColor: BRAND.border }}
    >
      {accent && (
        <div className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
      )}
      {(title || subtitle) && (
        <div className="mb-5">
          {title && (
            <h3 className="text-base font-semibold text-[var(--foreground)]">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-0.5 text-xs" style={{ color: BRAND.textMuted }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  desc,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div
            className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: BRAND.primary }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: BRAND.accent }} />
            {eyebrow}
          </div>
        )}
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        {desc && (
          <p className="mt-1 text-sm" style={{ color: BRAND.textMuted }}>
            {desc}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Cover({ height = 208 }: { height?: number }) {
  return (
    <section
      className="relative overflow-hidden bg-brand-gradient"
      style={{ height }}
    >
      <div className="absolute inset-0 bg-brand-dots opacity-60" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/25 blur-2xl" />
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#92eee8]/50 blur-3xl" />
    </section>
  );
}

export function ProfileHeader({
  eyebrow,
  identityId,
  roleBadge,
  name,
  subtitle,
  completion,
  avatar,
  actions,
  showCover = false,
}: {
  eyebrow?: string;
  identityId?: string;
  roleBadge?: ReactNode;
  name: string;
  subtitle?: string;
  completion: number;
  avatar: ReactNode;
  actions?: ReactNode;
  showCover?: boolean;
}) {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div
        className="relative overflow-hidden rounded-2xl border bg-white shadow-xl shadow-[#2a7bd9]/5"
        style={{ borderColor: BRAND.border }}
      >
        {/* Cover gradient — chỉ hiện khi showCover=true */}
        {showCover && (
          <div
            className="relative overflow-hidden bg-brand-gradient"
            style={{ height: "5rem" }}
          >
            <div className="absolute inset-0 bg-brand-dots opacity-60" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/25 blur-2xl" />
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#92eee8]/50 blur-3xl" />
          </div>
        )}

        {/* Body: avatar ngang content */}
        <div className="flex flex-col p-6 sm:flex-row sm:items-start sm:p-8">
          {/* Avatar: cùng top với badge */}
          <div className="flex w-full shrink-0 justify-center sm:w-auto sm:justify-start">
            <div className="relative inline-block">
              <div className="absolute -inset-1.5 rounded-[18px] bg-white pointer-events-none" aria-hidden />
              {avatar}
            </div>
          </div>

          {/* Content: flex-1 */}
          <div className="min-w-0 flex-1 pt-4 sm:pt-0 sm:pl-8">
            <div className="flex flex-wrap items-center gap-2">
              {eyebrow && (
                <span
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(42,123,217,0.1)", color: BRAND.primary }}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: BRAND.accent }} />
                  {eyebrow}
                </span>
              )}
              {identityId && (
                <span
                  className="rounded-full px-3 py-0.5 text-xs font-medium"
                  style={{ background: "rgba(146,238,232,0.4)", color: BRAND.primaryDark }}
                >
                  ID {identityId}
                </span>
              )}
              {roleBadge}
            </div>
            <h1 className="mt-2 break-words text-2xl font-bold leading-tight tracking-tight sm:text-4xl">{name}</h1>
            {subtitle && (
              <p className="mt-1 break-words text-sm" style={{ color: BRAND.textMuted }}>
                {subtitle}
              </p>
            )}

            {/* Actions (nút Chỉnh sửa/Lưu/Hủy) */}
            {actions && (
              <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1 max-w-md">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium" style={{ color: BRAND.textMuted }}>
                    Hồ sơ hoàn thiện
                  </span>
                  <span className="font-bold tabular-nums" style={{ color: BRAND.primary }}>
                    {completion}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: BRAND.surfaceMuted }}>
                  <div
                    className="h-full bg-brand-gradient transition-all duration-700"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ border: `2px solid ${BRAND.accent}`, color: BRAND.primary, background: "rgba(146,238,232,0.3)" }}
              >
                {completion}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AvatarField({
  name,
  value,
  onChange,
  disabled,
  size = "md",
}: {
  name: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  const initials =
    name
      .split(" ")
      .map((p) => p[0])
      .slice(-2)
      .join("")
      .toUpperCase() || "?";

  const sz = size === "lg" ? "h-32 w-32 sm:h-36 sm:w-36 text-4xl" : "h-28 w-28 sm:h-32 sm:w-32 text-3xl sm:text-4xl";

  return (
    <div className={`relative ${sz} shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-brand-gradient shadow-lg shadow-[#2a7bd9]/30`}>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-bold text-white">
          {initials}
        </div>
      )}
      {!disabled && onChange && (
        <label className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center justify-center gap-1 bg-black/60 py-1.5 text-[11px] font-semibold text-white backdrop-blur transition-colors hover:bg-black/70">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Đổi
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => onChange(ev.target?.result as string);
                reader.readAsDataURL(file);
              }
            }}
          />
        </label>
      )}
    </div>
  );
}

export function KpiCards({ items }: { items: { label: string; value: string | number; icon: ReactNode; hint?: string; valueNode?: ReactNode }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((k) => (
        <div
          key={k.label}
          className="group rounded-2xl border bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          style={{ borderColor: BRAND.border }}
        >
          <div className="flex items-center justify-between">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm"
              style={{ background: "rgba(146,238,232,0.35)", color: BRAND.primaryDark }}
            >
              {k.icon}
            </div>
            {k.hint && (
              <span className="text-[11px] font-medium" style={{ color: BRAND.textSubtle }}>
                {k.hint}
              </span>
            )}
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight tabular-nums">{k.valueNode ?? k.value}</div>
          <div className="mt-0.5 text-xs" style={{ color: BRAND.textMuted }}>
            {k.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BadgeRow({
  badges,
}: {
  badges: { name: string; level: "locked" | "current" | "done"; desc: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {badges.map((b) => {
        const tone =
          b.level === "done"
            ? { bg: "linear-gradient(135deg,#92eee8,#5fd6cd)", fg: "#0f1729", border: "#5fd6cd" }
            : b.level === "current"
            ? { bg: "rgba(42,123,217,0.1)", fg: BRAND.primary, border: BRAND.primary }
            : { bg: BRAND.surfaceMuted, fg: BRAND.textSubtle, border: BRAND.border };
        return (
          <div
            key={b.name}
            className="rounded-xl border-2 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            style={{ borderColor: tone.border, background: tone.bg }}
          >
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: "white", color: tone.fg }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-sm font-bold" style={{ color: tone.fg }}>
                {b.name}
              </div>
            </div>
            <div className="mt-2 text-xs" style={{ color: tone.fg }}>
              {b.desc}
            </div>
            {b.level === "current" && (
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: tone.fg }}>
                Đang theo đuổi
              </div>
            )}
            {b.level === "done" && (
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: tone.fg }}>
                ✓ Đã đạt
              </div>
            )}
            {b.level === "locked" && (
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: BRAND.textSubtle }}>
                🔒 Chưa mở khóa
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Timeline({
  items,
}: {
  items: { date: string; title: string; subtitle: string; badge?: string }[];
}) {
  return (
    <ol className="relative space-y-4 border-l-2 pl-5" style={{ borderColor: "rgba(146,238,232,0.5)" }}>
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span
            className="absolute -left-[27px] flex h-4 w-4 items-center justify-center rounded-full bg-brand-gradient ring-4 ring-white"
            aria-hidden
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: BRAND.primary }}>
              {it.date}
            </span>
            {it.badge && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: "rgba(42,123,217,0.1)", color: BRAND.primary }}
              >
                {it.badge}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-sm font-semibold">{it.title}</div>
          <div className="text-xs" style={{ color: BRAND.textMuted }}>
            {it.subtitle}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Gallery({
  images,
  total,
}: {
  images: { src: string; caption?: string }[];
  total?: number;
}) {
  const all = total ?? images.length;
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {images.slice(0, 5).map((img, i) => (
          <div
            key={i}
            className="group relative aspect-square overflow-hidden rounded-xl border bg-[var(--surface-muted)]"
            style={{ borderColor: BRAND.border }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.src}
              alt={img.caption ?? ""}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {img.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[11px] font-medium text-white">
                {img.caption}
              </div>
            )}
            {i === 4 && all > 5 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-bold text-white backdrop-blur-sm">
                +{all - 5} ảnh
              </div>
            )}
          </div>
        ))}
      </div>
      {all > 5 && (
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"
          style={{ color: BRAND.primary }}
        >
          Xem tất cả ({all} ảnh)
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function MapPreview({
  label,
  address,
  lat = 16.054,
  lng = 108.202,
}: {
  label: string;
  address: string;
  lat?: number;
  lng?: number;
}) {
  const bbox = `${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div
      className="overflow-hidden rounded-2xl border bg-white shadow-sm"
      style={{ borderColor: BRAND.border }}
    >
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: BRAND.border }}>
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-xs" style={{ color: BRAND.textMuted }}>
            📍 {address}
          </div>
        </div>
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold"
          style={{ color: BRAND.primary }}
        >
          Mở bản đồ
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
      <div className="relative h-56 overflow-hidden">
        <iframe title={label} src={src} className="h-full w-full" loading="lazy" />
      </div>
    </div>
  );
}

export function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium" style={{ color: BRAND.textMuted }}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

export function Input({
  value,
  onChange,
  disabled,
  placeholder,
  type = "text",
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
          style={{ color: BRAND.textSubtle }}
        >
          {icon}
        </div>
      )}
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border bg-white py-2.5 text-sm outline-none transition-all focus:ring-2 ${
          icon ? "pl-9 pr-4" : "px-4"
        } ${
          disabled
            ? "cursor-default bg-[var(--surface-muted)] text-text-muted"
            : "border-[#2a7bd9]/40 bg-[rgba(146,238,232,0.08)] text-[#0f1729] hover:border-[#2a7bd9] hover:shadow-sm focus:border-[#2a7bd9]"
        }`}
        style={{ borderColor: disabled ? BRAND.border : "rgba(42,123,217,0.4)" }}
        onFocus={(e) => (e.currentTarget.style.borderColor = BRAND.primary)}
        onBlur={(e) => (e.currentTarget.style.borderColor = disabled ? BRAND.border : "rgba(42,123,217,0.4)")}
      />
    </div>
  );
}

export function Select({
  value,
  onChange,
  disabled,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full appearance-none rounded-lg border bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 ${
        disabled
          ? "cursor-default bg-[var(--surface-muted)] text-text-muted"
          : "border-[#2a7bd9]/40 bg-[rgba(146,238,232,0.08)] text-[#0f1729] hover:border-[#2a7bd9] focus:border-[#2a7bd9]"
      }`}
      style={{ borderColor: disabled ? BRAND.border : "rgba(42,123,217,0.4)" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function ToggleRow({
  label,
  desc,
  value,
  onChange,
  disabled,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex items-start justify-between gap-4 border-t py-3 first:border-t-0 first:pt-0"
      style={{ borderColor: BRAND.border }}
    >
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs" style={{ color: BRAND.textMuted }}>
          {desc}
        </div>
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-all ${
          disabled ? "cursor-default opacity-70" : "cursor-pointer hover:scale-105 active:scale-95"
        }`}
        style={{ background: value ? BRAND.primary : BRAND.border }}
        aria-pressed={value}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            value ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function VerifyItem({ label, done }: { label: string; done?: boolean }) {
  return (
    <div
      className="flex items-center justify-between border-t py-3 first:border-t-0 first:pt-0"
      style={{ borderColor: BRAND.border }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={
            done
              ? { background: "rgba(146,238,232,0.5)", color: BRAND.primaryDark }
              : { background: BRAND.surfaceMuted, color: BRAND.textSubtle }
          }
        >
          {done ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="text-xs">○</span>
          )}
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <button
        className={`text-xs font-semibold hover:underline`}
        style={{ color: done ? BRAND.textSubtle : BRAND.primary }}
      >
        {done ? "Xem" : "Xác minh ngay →"}
      </button>
    </div>
  );
}

export function SecurityItem({
  icon,
  title,
  desc,
  action,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  action: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-t py-3 first:border-t-0 first:pt-0"
      style={{ borderColor: BRAND.border }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5" style={{ color: BRAND.primary }}>
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs" style={{ color: BRAND.textMuted }}>
            {desc}
          </div>
        </div>
      </div>
      <button
        className="rounded-full border px-3 py-1 text-xs font-semibold transition-all hover:bg-[var(--surface-muted)]"
        style={{ borderColor: BRAND.border, color: BRAND.primary }}
      >
        {action}
      </button>
    </div>
  );
}

export function QuickLink({
  code,
  title,
  href,
}: {
  code: string;
  title: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group flex items-center justify-between rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderColor: BRAND.border, background: BRAND.surfaceMuted }}
    >
      <div>
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: "rgba(42,123,217,0.1)", color: BRAND.primary }}
        >
          {code}
        </span>
        <div className="mt-2 text-sm font-semibold">{title}</div>
      </div>
      <svg
        className="h-4 w-4 transition-all group-hover:translate-x-1"
        style={{ color: BRAND.textSubtle }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </a>
  );
}

export type ProfileRole = "TRAVELER" | "PROVIDER" | "ADMIN" | "BOTH";

export function RoleBadge({ role }: { role: ProfileRole }) {
  const map: Record<ProfileRole, { label: string }> = {
    TRAVELER: { label: "Traveler" },
    PROVIDER: { label: "Provider" },
    ADMIN: { label: "Admin" },
    BOTH: { label: "Traveler · Provider" },
  };
  const m = map[role];
  const style: React.CSSProperties =
    role === "PROVIDER"
      ? { background: BRAND.accent, color: BRAND.primaryDark }
      : role === "ADMIN"
      ? { background: "#0f1729", color: "white" }
      : role === "TRAVELER"
      ? { background: BRAND.primary, color: "white" }
      : { background: "linear-gradient(135deg,#2a7bd9,#92eee8)", color: "white" };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold"
      style={style}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/70" />
      {m.label}
    </span>
  );
}

export function StickyCta({
  primary,
  secondary,
}: {
  primary: { label: string; onClick?: () => void };
  secondary?: { label: string; onClick?: () => void };
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 px-4 py-3 backdrop-blur lg:hidden"
      style={{ borderColor: BRAND.border }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        {secondary && (
          <button
            onClick={secondary.onClick}
            className="flex-1 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all hover:bg-[var(--surface-muted)]"
            style={{ borderColor: BRAND.border, color: BRAND.primary }}
          >
            {secondary.label}
          </button>
        )}
        <button
          onClick={primary.onClick}
          className="flex-[2] rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-95"
          style={{ background: BRAND.primary }}
        >
          {primary.label}
        </button>
      </div>
    </div>
  );
}
