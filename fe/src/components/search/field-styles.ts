import { cn } from '@/lib/utils';

export type FieldAppearance = 'hero' | 'field' | 'chip';

// 'hero' is the borderless field inside the hero search pill; 'field' is a bordered input for filter panels.
export function fieldTriggerClass(appearance: FieldAppearance) {
  return cn(
    'flex w-full min-w-0 items-center gap-2.5 text-left transition-colors outline-none',
    appearance === 'hero' &&
      'rounded-xl px-3 py-1.5 hover:bg-sky-50/60 focus-visible:ring-2 focus-visible:ring-brand/40 md:rounded-full',
    // Same height and shape as a filter chip, for toolbars that sit next to chips
    appearance === 'chip' &&
      'h-10 rounded-full border border-slate-200 bg-white px-4 hover:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/30 data-[popup-open]:border-brand',
    appearance === 'field' &&
      'h-11 rounded-xl border border-slate-200 bg-white px-3 hover:border-brand/60 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 data-[popup-open]:border-brand',
  );
}

export const ICON_CIRCLE_CLASS =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-brand-blue';
