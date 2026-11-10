'use client';

import { Backpack, Store } from 'lucide-react';
import type { AppMode } from '@/lib/app-mode';

const OPTIONS: Array<{ value: AppMode; label: string; icon: typeof Store }> = [
  { value: 'traveler', label: 'Traveler', icon: Backpack },
  { value: 'provider', label: 'Provider', icon: Store },
];

export function ModeSwitcher({ mode, onChange }: { mode: AppMode; onChange: (mode: AppMode) => void }) {
  return (
    <div role="radiogroup" aria-label="Chế độ sử dụng" className="mx-3 my-2 flex rounded-full bg-slate-100 p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => !active && onChange(value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              active ? 'bg-brand text-white shadow-xs' : 'text-slate-600 hover:text-ink'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
