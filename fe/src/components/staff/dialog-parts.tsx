import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Shared pieces so every dialog in the staff area looks and spaces the same.

export type DialogTone = 'emerald' | 'blue' | 'amber' | 'red';

const TONE: Record<DialogTone, { band: string; icon: string }> = {
  emerald: { band: 'from-emerald-500/10', icon: 'bg-emerald-600 shadow-emerald-600/30' },
  blue: { band: 'from-blue-500/10', icon: 'bg-blue-600 shadow-blue-600/30' },
  amber: { band: 'from-amber-500/12', icon: 'bg-amber-500 shadow-amber-500/35' },
  red: { band: 'from-red-500/10', icon: 'bg-red-600 shadow-red-600/30' },
};

/** Classes for the dialog itself: no padding, so the band, body and footer can run edge to edge. */
export const DIALOG_CLASS = 'grid max-h-[92vh] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-xl';

/** One look for every text field in these dialogs. */
export const FIELD_CLASS =
  'w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2a7bd9] focus:ring-[3px] focus:ring-[#2a7bd9]/15';

export function DialogBand({ tone, icon, title, description }: { tone: DialogTone; icon: ReactNode; title: ReactNode; description?: ReactNode }) {
  return (
    <div className={cn('flex items-start gap-3.5 bg-gradient-to-b to-transparent px-6 pb-4 pt-5', TONE[tone].band)}>
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white shadow-md', TONE[tone].icon)}>
        {icon}
      </span>
      <div className="min-w-0 pr-7">
        <h2 className="text-[17px] font-semibold leading-snug text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{description}</p>}
      </div>
    </div>
  );
}

export function OrderStrip({ title, caption }: { title: string; caption?: string }) {
  return (
    <div className="rounded-[13px] border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
      <p className="truncate text-sm font-semibold text-slate-800">{title}</p>
      {caption && <p className="mt-0.5 text-xs text-slate-500">{caption}</p>}
    </div>
  );
}

export function FormSection({ step, title, badge, aside, children }: {
  step: number;
  title: string;
  badge?: 'required' | 'optional';
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
          {step}
        </span>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {badge === 'required' && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10.5px] font-medium text-red-700">Bắt buộc</span>}
        {badge === 'optional' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] text-slate-500">Không bắt buộc</span>}
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

/** Light footer: a hint on the left (why the main button is disabled), the buttons on the right. */
export function DialogFooterBar({ hint, children }: { hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/80 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-slate-500">{hint}</span>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">{children}</div>
    </div>
  );
}
