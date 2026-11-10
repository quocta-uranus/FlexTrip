'use client';

import { useEffect, useState } from 'react';
import { RotateCcw, Wallet } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { SearchPanel, useExclusiveOpen } from '@/components/ui/search-popup';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';
import type { SearchFilters } from '@/types/listing';
import { fieldTriggerClass, ICON_CIRCLE_CLASS } from './field-styles';
import { LocationAutocomplete } from './location-autocomplete';

const PRICE_PRESETS = [
  { label: 'Dưới 100k', min: undefined, max: 100_000 },
  { label: '100k – 300k', min: 100_000, max: 300_000 },
  { label: '300k – 500k', min: 300_000, max: 500_000 },
  { label: 'Trên 500k', min: 500_000, max: undefined },
] as const;

const SECTION_LABEL = 'mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500';

interface FiltersPanelProps {
  filters: SearchFilters;
  // Every change is applied straight away, so the results always match what the panel shows.
  onChange: (partial: Partial<SearchFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  // 'stack' is the vertical list used inside the mobile sheet; 'bar' is the single row under the search box.
  layout?: 'stack' | 'bar';
}

const priceLabel = (min?: number, max?: number) => {
  const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  if (min != null && max != null) return `${k(min)} – ${k(max)}`;
  if (min != null) return `Từ ${k(min)}`;
  if (max != null) return `Đến ${k(max)}`;
  return 'Khoảng giá';
};

export function FiltersPanel({ filters, onChange, onReset, hasActiveFilters, layout = 'stack' }: FiltersPanelProps) {
  const fields = useExclusiveOpen<'location' | 'date' | 'price'>();

  // The place is typed freely, so it is applied after a short pause instead of on every keystroke.
  const appliedLocation = filters.location ?? '';
  const [location, setLocation] = useState(appliedLocation);
  const [seenLocation, setSeenLocation] = useState(appliedLocation);
  if (appliedLocation !== seenLocation) {
    setSeenLocation(appliedLocation);
    setLocation(appliedLocation);
  }
  const pendingLocation = useDebouncedValue(location, 600);
  useEffect(() => {
    if (pendingLocation !== appliedLocation) onChange({ location: pendingLocation, page: 1 });
    // Only a new typed value should trigger a search; the other values are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLocation]);

  const [minDraft, setMinDraft] = useState(filters.minPrice?.toString() ?? '');
  const [maxDraft, setMaxDraft] = useState(filters.maxPrice?.toString() ?? '');
  const [seenPrice, setSeenPrice] = useState(`${filters.minPrice ?? ''}-${filters.maxPrice ?? ''}`);
  const priceKey = `${filters.minPrice ?? ''}-${filters.maxPrice ?? ''}`;
  if (priceKey !== seenPrice) {
    setSeenPrice(priceKey);
    setMinDraft(filters.minPrice?.toString() ?? '');
    setMaxDraft(filters.maxPrice?.toString() ?? '');
  }

  const commitPrice = () => {
    const min = minDraft === '' ? undefined : Number(minDraft);
    const max = maxDraft === '' ? undefined : Number(maxDraft);
    if (min === filters.minPrice && max === filters.maxPrice) return;
    onChange({ minPrice: min, maxPrice: max, page: 1 });
  };

  const activePreset = PRICE_PRESETS.find((p) => p.min === filters.minPrice && p.max === filters.maxPrice);
  const priceField =
    'flex h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20';
  const priceInput =
    'min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none [appearance:textfield] placeholder:font-medium placeholder:text-slate-300 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

  const priceFields = (
    <div>
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map((preset) => {
            const active = activePreset === preset;
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onChange(
                    active
                      ? { minPrice: undefined, maxPrice: undefined, page: 1 }
                      : { minPrice: preset.min, maxPrice: preset.max, page: 1 },
                  )
                }
                className={cn(
                  'h-9 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold transition-colors active:scale-95',
                  active
                    ? 'border-brand bg-brand text-white shadow-sm shadow-brand/30'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-brand/50 hover:bg-white hover:text-brand-blue',
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {(
            [
              ['Từ', 'Giá thấp nhất', minDraft, setMinDraft],
              ['Đến', 'Giá cao nhất', maxDraft, setMaxDraft],
            ] as const
          ).map(([label, aria, draft, setDraft]) => (
            <label key={label} className={priceField}>
              <span className="text-xs font-semibold text-slate-400">{label}</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="0"
                aria-label={aria}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitPrice}
                onKeyDown={(e) => e.key === 'Enter' && commitPrice()}
                className={priceInput}
              />
              <span className="text-xs font-semibold text-slate-400">₫</span>
            </label>
          ))}
        </div>
    </div>
  );

  if (layout === 'bar') {
    const divider = <span aria-hidden="true" className="hidden h-8 w-px shrink-0 bg-slate-200 md:block" />;
    const priceActive = filters.minPrice != null || filters.maxPrice != null;
    return (
      <div className="flex flex-col gap-1 md:flex-row md:items-center">
        <LocationAutocomplete appearance="hero" className="md:flex-1" value={location} onChange={setLocation} {...fields.bind('location')} />
        {divider}
        <DateRangePicker
          appearance="hero"
          className="md:flex-1"
          from={filters.dateFrom ?? ''}
          to={filters.dateTo ?? ''}
          onChange={({ from, to }) => onChange({ dateFrom: from, dateTo: to, page: 1 })}
          {...fields.bind('date')}
        />
        {divider}
        <div className="min-w-0 md:flex-1">
          <SearchPanel
            {...fields.bind('price')}
            title="Khoảng giá / ngày"
            align="end"
            trigger={
              <button type="button" aria-label="Khoảng giá" className={fieldTriggerClass('hero')}>
                <span className={ICON_CIRCLE_CLASS}>
                  <Wallet className="h-4 w-4" />
                </span>
                <span className={cn('min-w-0 flex-1 truncate text-sm', priceActive ? 'font-semibold text-ink' : 'font-medium text-slate-400')}>
                  {priceLabel(filters.minPrice, filters.maxPrice)}
                </span>
              </button>
            }
          >
            <div className="w-full p-4 sm:w-[320px]">{priceFields}</div>
          </SearchPanel>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink"
          >
            <RotateCcw className="h-4 w-4" /> Xóa lọc
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <span className={SECTION_LABEL}>Địa điểm</span>
        <LocationAutocomplete appearance="field" value={location} onChange={setLocation} {...fields.bind('location')} />
      </div>

      <div>
        <span className={SECTION_LABEL}>Ngày thuê</span>
        <DateRangePicker
          appearance="field"
          from={filters.dateFrom ?? ''}
          to={filters.dateTo ?? ''}
          onChange={({ from, to }) => onChange({ dateFrom: from, dateTo: to, page: 1 })}
          {...fields.bind('date')}
        />
      </div>

      <div>
        <span className={SECTION_LABEL}>Khoảng giá / ngày</span>
        {priceFields}
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition-colors hover:border-brand/50 hover:text-brand-blue"
        >
          <RotateCcw className="h-4 w-4" /> Xóa tất cả bộ lọc
        </button>
      )}
    </div>
  );
}
