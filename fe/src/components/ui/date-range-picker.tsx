'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { revealBelow, SearchPanel, useSheetLayout } from '@/components/ui/search-popup';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
const short = (iso: string) => {
  const d = fromIso(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};
// Khớp booking.service: ngày nhận và ngày trả đều tính, nên cùng một ngày là 1 ngày.
const countDays = (from: string, to: string) =>
  Math.round((fromIso(to).getTime() - fromIso(from).getTime()) / DAY_MS) + 1;

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  className?: string;
  // 'hero' is the borderless field of the hero search bar; 'field' is a bordered input for filter panels.
  appearance?: 'hero' | 'field';
  // Optional control so a search bar can keep a single dropdown open at a time.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  className,
  appearance = 'hero',
  open: openProp,
  onOpenChange,
}: DateRangePickerProps) {
  const today = useMemo(() => startOfToday(), []);
  const todayIso = toIso(today);
  const contentRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sheet = useSheetLayout();
  const [innerOpen, setInnerOpen] = useState(false);
  const open = openProp ?? innerOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (next && !sheet) revealBelow(rootRef.current, 500);
      if (openProp === undefined) setInnerOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange, sheet],
  );
  const [view, setView] = useState(() => {
    const base = from ? fromIso(from) : today;
    return { y: base.getFullYear(), m: base.getMonth() };
  });
  const [hover, setHover] = useState<string | null>(null);
  const [focusIso, setFocusIso] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setHover(null);
  }, [setOpen]);

  const picking = Boolean(from) && !to;

  const pick = (iso: string) => {
    if (!from || to) {
      onChange({ from: iso, to: '' });
    } else {
      const [lo, hi] = iso < from ? [iso, from] : [from, iso];
      onChange({ from: lo, to: hi });
    }
    setHover(null);
    setFocusIso(iso);
  };

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, i) => {
      const day = i - offset + 1;
      return day >= 1 && day <= daysInMonth ? toIso(new Date(view.y, view.m, day)) : null;
    });
  }, [view]);

  const previewEnd = picking && hover ? hover : to;
  const lo = from && previewEnd ? (previewEnd < from ? previewEnd : from) : from;
  const hi = from && previewEnd ? (previewEnd < from ? from : previewEnd) : '';

  const shiftMonth = (step: number) => {
    const d = new Date(view.y, view.m + step, 1);
    if (d < new Date(today.getFullYear(), today.getMonth(), 1)) return;
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const onKeyDown = (e: React.KeyboardEvent, iso: string) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const d = fromIso(iso);
    d.setDate(d.getDate() + step);
    if (d < today) return;
    const next = toIso(d);
    setFocusIso(next);
    if (picking) setHover(next);
    if (d.getMonth() !== view.m || d.getFullYear() !== view.y) {
      setView({ y: d.getFullYear(), m: d.getMonth() });
    }
  };

  useEffect(() => {
    if (!open || !focusIso) return;
    contentRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${focusIso}"]`)?.focus();
  }, [focusIso, view, open]);

  const triggerValue = from
    ? to
      ? `${short(from)} – ${short(to)}`
      : `${short(from)} – chọn ngày trả`
    : 'Ngày thuê';
  const days = from && to ? countDays(from, to) : 0;

  const trigger = (
    <button
      type="button"
      aria-label="Chọn ngày thuê"
      className={cn(
        'flex w-full items-center gap-2.5 text-left transition-colors',
        appearance === 'hero'
          ? 'rounded-xl px-3 py-1.5 hover:bg-sky-50/60 md:rounded-full'
          : 'h-11 rounded-xl border border-slate-200 bg-white px-3 hover:border-brand/60 data-[popup-open]:border-brand',
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-brand-blue">
        <Calendar className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className={cn('truncate', !from && 'font-medium text-slate-400')}>{triggerValue}</span>
          {days > 0 && appearance === 'hero' && (
            <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
              {days} ngày
            </span>
          )}
        </span>
      </span>
    </button>
  );

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <SearchPanel
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
        title="Chọn ngày thuê"
        trigger={trigger}
        align="end"
        initialFocus={() => contentRef.current?.querySelector<HTMLElement>('[data-iso][tabindex="0"]') ?? true}
      >
        <div ref={contentRef} className="w-full p-4 sm:w-[340px]">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className={cn('rounded-2xl bg-sky-50 px-3.5 py-2.5 ring-2', !picking ? 'ring-brand' : 'ring-transparent')}>
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Ngày nhận</span>
              <b className={cn('text-[15px] tabular-nums', !from && 'font-semibold text-slate-400')}>
                {from ? short(from) : 'Chọn ngày'}
              </b>
            </div>
            <div className={cn('rounded-2xl bg-sky-50 px-3.5 py-2.5 ring-2', picking ? 'ring-brand' : 'ring-transparent')}>
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Ngày trả</span>
              <b className={cn('text-[15px] tabular-nums', !to && 'font-semibold text-slate-400')}>
                {to ? short(to) : 'Chọn ngày'}
              </b>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-base font-bold tracking-tight">
              Tháng {view.m + 1}, {view.y}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Tháng trước"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 transition hover:bg-sky-100 active:scale-90"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Tháng sau"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 transition hover:bg-sky-100 active:scale-90"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-xs font-bold text-slate-400" aria-hidden="true">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          <div role="grid" className="grid grid-cols-7 gap-y-0.5" onPointerLeave={() => setHover(null)}>
            {cells.map((iso, i) => {
              if (!iso) return <div key={`e-${i}`} role="gridcell" className="h-10" />;
              const past = iso < todayIso;
              const isStart = iso === lo;
              const isEnd = iso === hi;
              const inRange = Boolean(lo && hi && iso >= lo && iso <= hi);
              const col = i % 7;
              const edge = isStart || isEnd;
              return (
                <div key={iso} role="gridcell" className="relative flex h-10 items-center justify-center">
                  {inRange && lo !== hi && (
                    <span
                      className={cn(
                        'absolute inset-y-1 bg-sky-100',
                        isStart ? 'left-1/2 right-0' : isEnd ? 'left-0 right-1/2' : 'inset-x-0',
                        col === 0 && !isStart && 'rounded-l-xl',
                        col === 6 && !isEnd && 'rounded-r-xl',
                      )}
                    />
                  )}
                  <button
                    type="button"
                    disabled={past}
                    data-iso={iso}
                    tabIndex={iso === (focusIso ?? from ?? todayIso) ? 0 : -1}
                    aria-label={`${fromIso(iso).getDate()}/${fromIso(iso).getMonth() + 1}/${fromIso(iso).getFullYear()}`}
                    aria-pressed={edge}
                    onClick={() => pick(iso)}
                    onPointerEnter={() => picking && !past && setHover(iso)}
                    onKeyDown={(e) => onKeyDown(e, iso)}
                    className={cn(
                      'relative h-9 w-9 rounded-full text-sm font-semibold tabular-nums transition',
                      edge
                        ? 'bg-brand text-white shadow-md shadow-brand/40'
                        : 'text-ink hover:bg-sky-100',
                      past && 'cursor-not-allowed text-slate-300 opacity-60 hover:bg-transparent',
                    )}
                  >
                    {fromIso(iso).getDate()}
                    {iso === todayIso && (
                      <span
                        className={cn(
                          'absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full',
                          edge ? 'bg-white' : 'bg-brand',
                        )}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-sky-100 pt-3">
            <span className="text-[13px] font-medium text-slate-500" aria-live="polite">
              {from && to ? (
                <>
                  <b className="text-ink">{days} ngày</b> · {short(from)} – {short(to)}
                </>
              ) : from ? (
                'Chọn ngày trả'
              ) : (
                'Chọn ngày nhận'
              )}
            </span>
            <div className="flex items-center gap-2">
              {from && (
                <button
                  type="button"
                  onClick={() => onChange({ from: '', to: '' })}
                  className="text-[13px] font-semibold text-brand-blue hover:underline"
                >
                  Xoá
                </button>
              )}
              <button
                type="button"
                onClick={close}
                className="h-9 rounded-full bg-brand px-4 text-[13px] font-bold text-white transition hover:bg-sky-700 active:scale-95"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      </SearchPanel>
    </div>
  );
}
