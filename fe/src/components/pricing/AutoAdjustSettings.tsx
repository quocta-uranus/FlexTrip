'use client';

import { useState, useEffect } from 'react';
import { usePriceConfig, useUpdatePriceConfig } from '@/hooks/pricing/use-price-config';
import { Skeleton } from '@/components/ui/skeleton';

const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN');

type Props = { listingId: string };

export function AutoAdjustSettings({ listingId }: Props) {
  const { data: config, isLoading } = usePriceConfig(listingId);
  const { mutate, isPending } = useUpdatePriceConfig(listingId);

  const [autoAdjust, setAutoAdjust] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [saved, setSaved] = useState(false);

  // Sync form from loaded config
  useEffect(() => {
    if (!config) return;
    setAutoAdjust(config.autoAdjust);
    setMinPrice(config.minPrice ? String(config.minPrice) : '');
    setMaxPrice(config.maxPrice ? String(config.maxPrice) : '');
  }, [config]);

  const handleSave = () => {
    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;
    mutate(
      { autoAdjust, minPrice: min, maxPrice: max },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
      },
    );
  };

  if (isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />;

  return (
    <div className="rounded-2xl border border-[#e2e8f3] bg-white p-5">
      {/* Header */}
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#2a7bd9]/10">
          <svg className="h-4 w-4 text-[#2a7bd9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h3 className="font-bold" style={{ color: '#0f1729' }}>Tự động điều chỉnh giá (PRICE-08)</h3>
          <p className="mt-0.5 text-xs" style={{ color: '#8694ad' }}>
            AI tự cập nhật giá lúc 2:00 SA mỗi ngày theo dữ liệu thị trường
          </p>
        </div>
      </div>

      {/* Toggle */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-[#e2e8f3] bg-[#f8fafc] px-4 py-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: '#0f1729' }}>Bật tự động điều chỉnh</p>
          <p className="mt-0.5 text-xs" style={{ color: '#8694ad' }}>
            Khi bật, AI sẽ cập nhật giá trong khung giới hạn bạn đặt
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAutoAdjust((v) => !v)}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200"
          style={{ background: autoAdjust ? '#2a7bd9' : '#d1d5db' }}
          aria-label="Toggle auto-adjust"
        >
          <span
            className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
            style={{ transform: autoAdjust ? 'translateX(20px)' : 'translateX(2px)', marginTop: '2px' }}
          />
        </button>
      </div>

      {/* Guardrails — shown when autoAdjust on */}
      {autoAdjust && (
        <div className="mb-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#5a6b85' }}>
            Giới hạn giá (Guardrails)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: '#5a6b85' }}>
                Giá tối thiểu (₫/ngày)
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Không giới hạn"
                className="w-full rounded-xl border border-[#e2e8f3] bg-white px-3 py-2 text-sm outline-none focus:border-[#2a7bd9]"
                style={{ color: '#0f1729' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: '#5a6b85' }}>
                Giá tối đa (₫/ngày)
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Không giới hạn"
                className="w-full rounded-xl border border-[#e2e8f3] bg-white px-3 py-2 text-sm outline-none focus:border-[#2a7bd9]"
                style={{ color: '#0f1729' }}
              />
            </div>
          </div>
          {/* Show range preview if both set */}
          {minPrice && maxPrice && Number(minPrice) < Number(maxPrice) && (
            <div className="flex items-center gap-2 rounded-xl bg-[#eff6ff] px-3 py-2">
              <svg className="h-3.5 w-3.5 shrink-0 text-[#2a7bd9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs" style={{ color: '#1d4ed8' }}>
                AI sẽ điều chỉnh trong khung: <strong>{fmt(Number(minPrice))}₫</strong> — <strong>{fmt(Number(maxPrice))}₫</strong>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Info box when off */}
      {!autoAdjust && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-[#f8fafc] px-3 py-2.5">
          <svg className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#8694ad' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <p className="text-xs leading-relaxed" style={{ color: '#8694ad' }}>
            Khi tắt, AI chỉ <em>gợi ý</em> — bạn tự quyết định có áp dụng không. Bật để hệ thống cập nhật tự động mỗi đêm.
          </p>
        </div>
      )}

      {/* Notification info */}
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#f59e0b]/20 bg-[#fffbeb] px-3 py-2.5">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#ca8a04]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>
          Nếu AI đề xuất giá ngoài khung giới hạn, bạn sẽ nhận thông báo để tự xem xét.
        </p>
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: saved ? '#16a34a' : '#2a7bd9' }}
      >
        {isPending ? 'Đang lưu...' : saved ? '✓ Đã lưu' : 'Lưu cài đặt'}
      </button>

      {/* Last updated */}
      {config?.updatedAt && (
        <p className="mt-2 text-center text-[10px]" style={{ color: '#8694ad' }}>
          Cập nhật lần cuối: {new Date(config.updatedAt).toLocaleString('vi-VN')}
        </p>
      )}
    </div>
  );
}
