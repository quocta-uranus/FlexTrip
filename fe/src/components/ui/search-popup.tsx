'use client';

import { useCallback, useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Drawer } from '@base-ui/react/drawer';
import { useMediaQuery } from '@base-ui/react/unstable-use-media-query';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// The floating header is 64px tall and sits 16px from the top; popups keep clear of it.
export const HEADER_CLEARANCE = 92;

export const POPUP_CLASS =
  'rounded-2xl border border-sky-100 bg-white text-ink shadow-[0_24px_60px_rgba(10,37,51,0.22)] outline-none';
export const POSITIONER_CLASS = 'z-[70]';
// Marks the portaled popups so a surrounding panel can tell a click inside them from a click outside.
export const POPUP_ATTR = { 'data-search-popup': '' } as const;
export const ANIMATION_CLASS =
  'origin-[var(--transform-origin)] transition duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0';
export const OPTION_CLASS =
  'flex w-full cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium outline-none data-[highlighted]:bg-sky-50 data-[selected]:font-bold data-[selected]:text-brand-blue';

// Dropdowns always open below their field. When the page leaves too little room under it, scroll the field
// up first (never past the header) instead of flipping the popup above where it would be hidden.
export function revealBelow(anchor: Element | null, neededHeight: number) {
  if (!anchor || typeof window === 'undefined') return;
  const rect = anchor.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - 24;
  if (spaceBelow >= neededHeight) return;
  const maxScrollUp = rect.top - (HEADER_CLEARANCE + 12);
  const delta = Math.min(neededHeight - spaceBelow, maxScrollUp);
  if (delta > 0) window.scrollBy({ top: delta, behavior: 'smooth' });
}

// Phones get a bottom sheet instead of a floating popup.
export function useSheetLayout() {
  return useMediaQuery('(max-width: 767px)', { defaultMatches: false });
}

// Only one dropdown of a search bar is open at a time.
export function useExclusiveOpen<T extends string>() {
  const [openField, setOpenField] = useState<T | null>(null);
  const bind = useCallback(
    (field: T) => ({
      open: openField === field,
      onOpenChange: (open: boolean) => setOpenField((current) => (open ? field : current === field ? null : current)),
    }),
    [openField],
  );
  return { openField, bind, closeAll: () => setOpenField(null) };
}

interface SheetProps {
  initialFocus?: React.ComponentProps<typeof Drawer.Popup>['initialFocus'];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  trigger: React.ReactElement;
  children: React.ReactNode;
}

export function BottomSheet({ open, onOpenChange, title, trigger, children, initialFocus }: SheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={(next) => onOpenChange(next)} swipeDirection="down">
      <Drawer.Trigger render={trigger} />
      <Drawer.Portal>
        <Drawer.Backdrop
          className="fixed inset-0 z-[80] bg-ink/40 transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
          {...POPUP_ATTR}
        />
        <Drawer.Viewport className="fixed inset-0 z-[80] flex items-end" {...POPUP_ATTR}>
          <Drawer.Popup
            initialFocus={initialFocus}
            className="flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-white text-ink shadow-[0_-12px_40px_rgba(10,37,51,0.25)] outline-none transition-transform duration-200 data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full"
          >
            <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-200" aria-hidden="true" />
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <Drawer.Title className="text-lg font-extrabold tracking-tight">{title}</Drawer.Title>
              <Drawer.Close
                aria-label="Đóng"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-slate-600 transition hover:bg-sky-100"
              >
                <X className="h-4 w-4" />
              </Drawer.Close>
            </div>
            {/* Drawer.Content keeps taps and scrolling inside the sheet from being read as a swipe-to-dismiss. */}
            <Drawer.Content className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

type InitialFocus = React.ComponentProps<typeof Popover.Popup>['initialFocus'];

interface PanelProps extends SheetProps {
  align?: 'start' | 'center' | 'end';
  className?: string;
  initialFocus?: InitialFocus;
}

// A popover on larger screens and a bottom sheet on phones, sharing one content.
export function SearchPanel({ open, onOpenChange, title, trigger, children, align = 'start', className, initialFocus }: PanelProps) {
  const sheet = useSheetLayout();
  if (sheet) {
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange} title={title} trigger={trigger} initialFocus={initialFocus}>
        {children}
      </BottomSheet>
    );
  }
  return (
    <Popover.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Popover.Trigger render={trigger} />
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align={align}
          sideOffset={10}
          collisionPadding={{ top: HEADER_CLEARANCE, right: 12, bottom: 12, left: 12 }}
          collisionAvoidance={{ side: 'none', align: 'shift' }}
          className={POSITIONER_CLASS}
          {...POPUP_ATTR}
        >
          <Popover.Popup
            aria-label={title}
            initialFocus={initialFocus}
            className={cn(POPUP_CLASS, ANIMATION_CLASS, 'max-h-[var(--available-height)] overflow-y-auto', className)}
          >
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
