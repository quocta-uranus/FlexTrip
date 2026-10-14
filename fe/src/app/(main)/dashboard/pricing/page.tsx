'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMyListings } from '@/hooks/useListings';
import { DemandForecastChart } from '@/components/pricing/DemandForecastChart';
import { AdjustmentAlertBanner } from '@/components/pricing/AdjustmentAlertBanner';
import { BenchmarkVisualization } from '@/components/pricing/BenchmarkVisualization';
import { PriceVolumeChart } from '@/components/pricing/PriceVolumeChart';
import { DemandCalendar } from '@/components/pricing/DemandCalendar';
import { AutoAdjustSettings } from '@/components/pricing/AutoAdjustSettings';
import { Skeleton } from '@/components/ui/skeleton';

function NavPill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl px-4 py-2 text-sm font-semibold transition-all"
      style={
        active
          ? { background: '#2a7bd9', color: 'white' }
          : { background: 'white', color: '#5a6b85', border: '1px solid #e2e8f3' }
      }
    >
      {label}
    </button>
  );
}

const TABS = ['Tổng quan', 'Dự báo nhu cầu', 'So sánh thị trường', 'Tối ưu hoá', 'Tự động hoá'] as const;
type Tab = typeof TABS[number];

export default function PricingDashboardPage() {
  const [tab, setTab] = useState<Tab>('Tổng quan');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  const { data: listingsData, isLoading } = useMyListings({ limit: 50 });
  const listings = Array.isArray(listingsData) ? listingsData : [];
  const activeListing = listings.find((l) => l.id === selectedListingId) ?? listings[0];

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-5xl px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2a7bd9]/10">
              <svg className="h-4 w-4 text-[#2a7bd9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-wide text-[#2a7bd9]">AI Định giá</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f1729' }}>Định giá động & Dự báo nhu cầu</h1>
          <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>
            Tối ưu hoá doanh thu với gợi ý AI theo thị trường thực tế
          </p>
        </div>

        {/* Tab nav */}
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <NavPill key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
          ))}
        </div>

        {/* Tab: Tổng quan */}
        {tab === 'Tổng quan' && (
          <div className="space-y-4">
            {/* Listing selector */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#e2e8f3] bg-white px-5 py-4">
              <span className="text-sm font-semibold" style={{ color: '#5a6b85' }}>Listing:</span>
              {isLoading ? (
                <Skeleton className="h-8 w-48" />
              ) : (
                <select
                  value={selectedListingId ?? activeListing?.id ?? ''}
                  onChange={(e) => setSelectedListingId(e.target.value)}
                  className="rounded-xl border border-[#e2e8f3] bg-[#f8fafc] px-3 py-1.5 text-sm outline-none focus:border-[#2a7bd9]"
                >
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              )}
              {activeListing && (
                <Link
                  href={`/dashboard/pricing/history/${activeListing.id}`}
                  className="ml-auto text-xs font-semibold"
                  style={{ color: '#2a7bd9' }}
                >
                  Lịch sử giá →
                </Link>
              )}
            </div>

            {/* Adjustment alerts */}
            {isLoading ? (
              <Skeleton className="h-24 w-full rounded-2xl" />
            ) : listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#e2e8f3] bg-white py-12">
                <p className="font-medium" style={{ color: '#5a6b85' }}>Bạn chưa có listing nào</p>
                <Link
                  href="/dashboard/listings/new"
                  className="mt-3 rounded-full bg-[#2a7bd9] px-4 py-2 text-sm font-semibold text-white"
                >
                  Tạo listing mới
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold" style={{ color: '#0f1729' }}>
                  Đề xuất điều chỉnh giá (PRICE-02)
                </h2>
                {listings.slice(0, 5).map((l) => (
                  <AdjustmentAlertBanner
                    key={l.id}
                    listingId={l.id}
                    listingTitle={l.title}
                  />
                ))}
              </div>
            )}

            {/* Benchmark for selected listing */}
            {activeListing && (
              <div className="mt-2">
                <h2 className="mb-3 text-sm font-semibold" style={{ color: '#0f1729' }}>
                  So sánh thị trường — {activeListing.title}
                </h2>
                <BenchmarkVisualization listingId={activeListing.id} />
              </div>
            )}
          </div>
        )}

        {/* Tab: Dự báo nhu cầu */}
        {tab === 'Dự báo nhu cầu' && (
          <div className="space-y-4">
            <DemandForecastChart
              defaultRegion={activeListing?.location?.split(',').pop()?.trim() ?? 'Đà Nẵng'}
              defaultCategory={activeListing?.category ?? 'VEHICLE'}
            />
            <div className="rounded-2xl border border-[#e2e8f3] bg-white p-5">
              <h3 className="mb-3 font-semibold" style={{ color: '#0f1729' }}>
                Cách đọc biểu đồ
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { score: '70–100', label: 'Cao điểm', desc: 'Nhu cầu cao, nên tăng giá 5–15%', color: '#16a34a' },
                  { score: '40–69', label: 'Trung bình', desc: 'Giữ nguyên hoặc điều chỉnh nhẹ', color: '#2a7bd9' },
                  { score: '0–39', label: 'Thấp điểm', desc: 'Cân nhắc giảm giá để kéo booking', color: '#dc2626' },
                ].map((item) => (
                  <div key={item.score} className="rounded-xl bg-[#f8fafc] p-3">
                    <div className="text-xs font-bold" style={{ color: item.color }}>{item.score} — {item.label}</div>
                    <div className="mt-1 text-xs" style={{ color: '#5a6b85' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Tối ưu hoá */}
        {tab === 'Tối ưu hoá' && (
          <div className="space-y-5">
            {isLoading ? (
              <Skeleton className="h-72 w-full rounded-2xl" />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#e2e8f3] bg-white px-5 py-4">
                  <span className="text-sm font-semibold" style={{ color: '#5a6b85' }}>Chọn listing:</span>
                  <select
                    value={selectedListingId ?? activeListing?.id ?? ''}
                    onChange={(e) => setSelectedListingId(e.target.value)}
                    className="rounded-xl border border-[#e2e8f3] bg-[#f8fafc] px-3 py-1.5 text-sm outline-none focus:border-[#2a7bd9]"
                  >
                    {listings.map((l) => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </select>
                  {activeListing && (
                    <Link
                      href={`/dashboard/pricing/optimization/${activeListing.id}`}
                      className="ml-auto text-xs font-semibold"
                      style={{ color: '#7c3aed' }}
                    >
                      Xem trang đầy đủ →
                    </Link>
                  )}
                </div>
                {activeListing && (
                  <>
                    <PriceVolumeChart listingId={activeListing.id} />
                    <DemandCalendar listingId={activeListing.id} />
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab: Tự động hoá */}
        {tab === 'Tự động hoá' && (
          <div className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-48 w-full rounded-2xl" />
            ) : listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#e2e8f3] bg-white py-12">
                <p className="font-medium" style={{ color: '#5a6b85' }}>Bạn chưa có listing nào</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#e2e8f3] bg-white px-5 py-4">
                  <span className="text-sm font-semibold" style={{ color: '#5a6b85' }}>Chọn listing:</span>
                  <select
                    value={selectedListingId ?? activeListing?.id ?? ''}
                    onChange={(e) => setSelectedListingId(e.target.value)}
                    className="rounded-xl border border-[#e2e8f3] bg-[#f8fafc] px-3 py-1.5 text-sm outline-none focus:border-[#2a7bd9]"
                  >
                    {listings.map((l) => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </select>
                </div>
                {activeListing && <AutoAdjustSettings listingId={activeListing.id} />}
              </>
            )}
          </div>
        )}

        {/* Tab: So sánh thị trường */}
        {tab === 'So sánh thị trường' && (
          <div className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : (
              <>
                {/* Listing picker */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#e2e8f3] bg-white px-5 py-4">
                  <span className="text-sm font-semibold" style={{ color: '#5a6b85' }}>Chọn listing:</span>
                  <select
                    value={selectedListingId ?? activeListing?.id ?? ''}
                    onChange={(e) => setSelectedListingId(e.target.value)}
                    className="rounded-xl border border-[#e2e8f3] bg-[#f8fafc] px-3 py-1.5 text-sm outline-none focus:border-[#2a7bd9]"
                  >
                    {listings.map((l) => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </select>
                </div>
                {activeListing && <BenchmarkVisualization listingId={activeListing.id} />}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
