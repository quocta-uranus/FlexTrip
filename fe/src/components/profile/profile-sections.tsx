'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Every section of the profile page uses this card, so they share one header and spacing.
export function SectionCard({
  id,
  icon: Icon,
  title,
  desc,
  action,
  tone = 'default',
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  desc?: string;
  action?: ReactNode;
  tone?: 'default' | 'danger';
  children: ReactNode;
}) {
  const danger = tone === 'danger';
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-28 rounded-3xl border bg-white p-6 shadow-soft sm:p-7',
        danger ? 'border-red-200 bg-red-50/40' : 'border-sky-100',
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              danger ? 'bg-red-100 text-red-600' : 'bg-sky-100 text-brand-blue',
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2
              className={cn(
                'font-display text-xl font-medium leading-tight tracking-[-0.02em]',
                danger ? 'text-red-700' : 'text-ink',
              )}
            >
              {title}
            </h2>
            {desc && <p className={cn('mt-0.5 text-xs', danger ? 'text-red-500' : 'text-slate-500')}>{desc}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export interface NavItem {
  id: string;
  label: string;
  danger?: boolean;
}

// Anchor menu for the sections; the one in view is highlighted.
export function SectionNav({ items }: { items: NavItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const nodes = items.map((i) => document.getElementById(i.id)).filter((n): n is HTMLElement => n !== null);
    if (nodes.length === 0 || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-25% 0px -60% 0px' },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="Các phần của hồ sơ"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:sticky lg:top-28 lg:flex-col lg:overflow-visible"
    >
      {items.map((item) => {
        const on = active === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={on ? 'true' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-colors lg:rounded-2xl',
              on ? 'bg-sky-100 text-sky-800' : 'text-slate-600 hover:bg-slate-50 hover:text-ink',
              item.danger && !on && 'text-red-600 hover:bg-red-50 hover:text-red-700',
              item.danger && on && 'bg-red-100 text-red-700',
            )}
          >
            <span
              className={cn('hidden h-2 w-2 rounded-full lg:block', on ? (item.danger ? 'bg-red-500' : 'bg-brand') : 'bg-slate-300')}
            />
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

// "Chrome trên Windows" instead of the raw user agent
export function describeDevice(deviceName?: string | null, userAgent?: string | null) {
  if (deviceName) return deviceName;
  const ua = userAgent ?? '';
  if (!ua) return 'Thiết bị';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Trình duyệt';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /iPhone|iPad/.test(ua)
      ? 'iOS'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : null;
  return os ? `${browser} trên ${os}` : browser;
}
