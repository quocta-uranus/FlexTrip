'use client';

import { Select } from '@base-ui/react/select';
import { Check, ChevronDown, User, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminStaff } from '@/types/admin';

const NONE = '__none__';

// First letter of the last word that is a name, so "Demo Staff 2" shows "S" and not the trailing "2".
export function staffInitial(name: string) {
  const words = name.trim().split(/\s+/).filter((w) => /^\p{L}/u.test(w));
  return (words[words.length - 1] ?? name).charAt(0).toUpperCase() || '?';
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700',
        size === 'md' ? 'h-7 w-7 text-[11px]' : 'h-6 w-6 text-[10px]',
      )}
    >
      {staffInitial(name)}
    </span>
  );
}

interface StaffPickerProps {
  /** Staff currently on the booking. Kept apart from `staff` because a deactivated person can still be assigned. */
  current: { id: string; name: string; employeeCode: string | null } | null;
  staff: AdminStaff[];
  disabled?: boolean;
  onChange: (staffId: string | null) => void;
}

// A native <select> cannot show who is who, so the admin gets a list with initials, code, region and workload.
export function StaffPicker({ current, staff, disabled, onChange }: StaffPickerProps) {
  const unassigned = !current;
  return (
    <Select.Root
      value={current?.id ?? NONE}
      disabled={disabled}
      onValueChange={(next) => onChange(next === null || next === NONE ? null : (next as string))}
    >
      <Select.Trigger
        aria-label="Nhân viên phụ trách"
        className={cn(
          'flex h-9 w-56 items-center gap-2 rounded-xl border px-2 text-left text-xs outline-none transition focus-visible:border-[#2a7bd9] focus-visible:ring-2 focus-visible:ring-[#2a7bd9]/15 disabled:opacity-50',
          unassigned
            ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100/60'
            : 'border-[#e2e8f3] bg-white text-[#0f1729] hover:bg-[#f8fafc]',
        )}
      >
        {unassigned ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-amber-400 bg-white text-amber-500">
            <User className="h-3.5 w-3.5" />
          </span>
        ) : (
          <Avatar name={current.name} size="sm" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-semibold leading-tight">{current ? current.name : 'Chưa phân công'}</span>
          <span className={cn('block truncate text-[10.5px] leading-tight', unassigned ? 'text-amber-600' : 'text-[#8694ad]')}>
            {current ? current.employeeCode ?? 'Nhân viên' : 'Bấm để chọn nhân viên'}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#8694ad]" />
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner side="bottom" align="start" sideOffset={6} alignItemWithTrigger={false} className="z-[80]">
          <Select.Popup className="w-72 origin-[var(--transform-origin)] rounded-2xl border border-[#e2e8f3] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,41,0.16)] outline-none transition duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0">
            <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8694ad]">Chọn nhân viên</p>
            <Select.List className="max-h-64 overflow-y-auto">
              {staff.length === 0 && <p className="px-3 py-4 text-center text-xs text-[#8694ad]">Chưa có nhân viên đang hoạt động.</p>}
              {staff.map((s) => (
                <Select.Item
                  key={s.id}
                  value={s.id}
                  className="flex w-full cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 py-2 text-left outline-none data-[highlighted]:bg-[#f1f6fd]"
                >
                  <Avatar name={s.name} />
                  <span className="min-w-0 flex-1">
                    <Select.ItemText className="block truncate text-[13px] font-semibold text-[#0f1729]">{s.name}</Select.ItemText>
                    <span className="block truncate text-[11px] text-[#8694ad]">
                      {s.employeeCode}
                      {s.regions.length > 0 && ` · ${s.regions.join(', ')}`}
                      {` · ${s.openAssignments} đơn đang phụ trách`}
                    </span>
                  </span>
                  <Select.ItemIndicator>
                    <Check className="h-4 w-4 text-[#2a7bd9]" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
              {current && (
                <>
                  <div className="my-1 border-t border-[#f1f5fa]" />
                  <Select.Item
                    value={NONE}
                    className="flex w-full cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-red-600 outline-none data-[highlighted]:bg-red-50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                      <UserMinus className="h-3.5 w-3.5" />
                    </span>
                    <Select.ItemText>Bỏ gán nhân viên</Select.ItemText>
                  </Select.Item>
                </>
              )}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
