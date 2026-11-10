'use client';

import Link from 'next/link';
import { ArrowRight, Store } from 'lucide-react';
import { useProviderEntry } from '@/hooks/useProviderApplication';

// Lightly highlighted so it is easy to find without turning the dropdown into a promo.
export function ProviderMenuItem({ onNavigate }: { onNavigate: () => void }) {
  const { entry, canApply } = useProviderEntry();
  if (!canApply) return null;

  return (
    <Link
      href={entry.href}
      onClick={onNavigate}
      className="mx-2 my-1 flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 transition-colors hover:border-brand/40 hover:bg-sky-100"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand-blue">
        <Store className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{entry.label}</span>
        <span className="block truncate text-xs text-slate-500">{entry.hint}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-brand-blue" />
    </Link>
  );
}
