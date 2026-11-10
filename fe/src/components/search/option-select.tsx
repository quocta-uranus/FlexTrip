'use client';

import { useCallback, useRef, useState } from 'react';
import { Select } from '@base-ui/react/select';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Check, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ANIMATION_CLASS,
  BottomSheet,
  HEADER_CLEARANCE,
  OPTION_CLASS,
  POPUP_ATTR,
  revealBelow,
  POPUP_CLASS,
  POSITIONER_CLASS,
  useSheetLayout,
} from '@/components/ui/search-popup';
import { fieldTriggerClass, ICON_CIRCLE_CLASS, type FieldAppearance } from './field-styles';

export interface Option {
  value: string;
  label: string;
}

export interface OptionSelectProps {
  options: readonly Option[];
  // Empty string means "nothing chosen" and shows the placeholder.
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  title: string;
  icon: LucideIcon;
  // An extra first option that clears the choice (for example "Tất cả loại thiết bị").
  clearLabel?: string;
  appearance?: FieldAppearance;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CLEAR = '__clear__';

// One select for every dropdown of the search UI: a listbox popup on desktop, a bottom sheet on phones.
export function OptionSelect({
  options,
  value,
  onChange,
  placeholder,
  title,
  icon: Icon,
  clearLabel,
  appearance = 'hero',
  className,
  open: openProp,
  onOpenChange,
}: OptionSelectProps) {
  const sheet = useSheetLayout();
  const [innerOpen, setInnerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const open = openProp ?? innerOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (next && !sheet) revealBelow(rootRef.current, options.length * 44 + 40);
      if (openProp === undefined) setInnerOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange, sheet, options.length],
  );

  const items = clearLabel ? [{ value: CLEAR, label: clearLabel }, ...options] : [...options];
  const selectedLabel = options.find((o) => o.value === value)?.label;
  const select = (next: string | null) => onChange(next === null || next === CLEAR ? '' : next);

  const content = (
    <>
      {appearance === 'chip' ? (
        <Icon className="h-4 w-4 shrink-0 text-slate-500" />
      ) : (
        <span className={ICON_CIRCLE_CLASS}>
          <Icon className="h-4 w-4" />
        </span>
      )}
      <span className={cn('min-w-0 flex-1 truncate text-sm', selectedLabel ? 'font-semibold text-ink' : 'font-medium text-slate-400')}>
        {selectedLabel ?? placeholder}
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
    </>
  );

  if (sheet) {
    return (
      <div ref={rootRef} className={cn('min-w-0', className)}>
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title={title}
          trigger={
            <button type="button" aria-label={title} className={fieldTriggerClass(appearance)}>
              {content}
            </button>
          }
        >
          <RadioGroup
            aria-label={title}
            value={value}
            onValueChange={(next) => {
              select(next as string);
              setOpen(false);
            }}
            className="flex flex-col gap-1 pb-2"
          >
            {items.map((item) => (
              <Radio.Root
                key={item.value}
                value={item.value}
                className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 text-left text-[15px] font-medium outline-none data-[checked]:bg-sky-50 data-[checked]:font-bold data-[checked]:text-brand-blue"
              >
                {item.label}
                <Radio.Indicator keepMounted={false}>
                  <Check className="h-4 w-4" />
                </Radio.Indicator>
              </Radio.Root>
            ))}
          </RadioGroup>
        </BottomSheet>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn('min-w-0', className)}>
      <Select.Root items={items} value={value || null} onValueChange={select} open={open} onOpenChange={setOpen}>
        <Select.Trigger aria-label={title} className={fieldTriggerClass(appearance)}>
          {content}
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            side="bottom"
            align="start"
            sideOffset={10}
            alignItemWithTrigger={false}
            collisionPadding={{ top: HEADER_CLEARANCE, right: 12, bottom: 12, left: 12 }}
            collisionAvoidance={{ side: 'none', align: 'shift' }}
            className={POSITIONER_CLASS}
            {...POPUP_ATTR}
          >
            <Select.Popup className={cn(POPUP_CLASS, ANIMATION_CLASS, 'min-w-[var(--anchor-width)] max-w-[min(360px,calc(100vw-24px))] p-1.5')}>
              <Select.List className="max-h-[min(320px,var(--available-height))] overflow-y-auto">
                {items.map((item) => (
                  <Select.Item key={item.value} value={item.value} className={OPTION_CLASS}>
                    <Select.ItemText className="flex-1">{item.label}</Select.ItemText>
                    <Select.ItemIndicator>
                      <Check className="h-4 w-4" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
