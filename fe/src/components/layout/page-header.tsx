import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

// One container width for every provider page, so titles and buttons always start and end on the same edges.
export const PAGE_WIDTH = 'mx-auto w-full max-w-6xl px-4 sm:px-6';

export interface Crumb {
  label: string;
  href?: string;
}

function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Đường dẫn" className="flex items-center gap-1.5">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={item.label} className="flex items-center gap-1.5">
            {item.href && !last ? (
              <Link href={item.href} className="transition-colors hover:text-[#2a7bd9]">{item.label}</Link>
            ) : (
              <span className={last ? 'font-medium text-slate-600' : undefined}>{item.label}</span>
            )}
            {!last && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
          </span>
        );
      })}
    </nav>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  breadcrumb?: Crumb[];
  /** Plain line shown in the breadcrumb row, for pages that have no parent page (e.g. the date). */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  /** Skip the container and top padding when the layout around the page already provides them. */
  bare?: boolean;
}

// The breadcrumb row keeps its height even when empty, so the title sits at the same height on every page.
export function PageHeader({ title, subtitle, breadcrumb, eyebrow, actions, bare = false }: PageHeaderProps) {
  const header = (
      <header className={bare ? undefined : 'mb-6'}>
        <div className="mb-3 flex h-5 items-center text-sm text-slate-400">
          {breadcrumb ? <Breadcrumb items={breadcrumb} /> : eyebrow}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2.5">{actions}</div>}
        </div>
      </header>
  );
  if (bare) return header;
  return <div className={`${PAGE_WIDTH} pt-24 sm:pt-28`}>{header}</div>;
}
