'use client';

import { use } from 'react';
import Link from 'next/link';
import { PriceVolumeChart } from '@/components/pricing/PriceVolumeChart';
import { DemandCalendar } from '@/components/pricing/DemandCalendar';
import { useListing } from '@/hooks/useListings';

export default function OptimizationPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = use(params);
  const { data: listing } = useListing(listingId);

  return (
    <div className="min-h-screen" style={{ background: '#f6fbfe' }}>
      <div className="mx-auto max-w-4xl px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/pricing"
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: '#2a7bd9' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại AI Định giá
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7c3aed]/10">
              <svg className="h-4 w-4" style={{ color: '#7c3aed' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#7c3aed' }}>PRICE-05 · PRICE-07</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold" style={{ color: '#0f1729' }}>
            Tối ưu hoá doanh thu
          </h1>
          {listing && (
            <p className="mt-1 text-sm" style={{ color: '#5a6b85' }}>{listing.title}</p>
          )}
        </div>

        <div className="space-y-5">
          {/* Price vs Volume optimization */}
          <PriceVolumeChart listingId={listingId} />

          {/* Seasonal calendar */}
          <DemandCalendar listingId={listingId} />
        </div>
      </div>
    </div>
  );
}
