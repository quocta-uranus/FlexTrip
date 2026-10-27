'use client';

import { useMemo, useState } from 'react';
import { Check, LayoutGrid, LayoutList, Search } from 'lucide-react';
import { LISTING_CATEGORIES, type ListingCategory } from '@/constants/categories';
import { SearchPanel } from '@/components/ui/search-popup';
import { foldText } from '@/lib/fold-text';
import { cn } from '@/lib/utils';

// Only the first categories get a chip of their own; the rest live in the all-categories panel, so the row
// stays one line however many categories are added.
const QUICK_COUNT = 7;

type Value = ListingCategory | '';

interface CategoryBarProps {
  value: Value;
  onChange: (value: Value) => void;
}

function chipClass(active: boolean) {
  return cn(
    'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
    active
      ? 'border-ink bg-ink text-white shadow-md'
      : 'border-sky-100 bg-white text-slate-700 hover:border-brand/50 hover:text-brand-blue',
  );
}

export function CategoryBar({ value, onChange }: CategoryBarProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');

  const quick = LISTING_CATEGORIES.slice(0, QUICK_COUNT);
  // A category picked from the panel that has no chip yet still shows as the active one.
  const picked = value ? LISTING_CATEGORIES.find((c) => c.value === value) : undefined;
  const extra = picked && !quick.includes(picked) ? picked : undefined;

  const groups = useMemo(() => {
    const needle = foldText(term.trim());
    const byGroup = new Map<string, typeof LISTING_CATEGORIES>();
    for (const category of LISTING_CATEGORIES) {
      if (needle && !foldText(`${category.label} ${category.description}`).includes(needle)) continue;
      byGroup.set(category.group, [...(byGroup.get(category.group) ?? []), category]);
    }
    return [...byGroup.entries()];
  }, [term]);

  const choose = (next: Value) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      {[{ value: '' as const, label: 'Tất cả', Icon: LayoutGrid }, ...quick, ...(extra ? [extra] : [])].map(
        ({ value: v, label, Icon }) => (
          <button
            key={v || 'all'}
            id={`category-filter-${v || 'all'}`}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={chipClass(value === v)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ),
      )}

      <SearchPanel
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setTerm('');
        }}
        title="Tất cả danh mục"
        align="end"
        trigger={
          <button
            type="button"
            id="category-filter-panel"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-brand/40 bg-sky-50 px-4 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
          >
            <LayoutList className="h-4 w-4" />
            Xem thêm
          </button>
        }
      >
        <div className="w-full p-4 sm:w-[min(640px,calc(100vw-24px))]">
          <label className="mb-3 flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Tìm danh mục, ví dụ “lều”"
              aria-label="Tìm danh mục"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-slate-400"
            />
          </label>

          {groups.length === 0 && <p className="px-1 py-6 text-center text-sm text-slate-500">Không có danh mục nào khớp.</p>}

          <div className="max-h-[min(60vh,420px)] space-y-4 overflow-y-auto pr-1">
            {groups.map(([group, items]) => (
              <section key={group}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{group}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map(({ value: v, label, description, Icon }) => {
                    const active = value === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={active}
                        onClick={() => choose(active ? '' : v)}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
                          active ? 'border-brand bg-sky-50' : 'border-slate-200 bg-white hover:border-brand/50',
                        )}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-brand-blue">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{label}</span>
                          <span className="block truncate text-xs text-slate-500">{description}</span>
                        </span>
                        {active && <Check className="h-4 w-4 shrink-0 text-brand-blue" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </SearchPanel>
    </div>
  );
}
