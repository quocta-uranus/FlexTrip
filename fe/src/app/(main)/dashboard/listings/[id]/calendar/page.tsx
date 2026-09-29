'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useListing } from '@/hooks/useListings';
import {
  useAvailability, useBlockDates, useUnblockDates, useRentalConfig, useUpdateRentalConfig,
} from '@/hooks/useAvailability';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  // 0=Sun … 6=Sat; convert to Mon-first grid (0=Mon … 6=Sun)
  const raw = new Date(year, month, 1).getDay();
  return (raw + 6) % 7;
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const from = toISO(new Date(year, month, 1));
  const to = toISO(new Date(year, month, daysInMonth(year, month)));
  return { from, to };
}

// ─── Rental config form types ─────────────────────────────────────────────────

type ConfigForm = {
  minRentalDays: number;
  maxRentalDays: string;
  depositRate: number;
};

// ─── Day cell colors ──────────────────────────────────────────────────────────

type DayState = 'available' | 'blocked' | 'booked' | 'selected' | 'today' | 'past';

function getDayState(
  dateStr: string,
  blockedSet: Set<string>,
  bookedSet: Set<string>,
  selectedSet: Set<string>,
  todayStr: string,
): DayState {
  if (dateStr < todayStr) return 'past';
  if (selectedSet.has(dateStr)) return 'selected';
  if (blockedSet.has(dateStr)) return 'blocked';
  if (bookedSet.has(dateStr)) return 'booked';
  if (dateStr === todayStr) return 'today';
  return 'available';
}

const DAY_STYLES: Record<DayState, string> = {
  available: 'bg-white hover:bg-[#e8f4fd] cursor-pointer border border-[#e2eaf4]',
  blocked: 'bg-red-100 border border-red-300 cursor-pointer text-red-700',
  booked: 'bg-amber-50 border border-amber-300 cursor-default text-amber-700',
  selected: 'bg-[#2a7bd9] text-white border border-[#2a7bd9] cursor-pointer',
  today: 'bg-[#e8f4fd] border-2 border-[#2a7bd9] cursor-pointer font-bold',
  past: 'bg-[#f8f9fb] text-[#c0cad8] cursor-default border border-[#f0f2f5]',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ListingCalendarPage() {
  const { id: listingId } = useParams<{ id: string }>();
  const today = toISO(new Date());

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [blockNote, setBlockNote] = useState('');
  const [configSaved, setConfigSaved] = useState(false);

  const { from, to } = monthRange(year, month);

  const { data: listing } = useListing(listingId);
  const { data: avail, isLoading } = useAvailability(listingId, from, to);
  const { data: config } = useRentalConfig(listingId);

  const blockMut = useBlockDates(listingId);
  const unblockMut = useUnblockDates(listingId);
  const configMut = useUpdateRentalConfig(listingId);

  const blockedSet = useMemo(
    () => new Set(avail?.manuallyBlocked.map((b) => b.date) ?? []),
    [avail],
  );
  const bookedSet = useMemo(
    () => new Set(avail?.fullyBooked ?? []),
    [avail],
  );

  // Calendar grid: weeks × 7 slots
  const grid = useMemo(() => {
    const cells: Array<number | null> = [];
    const firstDay = firstDayOfMonth(year, month);
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth(year, month); d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  function toggleDay(dateStr: string) {
    if (dateStr < today || bookedSet.has(dateStr)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  }

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
    setSelected(new Set());
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
    setSelected(new Set());
  }

  async function handleBlock() {
    if (!selected.size) return;
    await blockMut.mutateAsync({ dates: [...selected], note: blockNote || undefined });
    setSelected(new Set());
    setBlockNote('');
  }

  async function handleUnblock() {
    if (!selected.size) return;
    await unblockMut.mutateAsync([...selected]);
    setSelected(new Set());
  }

  const selectedBlocked = [...selected].filter((d) => blockedSet.has(d));
  const selectedAvailable = [...selected].filter((d) => !blockedSet.has(d));

  // ─── Rental config form ──────────────────────────────────────────────────

  const { register, handleSubmit, formState: { errors } } = useForm<ConfigForm>({
    values: config
      ? {
          minRentalDays: config.minRentalDays,
          maxRentalDays: config.maxRentalDays != null ? String(config.maxRentalDays) : '',
          depositRate: parseFloat(config.depositRate),
        }
      : undefined,
  });

  async function onConfigSubmit(data: ConfigForm) {
    const maxRentalDays = data.maxRentalDays ? parseInt(data.maxRentalDays, 10) : null;
    await configMut.mutateAsync({ minRentalDays: data.minRentalDays, maxRentalDays, depositRate: data.depositRate });
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  }

  const MONTHS_VI = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ];

  const isBusy = blockMut.isPending || unblockMut.isPending;

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href={`/dashboard/listings/${listingId}/edit`}
            className="flex h-9 w-9 items-center justify-center rounded-full border text-sm"
            style={{ borderColor: '#DCEFFB', color: '#5a6b85' }}
          >
            ←
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#0f1729' }}>
              Quản lý lịch trống
            </h1>
            {listing && (
              <p className="text-sm" style={{ color: '#8694ad' }}>{listing.title}</p>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* ── Calendar ── */}
          <div className="rounded-2xl border bg-white p-6" style={{ borderColor: '#DCEFFB' }}>
            {/* Month nav */}
            <div className="mb-5 flex items-center justify-between">
              <button
                onClick={prevMonth}
                className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:bg-[#f6fbfe]"
                style={{ borderColor: '#DCEFFB' }}
              >
                ‹
              </button>
              <h2 className="text-base font-semibold" style={{ color: '#0f1729' }}>
                {MONTHS_VI[month]} {year}
              </h2>
              <button
                onClick={nextMonth}
                className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:bg-[#f6fbfe]"
                style={{ borderColor: '#DCEFFB' }}
              >
                ›
              </button>
            </div>

            {/* Day-of-week header */}
            <div className="mb-2 grid grid-cols-7 gap-1 text-center">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                <div key={d} className="text-[11px] font-semibold uppercase" style={{ color: '#8694ad' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-[#f1f5fa]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {grid.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const state = getDayState(dateStr, blockedSet, bookedSet, selected, today);
                  return (
                    <button
                      key={dateStr}
                      onClick={() => toggleDay(dateStr)}
                      disabled={state === 'past' || state === 'booked'}
                      className={`h-10 rounded-lg text-sm transition-all ${DAY_STYLES[state]}`}
                      title={
                        state === 'blocked' ? 'Đã chặn'
                        : state === 'booked' ? 'Đã có đặt hàng'
                        : undefined
                      }
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="mt-5 flex flex-wrap gap-4 text-xs" style={{ color: '#5a6b85' }}>
              {[
                { color: 'bg-white border border-[#e2eaf4]', label: 'Còn trống' },
                { color: 'bg-red-100 border border-red-300', label: 'Đã chặn' },
                { color: 'bg-amber-50 border border-amber-300', label: 'Đã đặt hết' },
                { color: 'bg-[#2a7bd9]', label: 'Đang chọn' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`h-3 w-3 rounded ${color}`} />
                  {label}
                </div>
              ))}
            </div>

            {/* Selection actions */}
            {selected.size > 0 && (
              <div
                className="mt-5 rounded-xl border p-4"
                style={{ borderColor: '#DCEFFB', background: '#f6fbfe' }}
              >
                <p className="mb-3 text-sm font-medium" style={{ color: '#0f1729' }}>
                  Đã chọn {selected.size} ngày
                  {selectedBlocked.length > 0 && ` (${selectedBlocked.length} đang chặn)`}
                </p>

                {selectedAvailable.length > 0 && (
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Ghi chú lý do chặn (tuỳ chọn)"
                      value={blockNote}
                      onChange={(e) => setBlockNote(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                      style={{ borderColor: '#d0dce8' }}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  {selectedAvailable.length > 0 && (
                    <button
                      onClick={handleBlock}
                      disabled={isBusy}
                      className="flex-1 rounded-lg py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#e84040' }}
                    >
                      {isBusy ? '...' : `Chặn ${selectedAvailable.length} ngày`}
                    </button>
                  )}
                  {selectedBlocked.length > 0 && (
                    <button
                      onClick={handleUnblock}
                      disabled={isBusy}
                      className="flex-1 rounded-lg py-2 text-sm font-semibold transition disabled:opacity-50"
                      style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
                    >
                      {isBusy ? '...' : `Mở lại ${selectedBlocked.length} ngày`}
                    </button>
                  )}
                  <button
                    onClick={() => setSelected(new Set())}
                    className="rounded-lg px-3 py-2 text-sm"
                    style={{ color: '#8694ad' }}
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Rental config ── */}
          <div className="space-y-4">
            <div className="rounded-2xl border bg-white p-5" style={{ borderColor: '#DCEFFB' }}>
              <h3 className="mb-4 font-semibold" style={{ color: '#0f1729' }}>Cấu hình thuê</h3>

              <form onSubmit={handleSubmit(onConfigSubmit)} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: '#5a6b85' }}>
                    Số ngày thuê tối thiểu
                  </label>
                  <input
                    type="number"
                    min={1}
                    {...register('minRentalDays', { valueAsNumber: true, min: { value: 1, message: 'Tối thiểu 1 ngày' } })}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                    style={{ borderColor: errors.minRentalDays ? '#ef4444' : '#d0dce8' }}
                  />
                  {errors.minRentalDays && (
                    <p className="mt-1 text-xs text-red-500">{errors.minRentalDays.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: '#5a6b85' }}>
                    Số ngày thuê tối đa{' '}
                    <span style={{ color: '#8694ad' }}>(bỏ trống = không giới hạn)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Không giới hạn"
                    {...register('maxRentalDays')}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                    style={{ borderColor: errors.maxRentalDays ? '#ef4444' : '#d0dce8' }}
                  />
                  {errors.maxRentalDays && (
                    <p className="mt-1 text-xs text-red-500">{String(errors.maxRentalDays.message)}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: '#5a6b85' }}>
                    Tỷ lệ đặt cọc (0–1)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      {...register('depositRate', { valueAsNumber: true, min: { value: 0, message: 'Tối thiểu 0' }, max: { value: 1, message: 'Tối đa 1 (100%)' } })}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2a7bd9]/30"
                      style={{ borderColor: errors.depositRate ? '#ef4444' : '#d0dce8' }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#8694ad' }}>
                      {config ? `${(parseFloat(config.depositRate) * 100).toFixed(0)}%` : ''}
                    </span>
                  </div>
                  {errors.depositRate && (
                    <p className="mt-1 text-xs text-red-500">{errors.depositRate.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={configMut.isPending}
                  className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: configSaved ? '#15803d' : '#2a7bd9' }}
                >
                  {configMut.isPending ? 'Đang lưu...' : configSaved ? '✓ Đã lưu' : 'Lưu cấu hình'}
                </button>
              </form>
            </div>

            {/* Info card */}
            <div
              className="rounded-2xl border p-4 text-sm"
              style={{ borderColor: '#DCEFFB', background: '#f6fbfe' }}
            >
              <p className="mb-2 font-medium" style={{ color: '#0f1729' }}>Hướng dẫn</p>
              <ul className="space-y-1.5 text-xs" style={{ color: '#5a6b85' }}>
                <li>• Click vào ngày để chọn/bỏ chọn</li>
                <li>• Chọn nhiều ngày rồi nhấn <strong>Chặn</strong> hoặc <strong>Mở lại</strong></li>
                <li>• Ngày <span className="font-semibold text-amber-600">vàng</span> = đã có đặt, không thể thay đổi</li>
                <li>• Ngày <span className="font-semibold text-red-600">đỏ</span> = bạn đã chặn</li>
              </ul>
            </div>

            {/* Quantity info */}
            {config && (
              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: '#DCEFFB' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#5a6b85' }}>Số lượng thiết bị</p>
                <p className="text-2xl font-bold" style={{ color: '#0f1729' }}>{config.quantity}</p>
                <p className="text-xs mt-1" style={{ color: '#8694ad' }}>
                  Đổi số lượng trong trang chỉnh sửa listing
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
