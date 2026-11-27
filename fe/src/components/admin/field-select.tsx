'use client';

import type { ReactNode } from 'react';
import { Select } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FieldOption {
  value: string;
  label: string;
  /** Muted second line in the list (and next to the label once selected). */
  description?: string;
  /** Small element before the label, such as an avatar. */
  leading?: ReactNode;
}

interface FieldSelectProps {
  id?: string;
  value: string;
  options: readonly FieldOption[];
  placeholder: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}

// Form-field flavour of the admin dropdown: same look as the inputs next to it, and a styled list.
// The popup sits above the dialogs (z-200) these fields live in.
export function FieldSelect({ id, value, options, placeholder, onChange, invalid, disabled }: FieldSelectProps) {
  const selected = options.find((o) => o.value === value);

  return (
    <Select.Root value={value || null} disabled={disabled} onValueChange={(next) => onChange((next as string | null) ?? '')}>
      <Select.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-11 w-full items-center gap-2.5 rounded-xl border bg-[#f8fafc] px-3.5 text-left text-sm outline-none transition focus-visible:border-[#2a7bd9] focus-visible:ring-2 focus-visible:ring-[#2a7bd9]/15 disabled:bg-slate-100 disabled:opacity-60 data-[popup-open]:border-[#2a7bd9] data-[popup-open]:ring-2 data-[popup-open]:ring-[#2a7bd9]/15',
          invalid ? 'border-red-300' : 'border-slate-200 hover:border-slate-300',
        )}
      >
        {selected?.leading}
        <span className={cn('min-w-0 flex-1 truncate', selected ? 'font-medium text-slate-900' : 'text-slate-400')}>
          {selected ? selected.label : placeholder}
          {selected?.description && <span className="ml-1.5 text-xs font-normal text-[#8694ad]">{selected.description}</span>}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#8694ad]" />
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner side="bottom" align="start" sideOffset={6} alignItemWithTrigger={false} className="z-[300]">
          <Select.Popup className="w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded-2xl border border-[#e2e8f3] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,41,0.18)] outline-none transition duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
            <Select.List className="max-h-64 overflow-y-auto">
              {options.length === 0 && <p className="px-3 py-4 text-center text-xs text-[#8694ad]">Chưa có lựa chọn nào.</p>}
              {options.map((o) => (
                <Select.Item
                  key={o.value}
                  value={o.value}
                  className="flex w-full cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 py-2 text-left outline-none data-[highlighted]:bg-[#f1f6fd]"
                >
                  {o.leading}
                  <span className="min-w-0 flex-1">
                    <Select.ItemText className="block truncate text-[13px] font-semibold text-[#0f1729]">{o.label}</Select.ItemText>
                    {o.description && <span className="block truncate text-[11px] text-[#8694ad]">{o.description}</span>}
                  </span>
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
