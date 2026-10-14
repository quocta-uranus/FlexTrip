'use client';

import { useState } from 'react';
import { useDemandCalendar } from '@/hooks/pricing/use-demand-calendar';
import { Skeleton } from '@/components/ui/skeleton';
import type { CalendarDayScore } from '@/types/pricing';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function scoreToColor(score: number, isProjected: boolean): string {
  const opacity = isProjected ? '80' : 'ff';
  if (score >= 75) return `#16a34a${opacity}`;
  if (score >= 55) return `#22c55e${opacity}`;
  if (score >= 40) return `#ca8a04${opacity}`;
  if (score >= 25) return `#f97316${opacity}`;
  return `#dc2626${opacity}`;
}

function DayCell({ day, isCurrentMonth }: { day: CalendarDayScore | null; isCurrentMonth: boolean }) {
  const [hovered, setHovered] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  if (!day || !isCurrentMonth) {
    return <div className="aspect-square rounded-xl bg-transparent" />;
  }

  const isToday = day.date === today;
  const bg = scoreToColor(day.score, day.isProjected);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative aspect-square cursor-default rounded-xl transition-transform hover:scale-105"
      style={{
        background: bg,
        outline: isToday ? '2px solid #2a7bd9' : undefined,
        outlineOffset: '1px',
      }}
    >
      <div className="flex h-full flex-col items-center justify-center gap-0.5">
        <span className="text-[11px] font-bold text-white drop-shadow-sm">
          {new Date(day.date).getDate()}
        </span>
        <span className="text-[9px] font-semibold text-white/80">
          {day.score}
        </span>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-[#e2e8f3] bg-white px-2.5 py-1.5 shadow-lg"
        >
          <p className="text-xs font-bold" style={{ color: '#0f1729' }}>
            {new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
          <p className="text-[11px]" style={{ color: scoreToColor(day.score, false) }}>
            Nhu cầu: {day.score}/100
          </p>
          {day.bookingCount > 0 && (
            <p className="text-[10px]" style={{ color: '#8694ad' }}>{day.bookingCount} booking</p>
          )}
          {day.isProjected && (
            <p className="text-[10px]" style={{ color: '#8694ad' }}>📊 Dự báo</p>
          )}
        </div>
      )}
    </div>
  );
}

type Props = { listingId: string };

export function DemandCalendar({ listingId }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-based

  const { data, isLoading } = useDemandCalendar(listingId, year, month);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();

  const dayMap = new Map<string, CalendarDayScore>();
  data?.days.forEach((d) => dayMap.set(d.date, d));

  const cells: Array<{ day: CalendarDayScore | null; isCurrentMonth: boolean }> = [];
  // Leading empty cells
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, isCurrentMonth: false });
  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: dayMap.get(key) ?? { date: key, score: 0, bookingCount: 0, isProjected: true }, isCurrentMonth: true });
  }
  // Trailing to fill last row
  while (cells.length % 7 !== 0) cells.push({ day: null, isCurrentMonth: false });

  const monthName = new Date(year, month - 1).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  return (
    <div className="rounded-2xl border border-[#e2e8f3] bg-white p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold capitalize" style={{ color: '#0f1729' }}>
            Lịch nhu cầu — {monthName}
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: '#8694ad' }}>
            Màu sắc thể hiện cường độ nhu cầu theo ngày
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#e2e8f3] bg-white transition-colors hover:bg-[#f8fafc]"
          >
            <svg className="h-4 w-4" style={{ color: '#5a6b85' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#e2e8f3] bg-white transition-colors hover:bg-[#f8fafc]"
          >
            <svg className="h-4 w-4" style={{ color: '#5a6b85' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[10px] font-bold" style={{ color: '#8694ad' }}>
            {w}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => (
            <DayCell key={i} day={cell.day} isCurrentMonth={cell.isCurrentMonth} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {[
          { label: 'Rất cao (75+)', color: '#16a34a' },
          { label: 'Cao (55–74)', color: '#22c55e' },
          { label: 'TB (40–54)', color: '#ca8a04' },
          { label: 'Thấp (25–39)', color: '#f97316' },
          { label: 'Rất thấp (<25)', color: '#dc2626' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded" style={{ background: l.color }} />
            <span className="text-[10px]" style={{ color: '#8694ad' }}>{l.label}</span>
          </div>
        ))}
        <span className="text-[10px] opacity-60" style={{ color: '#8694ad' }}>· Mờ = dự báo</span>
      </div>
    </div>
  );
}
