'use client';

import { useCallback, useRef, useState } from 'react';
import { Autocomplete } from '@base-ui/react/autocomplete';
import { MapPin, X } from 'lucide-react';
import { useLocationSuggestions } from '@/hooks/useLocationSuggestions';
import { cn } from '@/lib/utils';
import { foldText } from '@/lib/fold-text';
import {
  ANIMATION_CLASS,
  BottomSheet,
  HEADER_CLEARANCE,
  OPTION_CLASS,
  POPUP_ATTR,
  POPUP_CLASS,
  revealBelow,
  POSITIONER_CLASS,
  useSheetLayout,
} from '@/components/ui/search-popup';
import { fieldTriggerClass, ICON_CIRCLE_CLASS, type FieldAppearance } from './field-styles';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  appearance?: FieldAppearance;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-3 text-sm text-slate-500">{children}</p>;
}

export function LocationAutocomplete({
  value,
  onChange,
  appearance = 'hero',
  className,
  open: openProp,
  onOpenChange,
}: LocationAutocompleteProps) {
  const sheet = useSheetLayout();
  const { suggestions, isLoading, isError } = useLocationSuggestions();
  const [innerOpen, setInnerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const open = openProp ?? innerOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (next && !sheet) revealBelow(rootRef.current, 280);
      if (openProp === undefined) setInnerOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange, sheet],
  );

  // Free text is always allowed; the list only suggests places that exist in real listings.
  const list = (
    <>
      {isLoading && <Hint>Đang tải gợi ý…</Hint>}
      {isError && <Hint>Không tải được gợi ý. Bạn vẫn có thể nhập địa điểm.</Hint>}
      {!isLoading && !isError && suggestions.length === 0 && <Hint>Chưa có địa điểm gợi ý. Bạn vẫn có thể nhập địa điểm.</Hint>}
      {!isLoading && !isError && suggestions.length > 0 && (
        <Autocomplete.Empty className="px-3 py-3 text-sm text-slate-500 empty:hidden">
          Không có gợi ý khớp. Bạn vẫn có thể dùng chữ vừa nhập.
        </Autocomplete.Empty>
      )}
      <Autocomplete.List className="max-h-[min(300px,var(--available-height,300px))] overflow-y-auto">
        {(item: string) => (
          <Autocomplete.Item key={item} value={item} className={OPTION_CLASS}>
            <MapPin className="h-4 w-4 shrink-0 text-brand-blue" />
            <span className="min-w-0 flex-1 truncate">{item}</span>
          </Autocomplete.Item>
        )}
      </Autocomplete.List>
    </>
  );

  const matches = suggestions.filter((item) => foldText(item).includes(foldText(value)));

  if (sheet) {
    return (
      <div ref={rootRef} className={cn('min-w-0', className)}>
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title="Địa điểm"
          trigger={
            <button type="button" aria-label="Địa điểm" className={fieldTriggerClass(appearance)}>
              <span className={ICON_CIRCLE_CLASS}>
                <MapPin className="h-4 w-4" />
              </span>
              <span className={cn('min-w-0 flex-1 truncate text-sm', value ? 'font-semibold text-ink' : 'font-medium text-slate-400')}>
                {value || 'Địa điểm'}
              </span>
            </button>
          }
        >
          {/* Plain buttons: item presses of the inline Autocomplete list are not delivered inside a nested sheet. */}
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nhập địa điểm"
            aria-label="Địa điểm"
            className="mb-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] font-medium text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          {isLoading && <Hint>Đang tải gợi ý…</Hint>}
          {isError && <Hint>Không tải được gợi ý. Bạn vẫn có thể nhập địa điểm.</Hint>}
          {!isLoading && !isError && suggestions.length === 0 && <Hint>Chưa có địa điểm gợi ý. Bạn vẫn có thể nhập địa điểm.</Hint>}
          {!isLoading && !isError && suggestions.length > 0 && matches.length === 0 && (
            <Hint>Không có gợi ý khớp. Bạn vẫn có thể dùng chữ vừa nhập.</Hint>
          )}
          <ul className="max-h-[40dvh] overflow-y-auto">
            {matches.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium hover:bg-sky-50"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-brand-blue" />
                  <span className="min-w-0 flex-1 truncate">{item}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 h-12 w-full rounded-full bg-brand text-sm font-bold text-white transition hover:bg-sky-700"
          >
            Áp dụng
          </button>
        </BottomSheet>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn('min-w-0', className)}>
      <Autocomplete.Root
        items={suggestions}
        value={value}
        onValueChange={(next) => onChange(next)}
        open={open}
        onOpenChange={setOpen}
        openOnInputClick
      >
        <Autocomplete.InputGroup className={cn(fieldTriggerClass(appearance), 'cursor-text')}>
          <span className={ICON_CIRCLE_CLASS}>
            <MapPin className="h-4 w-4" />
          </span>
          <Autocomplete.Input
            placeholder="Địa điểm"
            aria-label="Địa điểm"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-medium placeholder:text-slate-400"
          />
          {value && (
            <Autocomplete.Clear
              aria-label="Xóa địa điểm"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </Autocomplete.Clear>
          )}
        </Autocomplete.InputGroup>
        <Autocomplete.Portal>
          <Autocomplete.Positioner
            side="bottom"
            align="start"
            sideOffset={10}
            collisionPadding={{ top: HEADER_CLEARANCE, right: 12, bottom: 12, left: 12 }}
            collisionAvoidance={{ side: 'none', align: 'shift' }}
            className={POSITIONER_CLASS}
            {...POPUP_ATTR}
          >
            <Autocomplete.Popup className={cn(POPUP_CLASS, ANIMATION_CLASS, 'w-[var(--anchor-width)] min-w-[240px] max-w-[min(360px,calc(100vw-24px))] p-1.5')}>
              {list}
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>
    </div>
  );
}
