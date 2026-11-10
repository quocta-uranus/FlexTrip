'use client';

import { Sparkles } from 'lucide-react';
import { ListingCard } from '@/components/listing-card';
import type { RecommendedListing } from '@/lib/api/recommendations';

interface Props {
  title: string;
  subtitle?: string;
  items?: RecommendedListing[];
  isLoading: boolean;
}

export function RecommendationRow({ title, subtitle, items, isLoading }: Props) {
  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-500" />
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {subtitle && <span className="hidden text-xs text-slate-500 sm:inline">{subtitle}</span>}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-200" />
            ))
          : items?.map((item) => (
              <div key={item.id} className="flex flex-col gap-2">
                <div className="flex-1">
                  <ListingCard listing={item} />
                </div>
                <p className="flex min-h-8 items-start gap-1.5 px-1 text-xs text-violet-700">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>{item.aiReason}</span>
                </p>
              </div>
            ))}
      </div>
    </section>
  );
}
