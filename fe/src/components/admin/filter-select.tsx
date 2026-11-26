'use client';

import { Select } from '@base-ui/react/select';
import { Check, ChevronDown, ListFilter } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  /** Tailwind background class for a small coloured dot, to tie the option to a status badge. */
  dotClass?: string;
}

interface FilterSelectProps<T extends string> {
  value: T;
  options: readonly FilterOption<T>[];
  onChange: (value: T) => void;
  /** The option that means "no filter"; the trigger turns blue once another option is picked. */
  defaultValue: T;
  ariaLabel: string;
  className?: string;
}

// The browser's own <select> popup cannot be styled, so admin filters use this one for a consistent look.
export function FilterSelect<T extends string>({ value, options, onChange, defaultValue, ariaLabel, className }: FilterSelectProps<T>) {
  const selected = options.find((o) => o.value === value);
  const active = value !== defaultValue;

  return (
    <Select.Root value={value} onValueChange={(next) => { if (next !== null) onChange(next as T); }}>
      <Select.Trigger
        aria-label={ariaLabel}
        className={cn(
          'flex h-9 min-w-44 items-center gap-2 rounded-xl border px-3 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[#2a7bd9]/15',
          active
            ? 'border-[#2a7bd9]/40 bg-[#2a7bd9]/[0.06] font-semibold text-[#1e5aa8]'
            : 'border-[#e2e8f3] bg-white text-[#0f1729] hover:bg-[#f8fafc]',
          className,
        )}
      >
        {selected?.dotClass ? (
          <span className={cn('h-2 w-2 shrink-0 rounded-full', selected.dotClass)} />
        ) : (
          <ListFilter className={cn('h-4 w-4 shrink-0', active ? 'text-[#2a7bd9]' : 'text-[#8694ad]')} />
        )}
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? ''}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#8694ad]" />
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner side="bottom" align="start" sideOffset={6} alignItemWithTrigger={false} className="z-[80]">
          <Select.Popup className="min-w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded-2xl border border-[#e2e8f3] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,41,0.16)] outline-none transition duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
            <Select.List className="max-h-72 overflow-y-auto">
              {options.map((o) => (
                <Select.Item
                  key={o.value}
                  value={o.value}
                  className="flex w-full cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-[#0f1729] outline-none data-[highlighted]:bg-[#f1f6fd] data-[selected]:font-semibold data-[selected]:text-[#1e5aa8]"
                >
                  {o.dotClass && <span className={cn('h-2 w-2 shrink-0 rounded-full', o.dotClass)} />}
                  <Select.ItemText className="flex-1 whitespace-nowrap">{o.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check className="h-4 w-4 text-[#2a7bd9]" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
